import { runSaga, type SagaStep } from "./saga.js";
import { prisma } from "./db.js";
import * as imClient from "./im-client.js";
import * as openclawClient from "./openclaw-client.js";

export interface CreateAgentInput {
  ownerId: string;
  name: string;
  avatar?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  systemPrompt?: string;
  parentId?: string;
}

// Mutable context shared across saga steps
export interface CreateAgentContext {
  input: CreateAgentInput;
  imAccountId?: string;
  agentId?: string;
  containerId?: string;
  gatewayToken?: string;
}

const steps: SagaStep<CreateAgentContext>[] = [
  {
    name: "register-im-account",
    execute: async (ctx) => {
      const account = await imClient.registerAgentAccount({
        name: ctx.input.name,
        avatar: ctx.input.avatar,
      });
      ctx.imAccountId = account.id;
    },
    compensate: async (ctx) => {
      if (ctx.imAccountId) {
        await imClient.deleteAgentAccount(ctx.imAccountId);
      }
    },
  },
  {
    name: "create-agent-record",
    execute: async (ctx) => {
      const agent = await prisma.agent.create({
        data: {
          accountId: ctx.imAccountId!,
          ownerId: ctx.input.ownerId,
          parentId: ctx.input.parentId,
          name: ctx.input.name,
          avatar: ctx.input.avatar,
          config: {
            create: {
              model: ctx.input.model || "qwen-max",
              apiKey: ctx.input.apiKey,
              baseUrl: ctx.input.baseUrl,
              systemPrompt: ctx.input.systemPrompt,
              gatewayToken: `agent-${ctx.imAccountId}`,
            },
          },
        },
        include: { config: true },
      });
      ctx.agentId = agent.id;
      ctx.gatewayToken = agent.config?.gatewayToken ?? undefined;
    },
    compensate: async (ctx) => {
      if (ctx.agentId) {
        await prisma.agent.delete({ where: { id: ctx.agentId } });
      }
    },
  },
  {
    name: "add-friendship",
    execute: async (ctx) => {
      await imClient.addDirectFriend(ctx.input.ownerId, ctx.imAccountId!);
    },
    compensate: async (ctx) => {
      // Friendship deletion is best-effort — im-server may not support it yet
      // In the future, add imClient.removeFriend()
    },
  },
  {
    name: "start-container",
    execute: async (ctx) => {
      if (!ctx.input.apiKey) return; // skip if no API key

      const result = await openclawClient.createInstance({
        agentId: ctx.agentId!,
        accountId: ctx.imAccountId!,
        model: ctx.input.model || "qwen-max",
        apiKey: ctx.input.apiKey,
        baseUrl: ctx.input.baseUrl ?? undefined,
        systemPrompt: ctx.input.systemPrompt ?? undefined,
        gatewayToken: ctx.gatewayToken ?? undefined,
      });
      ctx.containerId = result.containerId;

      await prisma.agentConfig.update({
        where: { agentId: ctx.agentId! },
        data: {
          status: "running",
          containerId: result.containerId,
          startedAt: new Date(),
        },
      });
    },
    compensate: async (ctx) => {
      if (ctx.agentId) {
        try {
          await openclawClient.removeInstance(ctx.agentId);
        } catch {
          // Container might not have been created
        }
        await prisma.agentConfig.update({
          where: { agentId: ctx.agentId },
          data: { status: "error", containerId: null },
        }).catch(() => {});
      }
    },
  },
];

export async function createAgentSaga(input: CreateAgentInput) {
  const context: CreateAgentContext = { input };
  const result = await runSaga(steps, context);

  if (!result.success) {
    return {
      success: false as const,
      error: result.error!.message,
      failedStep: result.failedStep,
      compensationErrors: result.compensationErrors.map((e) => ({
        step: e.step,
        error: e.error.message,
      })),
    };
  }

  // Fetch the final agent with config
  const agent = await prisma.agent.findUnique({
    where: { id: context.agentId! },
    include: { config: true },
  });

  return { success: true as const, agent };
}
