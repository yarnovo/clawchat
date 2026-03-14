import { Hono } from "hono";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";
import { authMiddleware } from "../auth.js";
import { pushToConversationParticipants } from "../ws.js";
import type { AppEnv } from "../env.js";

const AGENT_SERVER_URL =
  process.env["AGENT_SERVER_URL"] || "http://localhost:3004";
const JWT_SECRET = process.env["JWT_SECRET"] || "clawchat-dev-secret";

// Generate a service-to-service JWT for internal calls to agent-server
function serviceToken(accountId: string): string {
  return jwt.sign({ sub: accountId, type: "service" }, JWT_SECRET, { expiresIn: "5m" });
}

const messages = new Hono<AppEnv>();
messages.use(authMiddleware);

// Forward message to Agent via webhook (async — reply comes back via callback)
async function forwardToAgent(
  agentAccountId: string,
  conversationId: string,
  targetId: string,
  content: string,
  senderId: string,
  senderName: string,
) {
  try {
    const token = serviceToken(senderId);
    // Look up agent by accountId
    const agentRes = await fetch(
      `${AGENT_SERVER_URL}/v1/agents?accountId=${agentAccountId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!agentRes.ok) return;
    const agents = await agentRes.json();
    const agent = Array.isArray(agents) ? agents[0] : agents;
    if (!agent?.id) return;

    // Send chat request (async — reply delivered via callback, no auth needed)
    const chatRes = await fetch(
      `${AGENT_SERVER_URL}/v1/agents/${agent.id}/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          sessionKey: conversationId,
          senderId,
          senderName,
        }),
      },
    );

    // Push typing indicator after successful forward
    if (chatRes.ok || chatRes.status === 202) {
      pushToConversationParticipants(targetId, {
        type: "typing",
        data: { conversationId, senderId: agentAccountId },
      }, agentAccountId);
    }
  } catch {
    // Agent forward failure is non-blocking
  }
}

// 发送消息
messages.post("/", async (c) => {
  const accountId = c.get("accountId");
  const { conversationId, content, type: msgType } = await c.req.json();

  if (!conversationId || !content) {
    return c.json({ error: "conversationId and content are required" }, 400);
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    return c.json({ error: "Conversation not found" }, 404);
  }

  if (!conversation.targetId.includes(accountId)) {
    return c.json({ error: "Not your conversation" }, 403);
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      conversationType: conversation.type,
      senderId: accountId,
      content,
      type: msgType || "text",
    },
    include: {
      sender: {
        select: { id: true, name: true, avatar: true, type: true },
      },
    },
  });

  // 更新对话时间
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  // Check if peer is an Agent, forward message asynchronously
  if (conversation.type === "dm") {
    const peerIds = conversation.targetId.split(":").filter((id: string) => id !== accountId);
    const peerId = peerIds[0];
    if (peerId) {
      const peer = await prisma.account.findUnique({ where: { id: peerId } });
      if (peer?.type === "agent") {
        // Fire and forget — don't block the response
        const sender = await prisma.account.findUnique({ where: { id: accountId } });
        forwardToAgent(peerId, conversationId, conversation.targetId, content, accountId, sender?.name || accountId);
      }
    }
  }

  return c.json(message, 201);
});

// 拉取消息（游标分页）
messages.get("/", async (c) => {
  const accountId = c.get("accountId");
  const conversationId = c.req.query("conversationId");
  const before = c.req.query("before");
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);

  if (!conversationId) {
    return c.json({ error: "conversationId is required" }, 400);
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    return c.json({ error: "Conversation not found" }, 404);
  }

  if (!conversation.targetId.includes(accountId)) {
    return c.json({ error: "Not your conversation" }, 403);
  }

  const where: Record<string, unknown> = {
    conversationId,
    deletedAt: null,
  };

  if (before) {
    const cursor = await prisma.message.findUnique({ where: { id: before } });
    if (cursor) {
      where.createdAt = { lt: cursor.createdAt };
    }
  }

  const messagesList = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      sender: {
        select: { id: true, name: true, avatar: true, type: true },
      },
    },
  });

  return c.json(messagesList.reverse());
});

// 撤回消息（软删除）
messages.delete("/:id", async (c) => {
  const accountId = c.get("accountId");
  const id = c.req.param("id");

  const message = await prisma.message.findUnique({ where: { id } });

  if (!message) {
    return c.json({ error: "Message not found" }, 404);
  }

  if (message.senderId !== accountId) {
    return c.json({ error: "Can only delete your own messages" }, 403);
  }

  if (message.deletedAt) {
    return c.json({ error: "Already deleted" }, 409);
  }

  await prisma.message.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return c.json({ ok: true });
});

export default messages;
