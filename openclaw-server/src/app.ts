import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import * as instance from "./instance.js";

const app = new Hono().basePath("/v1/openclaw");

app.use("*", cors());
app.use("*", logger());

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Create an OpenClaw instance for an Agent
app.post("/instances", async (c) => {
  const body = await c.req.json();
  const { agentId, accountId, model, apiKey, baseUrl, systemPrompt, gatewayToken } = body;

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
      gatewayToken,
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

// Send a chat message to an Agent (async — reply delivered via callback)
app.post("/instances/:agentId/chat", async (c) => {
  const agentId = c.req.param("agentId");
  const { sessionKey, message, senderId, senderName } = await c.req.json();

  if (!message) {
    return c.json({ error: "message is required" }, 400);
  }

  const session = sessionKey || `session-${agentId}`;

  try {
    await instance.chat(agentId, session, message, senderId || "unknown", senderName);
    return c.json({ ok: true }, 202);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

export default app;
