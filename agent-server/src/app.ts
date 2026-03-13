import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { prisma } from "./db.js";
import * as imClient from "./im-client.js";
import * as openclawClient from "./openclaw-client.js";

const app = new Hono().basePath("/v1/agents");

app.use("*", cors());
app.use("*", logger());

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Create Agent
app.post("/", async (c) => {
  const { ownerId, name, avatar, model, apiKey, systemPrompt, parentId } =
    await c.req.json();

  if (!ownerId || !name || !model) {
    return c.json({ error: "ownerId, name, and model are required" }, 400);
  }

  // 1. Register Agent account in im-server
  const imAccount = await imClient.registerAgentAccount({ name, avatar });

  // 2. Create Agent record in our DB
  const agent = await prisma.agent.create({
    data: {
      accountId: imAccount.id,
      ownerId,
      parentId,
      name,
      avatar,
      config: {
        create: {
          model,
          apiKey,
          systemPrompt,
          gatewayToken: `agent-${imAccount.id}`,
        },
      },
    },
    include: { config: true },
  });

  return c.json(agent, 201);
});

// List Agents (by owner)
app.get("/", async (c) => {
  const ownerId = c.req.query("ownerId");
  if (!ownerId) {
    return c.json({ error: "ownerId query param is required" }, 400);
  }

  const agents = await prisma.agent.findMany({
    where: { ownerId },
    include: {
      config: {
        select: {
          model: true,
          status: true,
          startedAt: true,
          stoppedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return c.json(agents);
});

// Get Agent detail
app.get("/:id", async (c) => {
  const id = c.req.param("id");

  const agent = await prisma.agent.findUnique({
    where: { id },
    include: { config: true },
  });

  if (!agent) {
    return c.json({ error: "Agent not found" }, 404);
  }

  return c.json(agent);
});

// Update Agent config
app.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const { name, avatar, model, apiKey, systemPrompt } = await c.req.json();

  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) {
    return c.json({ error: "Agent not found" }, 404);
  }

  const updated = await prisma.agent.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(avatar !== undefined && { avatar }),
      config: {
        update: {
          ...(model && { model }),
          ...(apiKey !== undefined && { apiKey }),
          ...(systemPrompt !== undefined && { systemPrompt }),
        },
      },
    },
    include: { config: true },
  });

  return c.json(updated);
});

// Delete Agent
app.delete("/:id", async (c) => {
  const id = c.req.param("id");

  const agent = await prisma.agent.findUnique({
    where: { id },
    include: { config: true },
  });
  if (!agent) {
    return c.json({ error: "Agent not found" }, 404);
  }

  // 1. Stop and remove OpenClaw instance
  try {
    await openclawClient.removeInstance(agent.id);
  } catch {
    // Instance might not exist
  }

  // 2. Delete from im-server
  try {
    await imClient.deleteAgentAccount(agent.accountId);
  } catch {
    // Account might not exist
  }

  // 3. Delete from our DB (cascades to config)
  await prisma.agent.delete({ where: { id } });

  return c.json({ ok: true });
});

// Start Agent (launch OpenClaw container)
app.post("/:id/start", async (c) => {
  const id = c.req.param("id");

  const agent = await prisma.agent.findUnique({
    where: { id },
    include: { config: true },
  });
  if (!agent || !agent.config) {
    return c.json({ error: "Agent not found" }, 404);
  }

  if (!agent.config.apiKey) {
    return c.json({ error: "API key is required to start Agent" }, 400);
  }

  try {
    // Update status to starting
    await prisma.agentConfig.update({
      where: { agentId: id },
      data: { status: "starting" },
    });

    // Create OpenClaw instance
    const result = await openclawClient.createInstance({
      agentId: agent.id,
      model: agent.config.model,
      apiKey: agent.config.apiKey,
      systemPrompt: agent.config.systemPrompt ?? undefined,
      gatewayToken: agent.config.gatewayToken ?? undefined,
    });

    // Update status to running
    await prisma.agentConfig.update({
      where: { agentId: id },
      data: {
        status: "running",
        containerId: result.containerId,
        startedAt: new Date(),
      },
    });

    return c.json({ ok: true, containerId: result.containerId });
  } catch (err: unknown) {
    // Update status to error
    await prisma.agentConfig.update({
      where: { agentId: id },
      data: { status: "error" },
    });

    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Stop Agent
app.post("/:id/stop", async (c) => {
  const id = c.req.param("id");

  const agent = await prisma.agent.findUnique({
    where: { id },
    include: { config: true },
  });
  if (!agent) {
    return c.json({ error: "Agent not found" }, 404);
  }

  try {
    await openclawClient.stopInstance(agent.id);

    await prisma.agentConfig.update({
      where: { agentId: id },
      data: { status: "stopped", stoppedAt: new Date() },
    });

    return c.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Chat with Agent (proxy to openclaw-server)
app.post("/:id/chat", async (c) => {
  const id = c.req.param("id");
  const { message, sessionKey } = await c.req.json();

  if (!message) {
    return c.json({ error: "message is required" }, 400);
  }

  const agent = await prisma.agent.findUnique({
    where: { id },
    include: { config: true },
  });
  if (!agent) {
    return c.json({ error: "Agent not found" }, 404);
  }
  if (agent.config?.status !== "running") {
    return c.json({ error: "Agent is not running" }, 400);
  }

  try {
    const reply = await openclawClient.chat(agent.id, message, sessionKey);
    return c.json({ reply });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

export default app;
