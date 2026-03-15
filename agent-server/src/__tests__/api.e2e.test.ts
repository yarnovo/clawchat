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
  createInstance: vi.fn(async () => ({ containerId: "mock-container-123", volumeName: "mock-vol-123" })),
  startInstance: vi.fn(async () => {}),
  stopInstance: vi.fn(async () => {}),
  removeInstance: vi.fn(async () => {}),
  getInstanceStatus: vi.fn(async () => ({
    state: "running",
    gatewayConnected: true,
  })),
  chat: vi.fn(async () => "Hello from mock agent!"),
}));

vi.mock("../nanoclaw-client.js", () => ({
  createInstance: vi.fn(async () => ({ containerId: "mock-nanoclaw-ctr-123", volumeName: "mock-nc-vol-123" })),
  startInstance: vi.fn(async () => {}),
  stopInstance: vi.fn(async () => {}),
  removeInstance: vi.fn(async () => {}),
  getInstanceStatus: vi.fn(async () => ({ state: "running" })),
  chat: vi.fn(async () => {}),
}));

import jwt from "jsonwebtoken";
import app from "../app.js";
import { prisma } from "../db.js";
import * as imClient from "../im-client.js";
import * as openclawClient from "../openclaw-client.js";
import * as nanoclawClient from "../nanoclaw-client.js";

const ts = Date.now();
const ownerId = `owner-${ts}`;
const token = jwt.sign({ sub: ownerId, type: "human" }, "clawchat-dev-secret", { expiresIn: "1h" });

const request = (path: string, init?: RequestInit) => {
  const suffix = path === "/" ? "" : path;
  return app.request(`/v1/agents${suffix}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
};

const jsonReq = (method: string, body?: object) => ({
  method,
  headers: { "Content-Type": "application/json" },
  ...(body && { body: JSON.stringify(body) }),
});
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
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.checks).toBeDefined();
  });
});

describe("Agent CRUD", () => {
  it("POST / 缺少必填字段返回 400", async () => {
    const res = await request("/", jsonReq("POST", {}));
    expect(res.status).toBe(400);
  });

  it("POST / 创建 Agent 成功", async () => {
    const res = await request(
      "/",
      jsonReq("POST", {
        name: "TestBot",
        avatar: "🤖",
        model: "qwen-max",
      }),
    );
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.name).toBe("TestBot");
    expect(body.avatar).toBe("🤖");
    expect(body.ownerId).toBe(ownerId);
    expect(body.config).toBeDefined();
    expect(body.config.model).toBe("qwen-max");

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

  it("POST / 默认 model 是 qwen-max", async () => {
    const res = await request(
      "/",
      jsonReq("POST", { name: "DefaultModelBot" }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.config.model).toBe("qwen-max");
    // Without apiKey, status should remain 'created'
    expect(body.config.status).toBe("created");
    // Clean up
    await prisma.agent.delete({ where: { id: body.id } });
  });

  it("POST / 带 apiKey 创建时自动启动容器", async () => {
    const res = await request(
      "/",
      jsonReq("POST", {
        name: "AutoStartBot",
        apiKey: "sk-test-auto",
        model: "qwen-max",
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();

    // Should have called openclaw createInstance
    expect(openclawClient.createInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: body.id,
        model: "qwen-max",
        apiKey: "sk-test-auto",
      }),
    );

    // Status should be running with containerId
    expect(body.config.status).toBe("running");
    expect(body.config.containerId).toBe("mock-container-123");
    expect(body.config.startedAt).toBeDefined();

    // Verify via GET API
    const detail = await request(`/${body.id}`);
    const detailBody = await detail.json();
    expect(detailBody.config.status).toBe("running");
    expect(detailBody.config.containerId).toBe("mock-container-123");

    // Clean up
    await prisma.agent.delete({ where: { id: body.id } });
  });

  it("POST / 带 apiKey 但容器启动失败 → Saga 回滚，返回 500", async () => {
    vi.mocked(openclawClient.createInstance).mockRejectedValueOnce(
      new Error("Container creation failed"),
    );

    const res = await request(
      "/",
      jsonReq("POST", {
        name: "FailStartBot",
        apiKey: "sk-test-fail",
      }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("start-container");

    // Saga rolled back — agent should NOT exist in DB
    const agents = await prisma.agent.findMany({
      where: { name: "FailStartBot" },
    });
    expect(agents.length).toBe(0);
  });

  it("GET / 列出当前用户的 Agent（基于 JWT token）", async () => {
    const res = await request("/");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(1);
    expect(body[0].ownerId).toBe(ownerId);
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
      jsonReq("POST", { name: "NoKeyBot" }),
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

  it("POST /:id/start openclaw-client 抛错 → 状态落为 error", async () => {
    // Ensure agent is in a startable state (not already running)
    await prisma.agentConfig.update({
      where: { agentId: lifecycleAgentId },
      data: { status: "stopped" },
    });

    // Make createInstance throw
    vi.mocked(openclawClient.createInstance).mockRejectedValueOnce(
      new Error("OpenClaw service unavailable"),
    );

    const res = await request(`/${lifecycleAgentId}/start`, { method: "POST" });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("OpenClaw service unavailable");

    // Verify status is 'error' in DB
    const config = await prisma.agentConfig.findUnique({
      where: { agentId: lifecycleAgentId },
    });
    expect(config?.status).toBe("error");
  });

  it("POST /:id/start 已 running 的 Agent 再次 start → 覆盖为新容器", async () => {
    // First, set the agent to running state
    await prisma.agentConfig.update({
      where: { agentId: lifecycleAgentId },
      data: { status: "running", containerId: "old-container" },
    });

    // Reset mock to succeed
    vi.mocked(openclawClient.createInstance).mockResolvedValueOnce({
      containerId: "new-container-456",
      volumeName: "new-vol-456",
    });

    const res = await request(`/${lifecycleAgentId}/start`, { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.containerId).toBe("new-container-456");

    // Verify status updated with new container
    const config = await prisma.agentConfig.findUnique({
      where: { agentId: lifecycleAgentId },
    });
    expect(config?.status).toBe("running");
    expect(config?.containerId).toBe("new-container-456");
  });

  it("POST /:id/stop 从未 start 过的 Agent → openclaw stop 抛错返回 500", async () => {
    // Create a brand new agent that has never been started
    const createRes = await request(
      "/",
      jsonReq("POST", { name: "NeverStartedBot", apiKey: "sk-key" }),
    );
    const agent = await createRes.json();

    // Make stopInstance throw (simulating the instance doesn't exist)
    vi.mocked(openclawClient.stopInstance).mockRejectedValueOnce(
      new Error("Instance not found"),
    );

    const res = await request(`/${agent.id}/stop`, { method: "POST" });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Instance not found");

    // Clean up
    await prisma.agent.delete({ where: { id: agent.id } }).catch(() => {});
  });
});

describe("NanoClaw Runtime", () => {
  let ncAgentId: string;

  afterAll(async () => {
    if (ncAgentId) {
      await prisma.agent.delete({ where: { id: ncAgentId } }).catch(() => {});
    }
  });

  it("POST / 创建 NanoClaw Agent — runtime=nanoclaw, 默认 model", async () => {
    const res = await request(
      "/",
      jsonReq("POST", {
        name: "NanoBot",
        avatar: "🐱",
        runtime: "nanoclaw",
      }),
    );
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.config.runtime).toBe("nanoclaw");
    expect(body.config.model).toBe("claude-sonnet-4-20250514");
    expect(body.config.status).toBe("created");
    expect(body.config.gatewayToken).toBeNull();

    ncAgentId = body.id;
  });

  it("GET / 列表返回 runtime 字段", async () => {
    const res = await request("/");
    expect(res.status).toBe(200);
    const agents = await res.json();
    const nc = agents.find((a: { id: string }) => a.id === ncAgentId);
    expect(nc).toBeDefined();
    expect(nc.config.runtime).toBe("nanoclaw");
  });

  it("POST / NanoClaw + apiKey 调用 nanoclawClient.createInstance", async () => {
    vi.mocked(nanoclawClient.createInstance).mockClear();
    vi.mocked(openclawClient.createInstance).mockClear();

    const res = await request(
      "/",
      jsonReq("POST", {
        name: "NanoAutoStart",
        apiKey: "sk-ant-test",
        runtime: "nanoclaw",
      }),
    );
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.config.status).toBe("running");
    expect(body.config.containerId).toBe("mock-nanoclaw-ctr-123");

    // Should route to nanoclaw, not openclaw
    expect(nanoclawClient.createInstance).toHaveBeenCalled();
    expect(openclawClient.createInstance).not.toHaveBeenCalled();

    await prisma.agent.delete({ where: { id: body.id } });
  });

  it("POST /:id/start NanoClaw Agent 调用 nanoclawClient", async () => {
    // Give the agent an apiKey first
    await prisma.agentConfig.update({
      where: { agentId: ncAgentId },
      data: { apiKey: "sk-ant-test" },
    });

    vi.mocked(nanoclawClient.createInstance).mockClear();
    vi.mocked(openclawClient.createInstance).mockClear();

    const res = await request(`/${ncAgentId}/start`, { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.containerId).toBe("mock-nanoclaw-ctr-123");

    expect(nanoclawClient.createInstance).toHaveBeenCalled();
    expect(openclawClient.createInstance).not.toHaveBeenCalled();
  });

  it("POST /:id/stop NanoClaw Agent 调用 nanoclawClient", async () => {
    vi.mocked(nanoclawClient.stopInstance).mockClear();
    vi.mocked(openclawClient.stopInstance).mockClear();

    const res = await request(`/${ncAgentId}/stop`, { method: "POST" });
    expect(res.status).toBe(200);

    expect(nanoclawClient.stopInstance).toHaveBeenCalled();
    expect(openclawClient.stopInstance).not.toHaveBeenCalled();
  });

  it("DELETE /:id NanoClaw Agent 调用 nanoclawClient.removeInstance", async () => {
    vi.mocked(nanoclawClient.removeInstance).mockClear();
    vi.mocked(openclawClient.removeInstance).mockClear();

    const res = await request(`/${ncAgentId}`, { method: "DELETE" });
    expect(res.status).toBe(200);

    expect(nanoclawClient.removeInstance).toHaveBeenCalled();
    expect(openclawClient.removeInstance).not.toHaveBeenCalled();

    ncAgentId = ""; // prevent afterAll cleanup
  });
});
