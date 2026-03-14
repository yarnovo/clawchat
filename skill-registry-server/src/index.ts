import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./app.js";
import { buildIndex } from "./store.js";
import { logger } from "./logger.js";

const port = Number(process.env["PORT"] || 3007);

// Build skill index from skills/ submodule before accepting requests
await buildIndex();

logger.info({ port }, "skill-registry-server listening");
serve({ fetch: app.fetch, port });
