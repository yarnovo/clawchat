import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const OPENCLAW_BASE = "http://localhost:3003";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

async function loadClient() {
  return await import("../openclaw-client.js");
}

describe("createInstance", () => {
  it("正常返回 201 → 解析 containerId", async () => {
    server.use(
      http.post(`${OPENCLAW_BASE}/v1/openclaw/instances`, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;
        expect(body.agentId).toBe("agent-1");
        expect(body.model).toBe("gpt-4o");
        return HttpResponse.json({ containerId: "ctr-abc123" }, { status: 201 });
      }),
    );

    const { createInstance } = await loadClient();
    const result = await createInstance({
      agentId: "agent-1",
      accountId: "acc-1",
      model: "gpt-4o",
      apiKey: "sk-test",
    });
    expect(result).toEqual({ containerId: "ctr-abc123" });
  });

  it("服务端报错 → 抛出错误", async () => {
    server.use(
      http.post(`${OPENCLAW_BASE}/v1/openclaw/instances`, () => {
        return HttpResponse.json({ error: "Quota exceeded" }, { status: 429 });
      }),
    );

    const { createInstance } = await loadClient();
    await expect(
      createInstance({ agentId: "agent-1", accountId: "acc-1", model: "gpt-4o", apiKey: "sk-test" }),
    ).rejects.toThrow("Quota exceeded");
  });

  it("无 error 字段 → 使用默认错误信息", async () => {
    server.use(
      http.post(`${OPENCLAW_BASE}/v1/openclaw/instances`, () => {
        return HttpResponse.json({}, { status: 500 });
      }),
    );

    const { createInstance } = await loadClient();
    await expect(
      createInstance({ agentId: "agent-1", accountId: "acc-1", model: "gpt-4o", apiKey: "sk-test" }),
    ).rejects.toThrow("Failed to create OpenClaw instance");
  });
});

describe("startInstance", () => {
  it("正常返回 200 → resolve", async () => {
    server.use(
      http.post(`${OPENCLAW_BASE}/v1/openclaw/instances/agent-1/start`, () => {
        return HttpResponse.json({ ok: true }, { status: 200 });
      }),
    );

    const { startInstance } = await loadClient();
    await expect(startInstance("agent-1")).resolves.toBeUndefined();
  });

  it("失败 → 抛出错误", async () => {
    server.use(
      http.post(`${OPENCLAW_BASE}/v1/openclaw/instances/agent-1/start`, () => {
        return HttpResponse.json({ error: "Container not found" }, { status: 404 });
      }),
    );

    const { startInstance } = await loadClient();
    await expect(startInstance("agent-1")).rejects.toThrow("Container not found");
  });
});

describe("stopInstance", () => {
  it("正常返回 200 → resolve", async () => {
    server.use(
      http.post(`${OPENCLAW_BASE}/v1/openclaw/instances/agent-1/stop`, () => {
        return HttpResponse.json({ ok: true }, { status: 200 });
      }),
    );

    const { stopInstance } = await loadClient();
    await expect(stopInstance("agent-1")).resolves.toBeUndefined();
  });

  it("失败 → 抛出错误", async () => {
    server.use(
      http.post(`${OPENCLAW_BASE}/v1/openclaw/instances/agent-1/stop`, () => {
        return HttpResponse.json({ error: "Already stopped" }, { status: 400 });
      }),
    );

    const { stopInstance } = await loadClient();
    await expect(stopInstance("agent-1")).rejects.toThrow("Already stopped");
  });
});

describe("removeInstance", () => {
  it("正常返回 200 → resolve", async () => {
    server.use(
      http.delete(`${OPENCLAW_BASE}/v1/openclaw/instances/agent-1`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("removeData")).toBe("false");
        return HttpResponse.json({ ok: true }, { status: 200 });
      }),
    );

    const { removeInstance } = await loadClient();
    await expect(removeInstance("agent-1")).resolves.toBeUndefined();
  });

  it("removeData=true 参数正确传递", async () => {
    server.use(
      http.delete(`${OPENCLAW_BASE}/v1/openclaw/instances/agent-1`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("removeData")).toBe("true");
        return HttpResponse.json({ ok: true }, { status: 200 });
      }),
    );

    const { removeInstance } = await loadClient();
    await expect(removeInstance("agent-1", true)).resolves.toBeUndefined();
  });

  it("失败 → 抛出错误", async () => {
    server.use(
      http.delete(`${OPENCLAW_BASE}/v1/openclaw/instances/agent-1`, () => {
        return HttpResponse.json({ error: "Permission denied" }, { status: 403 });
      }),
    );

    const { removeInstance } = await loadClient();
    await expect(removeInstance("agent-1")).rejects.toThrow("Permission denied");
  });
});

describe("getInstanceStatus", () => {
  it("返回实例状态", async () => {
    server.use(
      http.get(`${OPENCLAW_BASE}/v1/openclaw/instances/agent-1`, () => {
        return HttpResponse.json({ state: "running", gatewayConnected: true }, { status: 200 });
      }),
    );

    const { getInstanceStatus } = await loadClient();
    const status = await getInstanceStatus("agent-1");
    expect(status).toEqual({ state: "running", gatewayConnected: true });
  });
});

describe("chat", () => {
  it("正常返回 202 → resolve", async () => {
    server.use(
      http.post(`${OPENCLAW_BASE}/v1/openclaw/instances/agent-1/chat`, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;
        expect(body.message).toBe("Hello");
        expect(body.sessionKey).toBe("sess-1");
        return HttpResponse.json({ ok: true }, { status: 202 });
      }),
    );

    const { chat } = await loadClient();
    await expect(chat({
      agentId: "agent-1",
      message: "Hello",
      sessionKey: "sess-1",
      senderId: "user-1",
    })).resolves.toBeUndefined();
  });

  it("失败 → 抛出错误", async () => {
    server.use(
      http.post(`${OPENCLAW_BASE}/v1/openclaw/instances/agent-1/chat`, () => {
        return HttpResponse.json({ error: "Agent timeout" }, { status: 504 });
      }),
    );

    const { chat } = await loadClient();
    await expect(chat({ agentId: "agent-1", message: "Hello" })).rejects.toThrow("Agent timeout");
  });

  it("无 error 字段 → 使用默认错误信息", async () => {
    server.use(
      http.post(`${OPENCLAW_BASE}/v1/openclaw/instances/agent-1/chat`, () => {
        return HttpResponse.json({}, { status: 500 });
      }),
    );

    const { chat } = await loadClient();
    await expect(chat({ agentId: "agent-1", message: "Hello" })).rejects.toThrow("Chat failed");
  });
});
