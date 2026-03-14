import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./app.js";
import { logger } from "./logger.js";

const port = Number(process.env["PORT"] || 3005);
logger.info({ port }, "nanoclaw-server listening");
serve({ fetch: app.fetch, port });
