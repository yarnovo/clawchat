import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { signToken } from "../auth.js";

const auth = new Hono();

auth.post("/register", async (c) => {
  const { name, email, password } = await c.req.json();

  if (!name || !email || !password) {
    return c.json({ error: "name, email, password are required" }, 400);
  }

  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const account = await prisma.account.create({
    data: { type: "human", name, email, passwordHash },
  });

  const token = signToken({ sub: account.id, type: account.type });
  return c.json({
    token,
    account: { id: account.id, name: account.name, email: account.email, type: account.type },
  }, 201);
});

// Internal: agent-server 调用，注册 Agent 账号（无密码、无邮箱）
auth.post("/register-agent", async (c) => {
  const { name, avatar } = await c.req.json();

  if (!name) {
    return c.json({ error: "name is required" }, 400);
  }

  const account = await prisma.account.create({
    data: { type: "agent", name, avatar },
  });

  return c.json({
    account: { id: account.id, name: account.name, avatar: account.avatar, type: account.type },
  }, 201);
});

auth.post("/login", async (c) => {
  const { email, password } = await c.req.json();

  if (!email || !password) {
    return c.json({ error: "email and password are required" }, 400);
  }

  const account = await prisma.account.findUnique({ where: { email } });
  if (!account || !account.passwordHash) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await bcrypt.compare(password, account.passwordHash);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = signToken({ sub: account.id, type: account.type });
  return c.json({
    token,
    account: { id: account.id, name: account.name, email: account.email, type: account.type },
  });
});

export default auth;
