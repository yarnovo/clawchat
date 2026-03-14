import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "./logger.js";
import { requestId } from "./middleware/request-id.js";
import { registry, httpRequestDuration, httpRequestsTotal } from "./metrics.js";
import { prisma } from "./db.js";
import { getRuntimeClient } from "./runtime-client.js";
import { createAgentSaga } from "./create-agent-saga.js";
import { authMiddleware } from "./auth.js";
import type { AppEnv } from "./env.js";

const app = new Hono<AppEnv>().basePath("/v1/agents");

app.use("*", cors());
app.use("*", requestId);
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const route = c.req.routePath || c.req.path;
  const status = String(c.res.status);
  httpRequestDuration.observe({ method: c.req.method, route, status }, ms / 1000);
  httpRequestsTotal.inc({ method: c.req.method, route, status });
  logger.info(
    { requestId: c.get("requestId"), method: c.req.method, path: c.req.path, status: c.res.status, ms },
    `${c.req.method} ${c.req.path} ${c.res.status}`,
  );
});

// Health check (no auth)
app.get("/health", async (c) => {
  const checks: Record<string, "ok" | "error"> = {};
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = "ok";
  } catch {
    checks.db = "error";
  }
  const status = checks.db === "ok" ? "ok" : "degraded";
  return c.json({ status, checks }, status === "ok" ? 200 : 503);
});

app.get("/metrics", async (c) => {
  const metrics = await registry.metrics();
  return c.text(metrics, 200, { "Content-Type": registry.contentType });
});

// Chat endpoint is called by im-server internally (no auth)
// Auth required for all other routes
app.use("*", async (c, next) => {
  if (c.req.path.endsWith("/chat") && c.req.method === "POST") {
    return next();
  }
  return authMiddleware(c, next);
});

// ---- Helper: verify ownership ----
async function getOwnedAgent(agentId: string, ownerId: string) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { config: true },
  });
  if (!agent) return { agent: null, error: "Agent not found" as const };
  if (agent.ownerId !== ownerId) return { agent: null, error: "Forbidden" as const };
  return { agent, error: null };
}

// Create Agent (Saga pattern — automatic rollback on failure)
app.post("/", async (c) => {
  const ownerId = c.get("accountId");
  const { name, avatar, model, apiKey, baseUrl, systemPrompt, parentId, runtime } =
    await c.req.json();

  if (!name) {
    return c.json({ error: "name is required" }, 400);
  }

  const result = await createAgentSaga({
    ownerId, name, avatar, model, apiKey, baseUrl, systemPrompt, parentId, runtime,
  });

  if (!result.success) {
    const detail = result.compensationErrors.length > 0
      ? ` (compensation issues: ${result.compensationErrors.map((e) => `${e.step}: ${e.error}`).join(", ")})`
      : "";
    return c.json({
      error: `Failed at step "${result.failedStep}": ${result.error}${detail}`,
    }, 500);
  }

  return c.json(result.agent, 201);
});

// List my Agents
app.get("/", async (c) => {
  const ownerId = c.get("accountId");
  const accountId = c.req.query("accountId");

  const where = accountId ? { accountId } : { ownerId };

  const agents = await prisma.agent.findMany({
    where,
    include: {
      config: {
        select: {
          model: true,
          runtime: true,
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
  const { agent, error } = await getOwnedAgent(c.req.param("id"), c.get("accountId"));
  if (error === "Agent not found") return c.json({ error }, 404);
  if (error === "Forbidden") return c.json({ error }, 403);

  return c.json(agent);
});

// Update Agent config
app.patch("/:id", async (c) => {
  const { agent, error } = await getOwnedAgent(c.req.param("id"), c.get("accountId"));
  if (error === "Agent not found") return c.json({ error }, 404);
  if (error === "Forbidden") return c.json({ error }, 403);

  const { name, avatar, model, apiKey, baseUrl, systemPrompt } = await c.req.json();

  const updated = await prisma.agent.update({
    where: { id: agent!.id },
    data: {
      ...(name && { name }),
      ...(avatar !== undefined && { avatar }),
      config: {
        update: {
          ...(model && { model }),
          ...(apiKey !== undefined && { apiKey }),
          ...(baseUrl !== undefined && { baseUrl }),
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
  const { agent, error } = await getOwnedAgent(c.req.param("id"), c.get("accountId"));
  if (error === "Agent not found") return c.json({ error }, 404);
  if (error === "Forbidden") return c.json({ error }, 403);

  // 1. Stop and remove runtime instance
  try {
    const runtime = agent!.config?.runtime ?? "openclaw";
    await getRuntimeClient(runtime).removeInstance(agent!.id);
  } catch {
    // Instance might not exist
  }

  // 2. Delete from our DB (cascades to config)
  await prisma.agent.delete({ where: { id: agent!.id } });

  return c.json({ ok: true });
});

// Start Agent (launch OpenClaw container)
app.post("/:id/start", async (c) => {
  const { agent, error } = await getOwnedAgent(c.req.param("id"), c.get("accountId"));
  if (error === "Agent not found") return c.json({ error }, 404);
  if (error === "Forbidden") return c.json({ error }, 403);

  if (!agent!.config?.apiKey) {
    return c.json({ error: "API key is required to start Agent" }, 400);
  }

  try {
    await prisma.agentConfig.update({
      where: { agentId: agent!.id },
      data: { status: "starting" },
    });

    const runtime = agent!.config!.runtime ?? "openclaw";
    const result = await getRuntimeClient(runtime).createInstance({
      agentId: agent!.id,
      accountId: agent!.accountId,
      model: agent!.config!.model,
      apiKey: agent!.config!.apiKey!,
      baseUrl: agent!.config!.baseUrl ?? undefined,
      systemPrompt: agent!.config!.systemPrompt ?? undefined,
      gatewayToken: agent!.config!.gatewayToken ?? undefined,
    });

    await prisma.agentConfig.update({
      where: { agentId: agent!.id },
      data: {
        status: "running",
        containerId: result.containerId,
        startedAt: new Date(),
      },
    });

    return c.json({ ok: true, containerId: result.containerId });
  } catch (err: unknown) {
    await prisma.agentConfig.update({
      where: { agentId: agent!.id },
      data: { status: "error" },
    });

    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Stop Agent
app.post("/:id/stop", async (c) => {
  const { agent, error } = await getOwnedAgent(c.req.param("id"), c.get("accountId"));
  if (error === "Agent not found") return c.json({ error }, 404);
  if (error === "Forbidden") return c.json({ error }, 403);

  try {
    const runtime = agent!.config?.runtime ?? "openclaw";
    await getRuntimeClient(runtime).stopInstance(agent!.id);

    await prisma.agentConfig.update({
      where: { agentId: agent!.id },
      data: { status: "stopped", stoppedAt: new Date() },
    });

    return c.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Chat with Agent (async — forwards to container webhook, reply via callback)
// Called by im-server internally, no ownership check
app.post("/:id/chat", async (c) => {
  const id = c.req.param("id");
  const { message, sessionKey, senderId, senderName } = await c.req.json();

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
    const runtime = agent.config?.runtime ?? "openclaw";
    await getRuntimeClient(runtime).chat({
      agentId: agent.id,
      message,
      sessionKey,
      senderId,
      senderName,
    });
    return c.json({ ok: true }, 202);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

export default app;
