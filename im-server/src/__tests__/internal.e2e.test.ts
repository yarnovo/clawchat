import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import { prisma } from "../db.js";
import { redis, AGENT_REPLY_QUEUE } from "../redis.js";

const request = (path: string, init?: RequestInit) =>
  app.request(`/v1/im${path}`, init);

const jsonPost = (body: object) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

beforeEach(async () => {
  await redis.del(AGENT_REPLY_QUEUE);
});

afterEach(async () => {
  await redis.del(AGENT_REPLY_QUEUE);
});

describe("POST /internal/agent-reply", () => {
  it("缺少必填字段返回 400", async () => {
    const res = await request(
      "/internal/agent-reply",
      jsonPost({ conversationId: "c1" }),
    );
    expect(res.status).toBe(400);
  });

  it("合法请求返回 202 并入队 Redis", async () => {
    const res = await request(
      "/internal/agent-reply",
      jsonPost({
        conversationId: "conv-123",
        senderId: "agent-456",
        content: "Agent reply content",
        type: "text",
      }),
    );

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // Verify message was enqueued
    const len = await redis.llen(AGENT_REPLY_QUEUE);
    expect(len).toBe(1);

    const raw = await redis.rpop(AGENT_REPLY_QUEUE);
    const msg = JSON.parse(raw!);
    expect(msg.conversationId).toBe("conv-123");
    expect(msg.senderId).toBe("agent-456");
    expect(msg.content).toBe("Agent reply content");
    expect(msg.retries).toBe(0);
  });

  it("多次调用按顺序入队", async () => {
    await request("/internal/agent-reply", jsonPost({
      conversationId: "c1", senderId: "a1", content: "msg1",
    }));
    await request("/internal/agent-reply", jsonPost({
      conversationId: "c2", senderId: "a2", content: "msg2",
    }));

    const len = await redis.llen(AGENT_REPLY_QUEUE);
    expect(len).toBe(2);
  });
});

describe("POST /internal/cleanup-test-data", () => {
  const PREFIX = "e2e-smoke-";

  afterAll(async () => {
    // Safety cleanup
    await prisma.account.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it("无测试数据时返回 deleted: 0", async () => {
    const res = await request("/internal/cleanup-test-data", { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(0);
  });

  it("删除带前缀的账号及关联数据", async () => {
    // 创建两个测试账号
    const a1 = await prisma.account.create({
      data: { name: `${PREFIX}user1`, email: `${PREFIX}u1@test.com`, type: "human" },
    });
    const a2 = await prisma.account.create({
      data: { name: `${PREFIX}user2`, email: `${PREFIX}u2@test.com`, type: "agent" },
    });

    // 创建好友关系
    await prisma.friendship.create({
      data: { accountAId: a1.id, accountBId: a2.id, status: "accepted" },
    });

    // 创建会话和消息
    const [idA, idB] = [a1.id, a2.id].sort();
    const conv = await prisma.conversation.create({
      data: { type: "dm", targetId: `${idA}:${idB}` },
    });
    await prisma.message.create({
      data: {
        conversationId: conv.id,
        conversationType: "dm",
        senderId: a1.id,
        content: "hello",
      },
    });

    // 调用 cleanup
    const res = await request("/internal/cleanup-test-data", { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(2);

    // 验证数据已清除
    const accounts = await prisma.account.findMany({ where: { name: { startsWith: PREFIX } } });
    expect(accounts).toHaveLength(0);

    const msgs = await prisma.message.findMany({ where: { conversationId: conv.id } });
    expect(msgs).toHaveLength(0);

    const convs = await prisma.conversation.findMany({ where: { id: conv.id } });
    expect(convs).toHaveLength(0);

    const friends = await prisma.friendship.findMany({
      where: { OR: [{ accountAId: a1.id }, { accountBId: a1.id }] },
    });
    expect(friends).toHaveLength(0);
  });

  it("不影响非前缀账号", async () => {
    // 创建一个普通账号和一个测试账号
    const normal = await prisma.account.create({
      data: { name: "normal-user", email: `normal-${Date.now()}@test.com`, type: "human" },
    });
    const test = await prisma.account.create({
      data: { name: `${PREFIX}temp`, email: `${PREFIX}temp@test.com`, type: "human" },
    });

    const res = await request("/internal/cleanup-test-data", { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(1);

    // 普通账号仍在
    const found = await prisma.account.findUnique({ where: { id: normal.id } });
    expect(found).not.toBeNull();

    // 清理
    await prisma.account.delete({ where: { id: normal.id } });
  });
});
