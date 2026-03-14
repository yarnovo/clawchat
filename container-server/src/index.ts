import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./app.js";
import { logger } from "./logger.js";

const port = Number(process.env["PORT"] || 3002);
logger.info({ port }, "container-server listening");
serve({ fetch: app.fetch, port });
