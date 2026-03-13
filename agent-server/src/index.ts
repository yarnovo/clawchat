import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./app.js";

const port = Number(process.env["PORT"] || 3004);
console.log(`agent-server listening on port ${port}`);
serve({ fetch: app.fetch, port });
