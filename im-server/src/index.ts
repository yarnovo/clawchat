import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./app.js";
import { setupWebSocket } from "./ws.js";
import { startAgentReplyWorker } from "./agent-reply-worker.js";

const port = Number(process.env["PORT"] || 3000);
console.log(`im-server listening on port ${port}`);
const server = serve({ fetch: app.fetch, port });
setupWebSocket(server);
startAgentReplyWorker();
