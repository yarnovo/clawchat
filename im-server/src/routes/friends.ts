import { Hono } from "hono";
import { prisma } from "../db.js";
import { authMiddleware } from "../auth.js";
import type { AppEnv } from "../env.js";

const friends = new Hono<AppEnv>();

const ACCOUNT_SELECT = { id: true, name: true, avatar: true, email: true, type: true };

// 内部接口：直接添加好友（Agent 创建后自动添加，不走申请流程，无需鉴权）
friends.post("/add-direct", async (c) => {
  const { accountAId, accountBId } = await c.req.json();

  if (!accountAId || !accountBId) {
    return c.json({ error: "accountAId and accountBId are required" }, 400);
  }

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { accountAId, accountBId },
        { accountAId: accountBId, accountBId: accountAId },
      ],
    },
  });

  if (existing) {
    if (existing.status === "accepted") {
      return c.json(existing);
    }
    const updated = await prisma.friendship.update({
      where: { id: existing.id },
      data: { status: "accepted" },
    });
    return c.json(updated);
  }

  const friendship = await prisma.friendship.create({
    data: { accountAId, accountBId, status: "accepted" },
  });

  return c.json(friendship, 201);
});

// 以下路由需要鉴权
friends.use(authMiddleware);

// 发送好友申请（通过 email 或 accountId 查找）
friends.post("/request", async (c) => {
  const accountId = c.get("accountId");
  const body = await c.req.json();
  const { email, accountId: targetAccountId } = body;

  if (!email && !targetAccountId) {
    return c.json({ error: "email or accountId is required" }, 400);
  }

  let target;
  if (targetAccountId) {
    target = await prisma.account.findUnique({ where: { id: targetAccountId } });
  } else {
    target = await prisma.account.findUnique({ where: { email } });
  }
  if (!target) {
    return c.json({ error: "Account not found" }, 404);
  }

  if (target.id === accountId) {
    return c.json({ error: "Cannot add yourself" }, 400);
  }

  // 检查是否已有关系（双向）
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { accountAId: accountId, accountBId: target.id },
        { accountAId: target.id, accountBId: accountId },
      ],
    },
  });

  if (existing) {
    if (existing.status === "accepted") {
      return c.json({ error: "Already friends" }, 409);
    }
    if (existing.status === "pending") {
      return c.json({ error: "Request already pending" }, 409);
    }
    // rejected → 重新申请：更新为 pending，发起方变为当前用户
    if (existing.status === "rejected") {
      const updated = await prisma.friendship.update({
        where: { id: existing.id },
        data: { accountAId: accountId, accountBId: target.id, status: "pending" },
        include: { accountA: { select: ACCOUNT_SELECT }, accountB: { select: ACCOUNT_SELECT } },
      });
      return c.json(updated, 201);
    }
  }

  const friendship = await prisma.friendship.create({
    data: { accountAId: accountId, accountBId: target.id },
    include: { accountA: { select: ACCOUNT_SELECT }, accountB: { select: ACCOUNT_SELECT } },
  });

  return c.json(friendship, 201);
});

// 待处理的好友申请（收到的）
friends.get("/requests", async (c) => {
  const accountId = c.get("accountId");

  const requests = await prisma.friendship.findMany({
    where: { accountBId: accountId, status: "pending" },
    include: { accountA: { select: ACCOUNT_SELECT } },
    orderBy: { createdAt: "desc" },
  });

  return c.json(requests);
});

// 接受/拒绝好友申请
friends.patch("/request/:id", async (c) => {
  const accountId = c.get("accountId");
  const id = c.req.param("id");
  const { status } = await c.req.json();

  if (!status || !["accepted", "rejected"].includes(status)) {
    return c.json({ error: "status must be accepted or rejected" }, 400);
  }

  const friendship = await prisma.friendship.findUnique({ where: { id } });
  if (!friendship) {
    return c.json({ error: "Request not found" }, 404);
  }

  if (friendship.accountBId !== accountId) {
    return c.json({ error: "Not your request" }, 403);
  }

  if (friendship.status !== "pending") {
    return c.json({ error: "Request already handled" }, 409);
  }

  const updated = await prisma.friendship.update({
    where: { id },
    data: { status },
    include: { accountA: { select: ACCOUNT_SELECT }, accountB: { select: ACCOUNT_SELECT } },
  });

  return c.json(updated);
});

// 好友列表
friends.get("/", async (c) => {
  const accountId = c.get("accountId");

  const friendships = await prisma.friendship.findMany({
    where: {
      status: "accepted",
      OR: [{ accountAId: accountId }, { accountBId: accountId }],
    },
    include: { accountA: { select: ACCOUNT_SELECT }, accountB: { select: ACCOUNT_SELECT } },
  });

  // 返回对方的信息
  const list = friendships.map((f) => ({
    friendshipId: f.id,
    friend: f.accountAId === accountId ? f.accountB : f.accountA,
    createdAt: f.createdAt,
  }));

  return c.json(list);
});

// 删除好友
friends.delete("/:id", async (c) => {
  const accountId = c.get("accountId");
  const id = c.req.param("id");

  const friendship = await prisma.friendship.findUnique({ where: { id } });
  if (!friendship) {
    return c.json({ error: "Friendship not found" }, 404);
  }

  if (friendship.accountAId !== accountId && friendship.accountBId !== accountId) {
    return c.json({ error: "Not your friendship" }, 403);
  }

  await prisma.friendship.delete({ where: { id } });
  return c.json({ ok: true });
});

export default friends;
