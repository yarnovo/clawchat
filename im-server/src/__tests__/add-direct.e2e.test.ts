import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import { prisma } from "../db.js";

const request = (path: string, init?: RequestInit) =>
  app.request(`/v1/im${path}`, init);

const jsonPost = (body: object) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const ts = Date.now();
let accountAId: string;
let accountBId: string;

beforeAll(async () => {
  // 清理之前的测试数据
  const emails = [`add-direct-a-${ts}@test.com`, `add-direct-b-${ts}@test.com`];
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { accountA: { email: { in: emails } } },
        { accountB: { email: { in: emails } } },
      ],
    },
  });
  await prisma.account.deleteMany({
    where: { email: { in: emails } },
  });

  // 通过注册接口创建两个账号
  const resA = await request("/auth/register", jsonPost({
    name: "DirectA",
    email: `add-direct-a-${ts}@test.com`,
    password: "123456",
  }));
  const bodyA = await resA.json();
  accountAId = bodyA.account.id;

  const resB = await request("/auth/register", jsonPost({
    name: "DirectB",
    email: `add-direct-b-${ts}@test.com`,
    password: "123456",
  }));
  const bodyB = await resB.json();
  accountBId = bodyB.account.id;
});

afterAll(async () => {
  // 清理
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { accountAId, accountBId },
        { accountAId: accountBId, accountBId: accountAId },
      ],
    },
  });
  const emails = [`add-direct-a-${ts}@test.com`, `add-direct-b-${ts}@test.com`];
  await prisma.account.deleteMany({
    where: { email: { in: emails } },
  });
  await prisma.$disconnect();
});

describe("/friends/add-direct", () => {
  it("缺少 accountAId → 400", async () => {
    const res = await request(
      "/friends/add-direct",
      jsonPost({ accountBId: "some-id" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("required");
  });

  it("缺少 accountBId → 400", async () => {
    const res = await request(
      "/friends/add-direct",
      jsonPost({ accountAId: "some-id" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("required");
  });

  it("首次调用建立好友关系 → 201", async () => {
    const res = await request(
      "/friends/add-direct",
      jsonPost({ accountAId, accountBId }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("accepted");
    expect(body.accountAId).toBe(accountAId);
    expect(body.accountBId).toBe(accountBId);
  });

  it("重复调用已 accepted → 返回已有记录（200）", async () => {
    const res = await request(
      "/friends/add-direct",
      jsonPost({ accountAId, accountBId }),
    );
    // 已有 accepted 记录直接返回（默认 200）
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("accepted");
  });

  it("反向调用（B→A）已 accepted → 返回已有记录", async () => {
    const res = await request(
      "/friends/add-direct",
      jsonPost({ accountAId: accountBId, accountBId: accountAId }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("accepted");
  });

  it("pending 状态被升级为 accepted", async () => {
    // 先删除现有关系
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { accountAId, accountBId },
          { accountAId: accountBId, accountBId: accountAId },
        ],
      },
    });

    // 手动创建 pending 状态的 friendship
    await prisma.friendship.create({
      data: {
        accountAId,
        accountBId,
        status: "pending",
      },
    });

    // 调用 add-direct 应该将 pending 升级为 accepted
    const res = await request(
      "/friends/add-direct",
      jsonPost({ accountAId, accountBId }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("accepted");

    // 验证数据库中状态确实更新了
    const record = await prisma.friendship.findFirst({
      where: {
        OR: [
          { accountAId, accountBId },
          { accountAId: accountBId, accountBId: accountAId },
        ],
      },
    });
    expect(record?.status).toBe("accepted");
  });
});
