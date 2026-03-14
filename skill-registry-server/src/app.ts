import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "./logger.js";
import { requestId } from "./middleware/request-id.js";
import {
  registry,
  httpRequestDuration,
  httpRequestsTotal,
} from "./metrics.js";
import wellKnown from "./routes/well-known.js";
import apiV1 from "./routes/api-v1.js";
import type { AppEnv } from "./env.js";
import { getIndexSize } from "./store.js";

const app = new Hono<AppEnv>();

app.use("*", cors());
app.use("*", requestId);
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const route = c.req.routePath || c.req.path;
  const status = String(c.res.status);
  httpRequestDuration.observe(
    { method: c.req.method, route, status },
    ms / 1000,
  );
  httpRequestsTotal.inc({ method: c.req.method, route, status });
  logger.info(
    {
      requestId: c.get("requestId"),
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      ms,
    },
    `${c.req.method} ${c.req.path} ${c.res.status}`,
  );
});

// Health check (ClawChat convention: /v1/<service>/health)
app.get("/v1/skill-registry/health", (c) =>
  c.json({ status: "ok", checks: { skillIndex: getIndexSize() > 0 ? "ok" : "empty" } }),
);

app.get("/v1/skill-registry/metrics", async (c) => {
  const metrics = await registry.metrics();
  return c.text(metrics, 200, { "Content-Type": registry.contentType });
});

// ClawHub discovery protocol
app.route("/.well-known", wellKnown);

// ClawHub-compatible API
app.route("/api/v1", apiV1);

export default app;
