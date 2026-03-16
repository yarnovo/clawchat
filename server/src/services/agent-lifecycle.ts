/**
 * Agent 生命周期管理
 * start / stop / fork / delete — 编排 DB + Workspace + Container
 */

import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { agents } from '../db/schema.js';
import {
  createOrchestrator,
  createWorkspace,
  forkWorkspace,
  deleteWorkspace,
  workspaceExists,
  workspacePath,
} from '../orchestrator/index.js';
import type { AgentConfig } from '../orchestrator/index.js';

const orchestrator = createOrchestrator();

const DEFAULT_IMAGE = process.env.AGENTKIT_IMAGE || 'agentkit-base:latest';
const DEFAULT_NETWORK = process.env.CONTAINER_NETWORK || 'clawchat-net';
const HEALTH_TIMEOUT_MS = 60_000;

const PROFILES: Record<string, { memoryMB: number; cpus: number; pidsLimit: number }> = {
  default: { memoryMB: 512, cpus: 0.5, pidsLimit: 256 },
  large: { memoryMB: 1024, cpus: 1.0, pidsLimit: 512 },
};

// ── Start ──

export async function startAgent(agentId: string): Promise<{ channelUrl: string }> {
  const agent = await getAgent(agentId);

  // 更新状态 → starting
  await updateAgentStatus(agentId, 'starting');

  try {
    // 工作区: 不存在则创建
    if (!(await workspaceExists(agentId))) {
      const agentConfig: AgentConfig = {
        name: agent.name,
        description: agent.description || undefined,
        persona: extractConfigField(agent.config, 'persona'),
        systemPrompt: extractConfigField(agent.config, 'systemPrompt'),
      };
      await createWorkspace(agentId, agentConfig);
    }

    const containerName = `agentkit-${agentId}`;
    const wsPath = workspacePath(agentId);

    // 构建注入容器的环境变量
    const env: Record<string, string> = {
      AGENT_ID: agentId,
      AGENT_NAME: agent.name,
    };

    // 从 agent config 中提取 LLM 配置
    const config = (agent.config || {}) as Record<string, unknown>;
    if (config.llmApiKey) env.LLM_API_KEY = String(config.llmApiKey);
    if (config.llmBaseUrl) env.LLM_BASE_URL = String(config.llmBaseUrl);
    if (config.llmModel) env.LLM_MODEL = String(config.llmModel);

    // 启动容器（根据 resourceProfile 选择资源配置）
    const profile = PROFILES[agent.resourceProfile ?? 'default'] ?? PROFILES.default;

    const containerInfo = await orchestrator.run({
      name: containerName,
      image: agent.imageTag || DEFAULT_IMAGE,
      env,
      volumes: [{ host: wsPath, container: '/workspace' }],
      network: DEFAULT_NETWORK,
      resources: {
        memoryMB: profile.memoryMB,
        cpus: profile.cpus,
        pidsLimit: profile.pidsLimit,
      },
    });

    // 等待健康检查通过
    const healthy = await orchestrator.waitHealthy(containerName, HEALTH_TIMEOUT_MS);
    if (!healthy) {
      // 不健康但容器可能还在跑，不 stop，只标记 error
      await updateAgentStatus(agentId, 'error', 'Container health check timeout');
      return { channelUrl: containerInfo.channelUrl };
    }

    // 更新 DB: running + channelUrl + containerName
    await db
      .update(agents)
      .set({
        status: 'running',
        channelUrl: containerInfo.channelUrl,
        containerName,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agentId));

    return { channelUrl: containerInfo.channelUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateAgentStatus(agentId, 'error', message);
    throw err;
  }
}

// ── Stop ──

export async function stopAgent(agentId: string): Promise<void> {
  const agent = await getAgent(agentId);

  if (agent.containerName) {
    try {
      await orchestrator.stop(agent.containerName);
    } catch (err) {
      // 容器可能已经不存在，记录但不阻塞
      console.warn(`[lifecycle] stop container failed for ${agentId}:`, err);
    }
  }

  await db
    .update(agents)
    .set({
      status: 'stopped',
      channelUrl: null,
      containerName: null,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, agentId));
}

// ── Fork ──

export interface ForkAgentInput {
  userId: string;
  name: string;
  description?: string;
  keepMemory?: boolean;
}

export async function forkAgent(
  sourceId: string,
  input: ForkAgentInput,
): Promise<{ agentId: string; channelUrl: string }> {
  const sourceAgent = await getAgent(sourceId);

  // 在 DB 创建新 Agent 记录
  const [newAgent] = await db
    .insert(agents)
    .values({
      ownerId: input.userId,
      name: input.name,
      description: input.description || sourceAgent.description,
      imageTag: sourceAgent.imageTag,
      config: sourceAgent.config,
      status: 'created',
    })
    .returning({ id: agents.id });

  const newId = newAgent.id;

  // 复制工作区
  await forkWorkspace(sourceId, newId, { keepMemory: input.keepMemory });

  // 启动新 Agent
  const result = await startAgent(newId);

  return { agentId: newId, channelUrl: result.channelUrl };
}

// ── Delete ──

export async function deleteAgent(agentId: string): Promise<void> {
  const agent = await getAgent(agentId);

  // 如果在运行，先停止
  if (agent.status === 'running' || agent.status === 'starting') {
    await stopAgent(agentId);
  }

  // 软删除 DB 记录
  await db
    .update(agents)
    .set({
      status: 'deleted',
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(agents.id, agentId));

  // 工作区移到 trash
  await deleteWorkspace(agentId);
}

// ── Inspect ──

export async function inspectAgent(agentId: string): Promise<{
  dbStatus: string;
  container: { running: boolean; health: string } | null;
}> {
  const agent = await getAgent(agentId);

  let container = null;
  if (agent.containerName) {
    try {
      container = await orchestrator.inspect(agent.containerName);
    } catch {
      // 容器不存在
    }
  }

  return { dbStatus: agent.status, container };
}

// ── Helpers ──

async function getAgent(agentId: string) {
  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
  if (!agent) throw new Error(`Agent not found: ${agentId}`);
  return agent;
}

async function updateAgentStatus(
  agentId: string,
  status: 'created' | 'starting' | 'running' | 'stopped' | 'error' | 'deleted',
  errorMessage?: string,
) {
  const set: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };
  if (errorMessage) {
    // 将错误信息存到 config.lastError
    const [agent] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
    const config = (agent?.config || {}) as Record<string, unknown>;
    set.config = { ...config, lastError: errorMessage };
  }
  await db.update(agents).set(set).where(eq(agents.id, agentId));
}

function extractConfigField(config: unknown, field: string): string | undefined {
  if (config && typeof config === 'object' && field in config) {
    return String((config as Record<string, unknown>)[field]);
  }
  return undefined;
}
