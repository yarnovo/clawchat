import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { verifyToken } from "./auth.js";

// userId → Set of connected WebSocket clients
const clients = new Map<string, Set<WebSocket>>();

export function setupWebSocket(server: ReturnType<typeof import("@hono/node-server").serve>) {
  const wss = new WebSocketServer({ noServer: true });

  // Handle HTTP upgrade requests
  (server as any).on("upgrade", (req: IncomingMessage, socket: any, head: Buffer) => {
    // Extract token from query string: /v1/im/ws?token=xxx
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    if (url.pathname !== "/v1/im/ws") {
      socket.destroy();
      return;
    }

    const token = url.searchParams.get("token");
    if (!token) {
      socket.destroy();
      return;
    }

    let payload: { sub: string };
    try {
      payload = verifyToken(token);
    } catch {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, payload);
    });
  });

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage, payload: { sub: string }) => {
    const userId = payload.sub;

    if (!clients.has(userId)) {
      clients.set(userId, new Set());
    }
    clients.get(userId)!.add(ws);
    console.log(`[ws] connected: ${userId} (${clients.get(userId)!.size} connections)`);

    ws.on("close", () => {
      const set = clients.get(userId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) clients.delete(userId);
      }
      console.log(`[ws] disconnected: ${userId}`);
    });

    ws.on("error", () => {
      ws.close();
    });

    // Send initial connected confirmation
    ws.send(JSON.stringify({ type: "connected" }));
  });
}

// Push a message to a specific user (all their connections)
export function pushToUser(userId: string, data: Record<string, unknown>) {
  const set = clients.get(userId);
  if (!set) return;
  const payload = JSON.stringify(data);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

// Push a message to all participants of a conversation
export function pushToConversationParticipants(
  targetId: string,
  data: Record<string, unknown>,
  excludeUserId?: string,
) {
  const userIds = targetId.split(":");
  for (const uid of userIds) {
    if (uid !== excludeUserId) {
      pushToUser(uid, data);
    }
  }
}
