import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import * as docker from "./docker.js";

const app = new Hono().basePath("/v1/containers");

app.use("*", cors());
app.use("*", logger());

// Health check
app.get("/health", async (c) => {
  const dockerOk = await docker.pingDocker();
  return c.json({ status: dockerOk ? "ok" : "docker_unavailable" });
});

// List managed containers
app.get("/", async (c) => {
  const containers = await docker.listContainers("clawchat.managed=true");
  return c.json(containers);
});

// Create a container
app.post("/", async (c) => {
  const body = await c.req.json();
  const { name, image, env, ports, volumes, network, memory, cpus, cmd } =
    body;

  if (!name || !image) {
    return c.json({ error: "name and image are required" }, 400);
  }

  try {
    const result = await docker.createContainer({
      name,
      image,
      env,
      ports,
      volumes,
      network,
      memory,
      cpus,
      cmd,
    });
    return c.json(result, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("Conflict")) {
      return c.json({ error: "Container name already exists" }, 409);
    }
    return c.json({ error: message }, 500);
  }
});

// Get container info
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const info = await docker.getContainer(id);
  if (!info) {
    return c.json({ error: "Container not found" }, 404);
  }
  return c.json(info);
});

// Start container
app.post("/:id/start", async (c) => {
  const id = c.req.param("id");
  try {
    await docker.startContainer(id);
    return c.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Stop container
app.post("/:id/stop", async (c) => {
  const id = c.req.param("id");
  try {
    await docker.stopContainer(id);
    return c.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Remove container
app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    await docker.removeContainer(id);
    return c.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Get container logs
app.get("/:id/logs", async (c) => {
  const id = c.req.param("id");
  const tail = Number(c.req.query("tail") || "100");
  try {
    const logs = await docker.getContainerLogs(id, tail);
    return c.json({ logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Volume management
app.post("/volumes", async (c) => {
  const { name } = await c.req.json();
  if (!name) {
    return c.json({ error: "name is required" }, 400);
  }
  try {
    await docker.createVolume(name);
    return c.json({ ok: true }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

app.delete("/volumes/:name", async (c) => {
  const name = c.req.param("name");
  try {
    await docker.removeVolume(name);
    return c.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
