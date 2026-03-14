import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "./logger.js";
import { requestId } from "./middleware/request-id.js";
import { registry, httpRequestDuration, httpRequestsTotal } from "./metrics.js";
import auth from "./routes/auth.js";
import accounts from "./routes/accounts.js";
import friends from "./routes/friends.js";
import conversations from "./routes/conversations.js";
import messages from "./routes/messages.js";
import internal from "./routes/internal.js";
import health from "./routes/health.js";

import type { AppEnv } from "./env.js";

const app = new Hono<AppEnv>().basePath("/v1/im");

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

app.route("/health", health);
app.get("/metrics", async (c) => {
  const metrics = await registry.metrics();
  return c.text(metrics, 200, { "Content-Type": registry.contentType });
});
app.route("/auth", auth);
app.route("/accounts", accounts);
app.route("/friends", friends);
app.route("/conversations", conversations);
app.route("/messages", messages);
app.route("/internal", internal);

export default app;
