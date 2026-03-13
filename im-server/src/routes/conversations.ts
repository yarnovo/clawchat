import { Hono } from "hono";
import { prisma } from "../db.js";
import { authMiddleware } from "../auth.js";
import type { AppEnv } from "../env.js";

const conversations = new Hono<AppEnv>();
conversations.use(authMiddleware);

// 创建或获取私聊对话
conversations.post("/", async (c) => {
  const accountId = c.get("accountId");
  const { friendId } = await c.req.json();

  if (!friendId) {
    return c.json({ error: "friendId is required" }, 400);
  }

  // 验证是好友关系
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "accepted",
      OR: [
        { accountAId: accountId, accountBId: friendId },
        { accountAId: friendId, accountBId: accountId },
      ],
    },
  });

  if (!friendship) {
    return c.json({ error: "Not friends" }, 403);
  }

  // 查找已有对话（dm 对话 targetId 用较小ID→较大ID排序保证唯一）
  const [idA, idB] = [accountId, friendId].sort();
  const targetId = `${idA}:${idB}`;

  let conversation = await prisma.conversation.findFirst({
    where: { type: "dm", targetId },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { type: "dm", targetId },
    });
  }

  return c.json(conversation, 201);
});

// 对话列表（当前用户参与的）
conversations.get("/", async (c) => {
  const accountId = c.get("accountId");

  // 找出用户参与的所有 dm 对话
  const allConversations = await prisma.conversation.findMany({
    where: {
      type: "dm",
      targetId: { contains: accountId },
    },
    orderBy: { updatedAt: "desc" },
  });

  // 附加最后一条消息和对方信息
  const result = await Promise.all(
    allConversations.map(async (conv) => {
      const lastMessage = await prisma.message.findFirst({
        where: { conversationId: conv.id, deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          type: true,
          senderId: true,
          createdAt: true,
        },
      });

      // 从 targetId 解析对方 ID
      const ids = conv.targetId.split(":");
      const friendId = ids[0] === accountId ? ids[1] : ids[0];
      const friend = await prisma.account.findUnique({
        where: { id: friendId },
        select: { id: true, name: true, avatar: true, type: true },
      });

      return {
        ...conv,
        lastMessage,
        friend,
      };
    }),
  );

  return c.json(result);
});

// 对话详情
conversations.get("/:id", async (c) => {
  const accountId = c.get("accountId");
  const id = c.req.param("id");

  const conversation = await prisma.conversation.findUnique({
    where: { id },
  });

  if (!conversation) {
    return c.json({ error: "Conversation not found" }, 404);
  }

  if (!conversation.targetId.includes(accountId)) {
    return c.json({ error: "Not your conversation" }, 403);
  }

  return c.json(conversation);
});

export default conversations;
