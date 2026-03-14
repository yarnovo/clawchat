import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "./logger.js";
import { requestId } from "./middleware/request-id.js";
import { registry, httpRequestDuration, httpRequestsTotal } from "./metrics.js";
import * as instance from "./instance.js";
import type { AppEnv } from "./env.js";

const app = new Hono<AppEnv>().basePath("/v1/ironclaw");

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

// Health check
app.get("/health", (c) => c.json({ status: "ok", checks: {} }));

app.get("/metrics", async (c) => {
  const metrics = await registry.metrics();
  return c.text(metrics, 200, { "Content-Type": registry.contentType });
});

// Create an IronClaw instance for an Agent
app.post("/instances", async (c) => {
  const body = await c.req.json();
  const { agentId, accountId, model, apiKey, baseUrl, systemPrompt } = body;

  if (!agentId || !accountId || !model || !apiKey) {
    return c.json({ error: "agentId, accountId, model, and apiKey are required" }, 400);
  }

  try {
    const result = await instance.createInstance({
      agentId,
      accountId,
      model,
      apiKey,
      baseUrl,
      systemPrompt,
    });
    return c.json(result, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Get instance status
app.get("/instances/:agentId", async (c) => {
  const agentId = c.req.param("agentId");
  try {
    const status = await instance.getInstanceStatus(agentId);
    return c.json(status);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Start an instance
app.post("/instances/:agentId/start", async (c) => {
  const agentId = c.req.param("agentId");
  try {
    await instance.startInstance(agentId);
    return c.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Stop an instance
app.post("/instances/:agentId/stop", async (c) => {
  const agentId = c.req.param("agentId");
  try {
    await instance.stopInstance(agentId);
    return c.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Remove an instance
app.delete("/instances/:agentId", async (c) => {
  const agentId = c.req.param("agentId");
  try {
    await instance.removeInstance(agentId);
    return c.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Get instance logs
app.get("/instances/:agentId/logs", async (c) => {
  const agentId = c.req.param("agentId");
  const tail = Number(c.req.query("tail") || "100");
  try {
    const logs = await instance.getInstanceLogs(agentId, tail);
    return c.json({ logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Send a chat message to an Agent (synchronous — waits for IronClaw response, then callbacks)
app.post("/instances/:agentId/chat", async (c) => {
  const agentId = c.req.param("agentId");
  const { sessionKey, message, senderId, senderName } = await c.req.json();

  if (!message) {
    return c.json({ error: "message is required" }, 400);
  }

  const session = sessionKey || `session-${agentId}`;

  try {
    await instance.chat(agentId, session, message, senderId || "unknown", senderName);
    return c.json({ ok: true }, 200);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

export default app;
