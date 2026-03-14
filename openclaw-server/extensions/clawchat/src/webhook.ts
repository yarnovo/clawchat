// Webhook HTTP server for receiving messages from im-server

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

export interface InboundMessage {
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  messageId?: string;
  timestamp?: number;
}

type MessageHandler = (msg: InboundMessage) => Promise<void>;

let server: ReturnType<typeof createServer> | null = null;
let messageHandler: MessageHandler | null = null;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  // Inbound message webhook
  if (req.method === "POST" && req.url === "/webhook/message") {
    if (!messageHandler) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not ready" }));
      return;
    }

    try {
      const body = JSON.parse(await readBody(req));
      const msg: InboundMessage = {
        conversationId: body.conversationId,
        senderId: body.senderId,
        senderName: body.senderName || body.senderId,
        content: body.content,
        messageId: body.messageId,
        timestamp: body.timestamp || Date.now(),
      };

      if (!msg.conversationId || !msg.content) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "conversationId and content required" }));
        return;
      }

      // Dispatch asynchronously — return 202 immediately
      messageHandler(msg).catch((err) => {
        console.error("[clawchat] webhook dispatch error:", err);
      });

      res.writeHead(202, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid JSON" }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
}

export function startWebhookServer(
  port: number,
  handler: MessageHandler,
): Promise<void> {
  messageHandler = handler;

  return new Promise((resolve, reject) => {
    server = createServer(handleRequest);
    server.on("error", reject);
    server.listen(port, "0.0.0.0", () => {
      console.log(`[clawchat] webhook server listening on port ${port}`);
      resolve();
    });
  });
}

export function stopWebhookServer(): Promise<void> {
  return new Promise((resolve) => {
    messageHandler = null;
    if (server) {
      server.close(() => resolve());
      server = null;
    } else {
      resolve();
    }
  });
}
