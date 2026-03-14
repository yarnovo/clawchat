import { describe, it, expect, vi } from "vitest";

// Mock instance module (depends on container-server + WebSocket)
vi.mock("../instance.js", () => ({
  createInstance: vi.fn(async () => ({ containerId: "mock-container-123" })),
  getInstanceStatus: vi.fn(async () => ({
    state: "running",
    gatewayConnected: true,
  })),
  startInstance: vi.fn(async () => {}),
  stopInstance: vi.fn(async () => {}),
  removeInstance: vi.fn(async () => {}),
  getInstanceLogs: vi.fn(async () => "mock openclaw logs"),
  chat: vi.fn(async () => "Hello from OpenClaw!"),
}));

import app from "../app.js";

const request = (path: string, init?: RequestInit) => {
  const url = path === "/" ? "/v1/openclaw" : `/v1/openclaw${path}`;
  return app.request(url, init);
};

const jsonReq = (method: string, body?: object) => ({
  method,
  headers: { "Content-Type": "application/json" },
  ...(body && { body: JSON.stringify(body) }),
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

describe("Instances", () => {
  it("POST /instances 缺少必填字段返回 400", async () => {
    const res = await request(
      "/instances",
      jsonReq("POST", { agentId: "test" }),
    );
    expect(res.status).toBe(400);
  });

  it("POST /instances 创建实例成功", async () => {
    const res = await request(
      "/instances",
      jsonReq("POST", {
        agentId: "agent-1",
        accountId: "account-1",
        model: "gpt-4o",
        apiKey: "sk-test",
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.containerId).toBe("mock-container-123");
  });

  it("GET /instances/:agentId 获取状态", async () => {
    const res = await request("/instances/agent-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.state).toBe("running");
  });

  it("POST /instances/:agentId/start 启动实例", async () => {
    const res = await request("/instances/agent-1/start", { method: "POST" });
    expect(res.status).toBe(200);
  });

  it("POST /instances/:agentId/stop 停止实例", async () => {
    const res = await request("/instances/agent-1/stop", { method: "POST" });
    expect(res.status).toBe(200);
  });

  it("DELETE /instances/:agentId 删除实例", async () => {
    const res = await request("/instances/agent-1", { method: "DELETE" });
    expect(res.status).toBe(200);
  });

  it("GET /instances/:agentId/logs 获取日志", async () => {
    const res = await request("/instances/agent-1/logs");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.logs).toBe("mock openclaw logs");
  });
});

describe("Chat", () => {
  it("POST /instances/:agentId/chat 缺少 message 返回 400", async () => {
    const res = await request(
      "/instances/agent-1/chat",
      jsonReq("POST", {}),
    );
    expect(res.status).toBe(400);
  });

  it("POST /instances/:agentId/chat 发送消息成功", async () => {
    const res = await request(
      "/instances/agent-1/chat",
      jsonReq("POST", { message: "Hello" }),
    );
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
