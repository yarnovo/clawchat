import { Hono } from "hono";
import { prisma } from "../db.js";
import { authMiddleware } from "../auth.js";
import type { AppEnv } from "../env.js";

const accounts = new Hono<AppEnv>();
accounts.use(authMiddleware);

accounts.get("/me", async (c) => {
  const accountId = c.get("accountId");
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true, type: true, name: true, avatar: true, email: true, searchable: true, createdAt: true },
  });
  if (!account) {
    return c.json({ error: "Account not found" }, 404);
  }
  return c.json(account);
});

accounts.patch("/me", async (c) => {
  const accountId = c.get("accountId");
  const { name, avatar, searchable } = await c.req.json();
  const account = await prisma.account.update({
    where: { id: accountId },
    data: {
      ...(name && { name }),
      ...(avatar && { avatar }),
      ...(searchable !== undefined && { searchable }),
    },
    select: { id: true, type: true, name: true, avatar: true, email: true, searchable: true, createdAt: true },
  });
  return c.json(account);
});

// 搜索可发现的账号
accounts.get("/search", async (c) => {
  const accountId = c.get("accountId");
  const q = c.req.query("q");
  const limitParam = parseInt(c.req.query("limit") || "20", 10);
  const limit = Math.min(Math.max(limitParam, 1), 50);

  if (!q || q.trim().length === 0) {
    return c.json([]);
  }

  // 获取当前用户的好友 ID 列表
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "accepted",
      OR: [{ accountAId: accountId }, { accountBId: accountId }],
    },
    select: { accountAId: true, accountBId: true },
  });
  const friendIds = friendships.map((f) =>
    f.accountAId === accountId ? f.accountBId : f.accountAId,
  );

  const excludeIds = [accountId, ...friendIds];

  const accounts = await prisma.account.findMany({
    where: {
      searchable: true,
      name: { contains: q.trim(), mode: "insensitive" },
      id: { notIn: excludeIds },
    },
    select: { id: true, name: true, avatar: true, type: true },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  return c.json(accounts);
});

export default accounts;
