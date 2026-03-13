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
const userA = { name: "消息A", email: `msg-a-${ts}@test.com`, password: "123456" };
const userB = { name: "消息B", email: `msg-b-${ts}@test.com`, password: "123456" };

let tokenA: string;
let tokenB: string;
let accountAId: string;
let accountBId: string;
let conversationId: string;
let messageId: string;

beforeAll(async () => {
  // 清理
  await prisma.message.deleteMany({
    where: { sender: { email: { in: [userA.email, userB.email] } } },
  });
  await prisma.conversation.deleteMany({
    where: { targetId: { contains: ts.toString() } },
  });
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { accountA: { email: { in: [userA.email, userB.email] } } },
        { accountB: { email: { in: [userA.email, userB.email] } } },
      ],
    },
  });
  await prisma.account.deleteMany({
    where: { email: { in: [userA.email, userB.email] } },
  });

  // 注册两个用户
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

  // 建立好友关系
  const friendRes = await request(
    "/friends/request",
    json("POST", tokenA, { email: userB.email }),
  );
  const friendship = await friendRes.json();
  await request(
    `/friends/request/${friendship.id}`,
    json("PATCH", tokenB, { status: "accepted" }),
  );
});

afterAll(async () => {
  await prisma.message.deleteMany({
    where: { sender: { email: { in: [userA.email, userB.email] } } },
  });
  await prisma.conversation.deleteMany({
    where: { targetId: { contains: ts.toString() } },
  });
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { accountA: { email: { in: [userA.email, userB.email] } } },
        { accountB: { email: { in: [userA.email, userB.email] } } },
      ],
    },
  });
  await prisma.account.deleteMany({
    where: { email: { in: [userA.email, userB.email] } },
  });
  await prisma.$disconnect();
});

describe("Conversations", () => {
  it("非好友不能创建对话", async () => {
    // 创建一个陌生人
    const strangerRes = await request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "陌生人",
        email: `stranger-${ts}@test.com`,
        password: "123456",
      }),
    });
    const stranger = await strangerRes.json();

    const res = await request(
      "/conversations",
      json("POST", tokenA, { friendId: stranger.account.id }),
    );
    expect(res.status).toBe(403);

    // 清理
    await prisma.account.delete({ where: { id: stranger.account.id } });
  });

  it("A 与 B 创建私聊对话", async () => {
    const res = await request(
      "/conversations",
      json("POST", tokenA, { friendId: accountBId }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.type).toBe("dm");
    conversationId = body.id;
  });

  it("重复创建返回同一对话", async () => {
    const res = await request(
      "/conversations",
      json("POST", tokenB, { friendId: accountAId }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(conversationId);
  });

  it("A 的对话列表包含此对话", async () => {
    const res = await request("/conversations", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(1);
    expect(body.find((c: { id: string }) => c.id === conversationId)).toBeTruthy();
  });
});

describe("Messages", () => {
  it("缺少参数返回 400", async () => {
    const res = await request(
      "/messages",
      json("POST", tokenA, { conversationId }),
    );
    expect(res.status).toBe(400);
  });

  it("A 发送消息", async () => {
    const res = await request(
      "/messages",
      json("POST", tokenA, {
        conversationId,
        content: "你好 B！",
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.content).toBe("你好 B！");
    expect(body.sender.name).toBe(userA.name);
    messageId = body.id;
  });

  it("B 发送消息", async () => {
    const res = await request(
      "/messages",
      json("POST", tokenB, {
        conversationId,
        content: "你好 A！",
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.content).toBe("你好 A！");
  });

  it("拉取消息列表", async () => {
    const res = await request(
      `/messages?conversationId=${conversationId}`,
      { headers: { Authorization: `Bearer ${tokenA}` } },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    // 按时间正序
    expect(body[0].content).toBe("你好 B！");
    expect(body[1].content).toBe("你好 A！");
  });

  it("游标分页", async () => {
    const res = await request(
      `/messages?conversationId=${conversationId}&before=${messageId}&limit=10`,
      { headers: { Authorization: `Bearer ${tokenA}` } },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    // messageId 是第一条，before 它应该没有更早的
    expect(body).toHaveLength(0);
  });

  it("A 撤回自己的消息", async () => {
    const res = await request(
      `/messages/${messageId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${tokenA}` } },
    );
    expect(res.status).toBe(200);
  });

  it("撤回后不在消息列表中", async () => {
    const res = await request(
      `/messages?conversationId=${conversationId}`,
      { headers: { Authorization: `Bearer ${tokenA}` } },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].content).toBe("你好 A！");
  });

  it("B 不能撤回 A 的消息", async () => {
    // 先让 A 发一条新的
    const sendRes = await request(
      "/messages",
      json("POST", tokenA, { conversationId, content: "新消息" }),
    );
    const msg = await sendRes.json();

    const res = await request(
      `/messages/${msg.id}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${tokenB}` } },
    );
    expect(res.status).toBe(403);
  });

  it("对话列表包含最后一条消息", async () => {
    const res = await request("/conversations", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const body = await res.json();
    const conv = body.find((c: { id: string }) => c.id === conversationId);
    expect(conv.lastMessage).toBeTruthy();
    expect(conv.friend.name).toBe(userB.name);
  });
});
