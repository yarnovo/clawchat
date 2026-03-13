import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Mock external service clients before importing app
vi.mock("../im-client.js", () => ({
  registerAgentAccount: vi.fn(async ({ name, avatar }) => ({
    id: `im-account-${Date.now()}`,
    name,
    type: "agent",
    avatar,
  })),
  addDirectFriend: vi.fn(async () => {}),
  deleteAgentAccount: vi.fn(async () => {}),
}));

vi.mock("../openclaw-client.js", () => ({
  createInstance: vi.fn(async () => ({ containerId: "mock-container-123" })),
  startInstance: vi.fn(async () => {}),
  stopInstance: vi.fn(async () => {}),
  removeInstance: vi.fn(async () => {}),
  getInstanceStatus: vi.fn(async () => ({
    state: "running",
    gatewayConnected: true,
  })),
  chat: vi.fn(async () => "Hello from mock agent!"),
}));

import app from "../app.js";
import { prisma } from "../db.js";
import * as imClient from "../im-client.js";

const request = (path: string, init?: RequestInit) => {
  // Avoid trailing slash: "/" → "/v1/agents", "?q=x" → "/v1/agents?q=x"
  const suffix = path === "/" ? "" : path;
  return app.request(`/v1/agents${suffix}`, init);
};

const jsonReq = (method: string, body?: object) => ({
  method,
  headers: { "Content-Type": "application/json" },
  ...(body && { body: JSON.stringify(body) }),
});

const ts = Date.now();
const ownerId = `owner-${ts}`;
let agentId: string;

beforeAll(async () => {
  // Clean up any leftover test data
  await prisma.agentConfig.deleteMany({});
  await prisma.agent.deleteMany({});
});

afterAll(async () => {
  await prisma.agentConfig.deleteMany({});
  await prisma.agent.deleteMany({});
  await prisma.$disconnect();
});

describe("Health", () => {
  it("GET /health 返回 ok", async () => {
    const res = await request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("Agent CRUD", () => {
  it("POST / 缺少必填字段返回 400", async () => {
    const res = await request("/", jsonReq("POST", { ownerId }));
    expect(res.status).toBe(400);
  });

  it("POST / 创建 Agent 成功", async () => {
    const res = await request(
      "/",
      jsonReq("POST", {
        ownerId,
        name: "TestBot",
        avatar: "🤖",
        model: "gpt-4o",
      }),
    );
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.name).toBe("TestBot");
    expect(body.avatar).toBe("🤖");
    expect(body.ownerId).toBe(ownerId);
    expect(body.config).toBeDefined();
    expect(body.config.model).toBe("gpt-4o");

    // im-client should have been called
    expect(imClient.registerAgentAccount).toHaveBeenCalledWith({
      name: "TestBot",
      avatar: "🤖",
    });
    expect(imClient.addDirectFriend).toHaveBeenCalledWith(
      ownerId,
      body.accountId,
    );

    agentId = body.id;
  });

  it("POST / 默认 model 是 gpt-4o", async () => {
    const res = await request(
      "/",
      jsonReq("POST", { ownerId, name: "DefaultModelBot" }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.config.model).toBe("gpt-4o");
    // Clean up
    await prisma.agent.delete({ where: { id: body.id } });
  });

  it("GET /?ownerId= 列出当前用户的 Agent", async () => {
    const res = await request(`?ownerId=${ownerId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(1);
    expect(body[0].ownerId).toBe(ownerId);
  });

  it("GET / 缺少 ownerId 返回 400", async () => {
    const res = await request("/");
    expect(res.status).toBe(400);
  });

  it("GET /:id 获取 Agent 详情", async () => {
    const res = await request(`/${agentId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(agentId);
    expect(body.config).toBeDefined();
  });

  it("GET /:id 不存在返回 404", async () => {
    const res = await request("/nonexistent-id");
    expect(res.status).toBe(404);
  });

  it("PATCH /:id 更新 Agent", async () => {
    const res = await request(
      `/${agentId}`,
      jsonReq("PATCH", { name: "UpdatedBot", model: "claude-sonnet-4-6" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("UpdatedBot");
    expect(body.config.model).toBe("claude-sonnet-4-6");
  });

  it("PATCH /:id 不存在返回 404", async () => {
    const res = await request(
      "/nonexistent-id",
      jsonReq("PATCH", { name: "test" }),
    );
    expect(res.status).toBe(404);
  });

  it("DELETE /:id 删除 Agent", async () => {
    const res = await request(`/${agentId}`, { method: "DELETE" });
    expect(res.status).toBe(200);

    // Verify deleted
    const check = await request(`/${agentId}`);
    expect(check.status).toBe(404);
  });

  it("DELETE /:id 不存在返回 404", async () => {
    const res = await request("/nonexistent-id", { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});

describe("Agent Lifecycle", () => {
  let lifecycleAgentId: string;

  beforeAll(async () => {
    const res = await request(
      "/",
      jsonReq("POST", {
        ownerId,
        name: "LifecycleBot",
        apiKey: "sk-test-key",
      }),
    );
    const body = await res.json();
    lifecycleAgentId = body.id;
  });

  afterAll(async () => {
    await prisma.agent
      .delete({ where: { id: lifecycleAgentId } })
      .catch(() => {});
  });

  it("POST /:id/start 启动 Agent", async () => {
    const res = await request(`/${lifecycleAgentId}/start`, { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.containerId).toBe("mock-container-123");

    // Verify status updated in DB
    const config = await prisma.agentConfig.findUnique({
      where: { agentId: lifecycleAgentId },
    });
    expect(config?.status).toBe("running");
    expect(config?.startedAt).toBeDefined();
  });

  it("POST /:id/stop 停止 Agent", async () => {
    const res = await request(`/${lifecycleAgentId}/stop`, { method: "POST" });
    expect(res.status).toBe(200);

    const config = await prisma.agentConfig.findUnique({
      where: { agentId: lifecycleAgentId },
    });
    expect(config?.status).toBe("stopped");
    expect(config?.stoppedAt).toBeDefined();
  });

  it("POST /:id/start 没有 apiKey 返回 400", async () => {
    // Create agent without apiKey
    const createRes = await request(
      "/",
      jsonReq("POST", { ownerId, name: "NoKeyBot" }),
    );
    const agent = await createRes.json();

    const res = await request(`/${agent.id}/start`, { method: "POST" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("API key");

    await prisma.agent.delete({ where: { id: agent.id } });
  });

  it("POST /:id/chat 需要 message", async () => {
    const res = await request(
      `/${lifecycleAgentId}/chat`,
      jsonReq("POST", {}),
    );
    expect(res.status).toBe(400);
  });

  it("POST /:id/chat Agent 非 running 返回 400", async () => {
    // Agent is currently stopped
    const res = await request(
      `/${lifecycleAgentId}/chat`,
      jsonReq("POST", { message: "Hello" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("not running");
  });
});
