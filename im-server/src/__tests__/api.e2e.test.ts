import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import { prisma } from "../db.js";

const request = (path: string, init?: RequestInit) =>
  app.request(`/v1/im${path}`, init);

const json = (body: object) => ({
  method: "POST" as const,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const testEmail = `e2e-${Date.now()}@test.com`;
let token: string;

beforeAll(async () => {
  // 清理可能残留的测试数据
  await prisma.account.deleteMany({ where: { email: testEmail } });
});

afterAll(async () => {
  await prisma.account.deleteMany({ where: { email: testEmail } });
  await prisma.$disconnect();
});

describe("Health", () => {
  it("GET /health 返回 200", async () => {
    const res = await request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.checks).toBeDefined();
  });
});

describe("Auth", () => {
  it("注册成功", async () => {
    const res = await request(
      "/auth/register",
      json({ name: "测试用户", email: testEmail, password: "123456" }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(body.account.name).toBe("测试用户");
    expect(body.account.type).toBe("human");
  });

  it("重复注册返回 409", async () => {
    const res = await request(
      "/auth/register",
      json({ name: "重复", email: testEmail, password: "123456" }),
    );
    expect(res.status).toBe(409);
  });

  it("缺少字段返回 400", async () => {
    const res = await request(
      "/auth/register",
      json({ name: "缺密码", email: "no-pass@test.com" }),
    );
    expect(res.status).toBe(400);
  });

  it("登录成功", async () => {
    const res = await request(
      "/auth/login",
      json({ email: testEmail, password: "123456" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    token = body.token;
  });

  it("错误密码返回 401", async () => {
    const res = await request(
      "/auth/login",
      json({ email: testEmail, password: "wrong" }),
    );
    expect(res.status).toBe(401);
  });

  it("不存在的邮箱返回 401", async () => {
    const res = await request(
      "/auth/login",
      json({ email: "nobody@test.com", password: "123456" }),
    );
    expect(res.status).toBe(401);
  });
});

describe("Accounts", () => {
  it("无 token 返回 401", async () => {
    const res = await request("/accounts/me");
    expect(res.status).toBe(401);
  });

  it("GET /accounts/me 返回当前用户", async () => {
    const res = await request("/accounts/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("测试用户");
    expect(body.email).toBe(testEmail);
  });

  it("PATCH /accounts/me 更新用户名", async () => {
    const res = await request("/accounts/me", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: "新名字" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("新名字");
  });
});
