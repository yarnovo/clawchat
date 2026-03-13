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
    select: { id: true, type: true, name: true, avatar: true, email: true, createdAt: true },
  });
  if (!account) {
    return c.json({ error: "Account not found" }, 404);
  }
  return c.json(account);
});

accounts.patch("/me", async (c) => {
  const accountId = c.get("accountId");
  const { name, avatar } = await c.req.json();
  const account = await prisma.account.update({
    where: { id: accountId },
    data: { ...(name && { name }), ...(avatar && { avatar }) },
    select: { id: true, type: true, name: true, avatar: true, email: true, createdAt: true },
  });
  return c.json(account);
});

export default accounts;
