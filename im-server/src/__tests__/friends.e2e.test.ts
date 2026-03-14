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
const userA = { name: "用户A", email: `a-${ts}@test.com`, password: "123456" };
const userB = { name: "用户B", email: `b-${ts}@test.com`, password: "123456" };

let tokenA: string;
let tokenB: string;
let accountAId: string;
let accountBId: string;
let friendshipId: string;

beforeAll(async () => {
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
});

afterAll(async () => {
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

describe("Friends", () => {
  it("无 token 返回 401", async () => {
    const res = await request("/friends");
    expect(res.status).toBe(401);
  });

  it("A 向 B 发送好友申请", async () => {
    const res = await request(
      "/friends/request",
      json("POST", tokenA, { email: userB.email }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("pending");
    expect(body.accountB.email).toBe(userB.email);
    friendshipId = body.id;
  });

  it("重复申请返回 409", async () => {
    const res = await request(
      "/friends/request",
      json("POST", tokenA, { email: userB.email }),
    );
    expect(res.status).toBe(409);
  });

  it("不能添加自己", async () => {
    const res = await request(
      "/friends/request",
      json("POST", tokenA, { email: userA.email }),
    );
    expect(res.status).toBe(400);
  });

  it("不存在的邮箱返回 404", async () => {
    const res = await request(
      "/friends/request",
      json("POST", tokenA, { email: "nobody@test.com" }),
    );
    expect(res.status).toBe(404);
  });

  it("B 看到待处理申请", async () => {
    const res = await request("/friends/requests", {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].accountA.email).toBe(userA.email);
  });

  it("A 看不到待处理申请（发起方不是接收方）", async () => {
    const res = await request("/friends/requests", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(0);
  });

  it("A 不能处理 B 收到的申请", async () => {
    const res = await request(
      `/friends/request/${friendshipId}`,
      json("PATCH", tokenA, { status: "accepted" }),
    );
    expect(res.status).toBe(403);
  });

  it("B 接受好友申请", async () => {
    const res = await request(
      `/friends/request/${friendshipId}`,
      json("PATCH", tokenB, { status: "accepted" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("accepted");
  });

  it("重复处理返回 409", async () => {
    const res = await request(
      `/friends/request/${friendshipId}`,
      json("PATCH", tokenB, { status: "accepted" }),
    );
    expect(res.status).toBe(409);
  });

  it("A 的好友列表包含 B", async () => {
    const res = await request("/friends", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].friend.email).toBe(userB.email);
  });

  it("B 的好友列表包含 A", async () => {
    const res = await request("/friends", {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].friend.email).toBe(userA.email);
  });

  it("A 删除好友", async () => {
    const res = await request(`/friends/${friendshipId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.status).toBe(200);
  });

  it("删除后好友列表为空", async () => {
    const res = await request("/friends", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(0);
  });

  it("通过 accountId 发送好友申请", async () => {
    const res = await request(
      "/friends/request",
      json("POST", tokenA, { accountId: accountBId }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("pending");
    friendshipId = body.id;
  });

  it("rejected 后可重新申请", async () => {
    // B 拒绝
    await request(
      `/friends/request/${friendshipId}`,
      json("PATCH", tokenB, { status: "rejected" }),
    );

    // A 重新申请
    const res = await request(
      "/friends/request",
      json("POST", tokenA, { accountId: accountBId }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("pending");
    expect(body.accountA.name).toBe(userA.name);
    friendshipId = body.id;

    // Cleanup
    await prisma.friendship.delete({ where: { id: friendshipId } });
  });

  it("内部接口: 查询/审核好友请求", async () => {
    // A 向 B 发送申请
    const reqRes = await request(
      "/friends/request",
      json("POST", tokenA, { accountId: accountBId }),
    );
    const reqBody = await reqRes.json();
    friendshipId = reqBody.id;

    // 内部接口查询 B 的待处理请求
    const listRes = await request(`/internal/friend-requests/${accountBId}`);
    expect(listRes.status).toBe(200);
    const list = await listRes.json();
    expect(list).toHaveLength(1);
    expect(list[0].accountA.name).toBe(userA.name);

    // 内部接口代理审核
    const handleRes = await request(`/internal/friend-requests/${friendshipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "accepted" }),
    });
    expect(handleRes.status).toBe(200);
    const handled = await handleRes.json();
    expect(handled.status).toBe("accepted");

    // Cleanup
    await prisma.friendship.delete({ where: { id: friendshipId } });
  });

  it("内部接口: 更新 searchable", async () => {
    const res = await request(`/internal/accounts/${accountAId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searchable: true }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.searchable).toBe(true);

    // 恢复
    await request(`/internal/accounts/${accountAId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searchable: false }),
    });
  });
});
