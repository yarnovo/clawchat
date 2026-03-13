import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

// Default IM_SERVER_URL from im-client.ts
const IM_BASE = "http://localhost:3000";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Dynamic import so the module picks up the msw interceptors
async function loadImClient() {
  // Each test file shares the same module instance, which is fine
  return await import("../im-client.js");
}

describe("registerAgentAccount", () => {
  it("正常返回 → 解析 body.account", async () => {
    const mockAccount = { id: "acc-1", name: "TestBot", type: "agent", avatar: "https://img.png" };

    server.use(
      http.post(`${IM_BASE}/v1/im/auth/register-agent`, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;
        expect(body.name).toBe("TestBot");
        expect(body.avatar).toBe("https://img.png");
        return HttpResponse.json({ account: mockAccount }, { status: 200 });
      }),
    );

    const { registerAgentAccount } = await loadImClient();
    const result = await registerAgentAccount({ name: "TestBot", avatar: "https://img.png" });
    expect(result).toEqual(mockAccount);
  });

  it("服务端报错 → 抛出错误", async () => {
    server.use(
      http.post(`${IM_BASE}/v1/im/auth/register-agent`, () => {
        return HttpResponse.json({ error: "Name already taken" }, { status: 409 });
      }),
    );

    const { registerAgentAccount } = await loadImClient();
    await expect(registerAgentAccount({ name: "DupBot" })).rejects.toThrow("Name already taken");
  });

  it("服务端返回无 error 字段的错误 → 抛出 status 信息", async () => {
    server.use(
      http.post(`${IM_BASE}/v1/im/auth/register-agent`, () => {
        return HttpResponse.json({}, { status: 500 });
      }),
    );

    const { registerAgentAccount } = await loadImClient();
    await expect(registerAgentAccount({ name: "FailBot" })).rejects.toThrow("im-server returned 500");
  });
});

describe("addDirectFriend", () => {
  it("正常返回 → resolve", async () => {
    server.use(
      http.post(`${IM_BASE}/v1/im/friends/add-direct`, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;
        expect(body.accountAId).toBe("owner-1");
        expect(body.accountBId).toBe("agent-1");
        return HttpResponse.json({ id: "friendship-1", status: "accepted" }, { status: 201 });
      }),
    );

    const { addDirectFriend } = await loadImClient();
    await expect(addDirectFriend("owner-1", "agent-1")).resolves.toBeUndefined();
  });

  it("失败 → 抛出错误", async () => {
    server.use(
      http.post(`${IM_BASE}/v1/im/friends/add-direct`, () => {
        return HttpResponse.json({ error: "accountAId and accountBId are required" }, { status: 400 });
      }),
    );

    const { addDirectFriend } = await loadImClient();
    await expect(addDirectFriend("", "")).rejects.toThrow("accountAId and accountBId are required");
  });
});

describe("deleteAgentAccount", () => {
  it("正常返回 → resolve", async () => {
    server.use(
      http.delete(`${IM_BASE}/v1/im/accounts/acc-1`, () => {
        return HttpResponse.json({ ok: true }, { status: 200 });
      }),
    );

    const { deleteAgentAccount } = await loadImClient();
    await expect(deleteAgentAccount("acc-1")).resolves.toBeUndefined();
  });

  it("404 → 不抛错（特殊逻辑：账号不存在视为成功）", async () => {
    server.use(
      http.delete(`${IM_BASE}/v1/im/accounts/nonexistent`, () => {
        return HttpResponse.json({ error: "Not found" }, { status: 404 });
      }),
    );

    const { deleteAgentAccount } = await loadImClient();
    await expect(deleteAgentAccount("nonexistent")).resolves.toBeUndefined();
  });

  it("500 → 抛出错误", async () => {
    server.use(
      http.delete(`${IM_BASE}/v1/im/accounts/acc-err`, () => {
        return HttpResponse.json({ error: "Internal server error" }, { status: 500 });
      }),
    );

    const { deleteAgentAccount } = await loadImClient();
    await expect(deleteAgentAccount("acc-err")).rejects.toThrow("Internal server error");
  });
});
