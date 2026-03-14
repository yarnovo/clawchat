import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import { prisma } from "../db.js";

const request = (path: string, init?: RequestInit) =>
  app.request(`/v1/im${path}`, init);

const json = (method: string, token: string, body?: object) => ({
  method,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  ...(body && { body: JSON.stringify(body) }),
});

const ts = Date.now();
const userA = { name: "搜索A", email: `search-a-${ts}@test.com`, password: "123456" };
const userB = { name: "搜索B", email: `search-b-${ts}@test.com`, password: "123456" };
const userC = { name: "搜索C", email: `search-c-${ts}@test.com`, password: "123456" };

let tokenA: string;
let tokenB: string;
let tokenC: string;
let accountAId: string;
let accountBId: string;

beforeAll(async () => {
  // Cleanup
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { accountA: { email: { in: [userA.email, userB.email, userC.email] } } },
        { accountB: { email: { in: [userA.email, userB.email, userC.email] } } },
      ],
    },
  });
  await prisma.account.deleteMany({
    where: { email: { in: [userA.email, userB.email, userC.email] } },
  });

  // Register
  const resA = await request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userA),
  });
  const bodyA = await resA.json();
  tokenA = bodyA.token;
  accountAId = bodyA.account.id;

  const resB = await request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userB),
  });
  const bodyB = await resB.json();
  tokenB = bodyB.token;
  accountBId = bodyB.account.id;

  const resC = await request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userC),
  });
  tokenC = (await resC.json()).token;

  // B 设为可搜索
  await request("/accounts/me", json("PATCH", tokenB, { searchable: true }));
  // C 保持不可搜索
});

afterAll(async () => {
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { accountA: { email: { in: [userA.email, userB.email, userC.email] } } },
        { accountB: { email: { in: [userA.email, userB.email, userC.email] } } },
      ],
    },
  });
  await prisma.account.deleteMany({
    where: { email: { in: [userA.email, userB.email, userC.email] } },
  });
  await prisma.$disconnect();
});

describe("搜索账号", () => {
  it("searchable=true 能被搜到", async () => {
    const res = await request("/accounts/search?q=搜索B", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("搜索B");
  });

  it("searchable=false 搜不到", async () => {
    const res = await request("/accounts/search?q=搜索C", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(0);
  });

  it("不返回自己", async () => {
    // 先把 A 也设为 searchable
    await request("/accounts/me", json("PATCH", tokenA, { searchable: true }));
    const res = await request("/accounts/search?q=搜索A", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(0);
    // 恢复
    await request("/accounts/me", json("PATCH", tokenA, { searchable: false }));
  });

  it("不返回已是好友的账号", async () => {
    // A 和 B 成为好友
    await request("/friends/add-direct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountAId, accountBId }),
    });

    const res = await request("/accounts/search?q=搜索B", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(0);

    // Cleanup friendship
    const friendship = await prisma.friendship.findFirst({
      where: { accountAId, accountBId },
    });
    if (friendship) {
      await prisma.friendship.delete({ where: { id: friendship.id } });
    }
  });

  it("不返回 email 字段", async () => {
    const res = await request("/accounts/search?q=搜索B", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0]).not.toHaveProperty("email");
  });

  it("空查询返回空数组", async () => {
    const res = await request("/accounts/search?q=", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(0);
  });

  it("无 token 返回 401", async () => {
    const res = await request("/accounts/search?q=test");
    expect(res.status).toBe(401);
  });

  it("GET /me 包含 searchable 字段", async () => {
    const res = await request("/accounts/me", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const body = await res.json();
    expect(body).toHaveProperty("searchable");
    expect(body.searchable).toBe(false);
  });

  it("PATCH /me 可更新 searchable", async () => {
    const res = await request(
      "/accounts/me",
      json("PATCH", tokenA, { searchable: true }),
    );
    const body = await res.json();
    expect(body.searchable).toBe(true);

    // 恢复
    await request("/accounts/me", json("PATCH", tokenA, { searchable: false }));
  });
});
