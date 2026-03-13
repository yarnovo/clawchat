import { Hono } from "hono";
import { prisma } from "../db.js";
import { authMiddleware } from "../auth.js";
import type { AppEnv } from "../env.js";

const messages = new Hono<AppEnv>();
messages.use(authMiddleware);

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
