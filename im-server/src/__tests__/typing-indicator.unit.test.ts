import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import type { AppEnv } from "../env.js";

// Mock prisma
vi.mock("../db.js", () => ({
  prisma: {
    conversation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
    account: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock WebSocket push
vi.mock("../ws.js", () => ({
  pushToConversationParticipants: vi.fn(),
}));

// Mock auth middleware — inject accountId directly
vi.mock("../auth.js", () => ({
  authMiddleware: vi.fn(async (c: any, next: any) => {
    c.set("accountId", "user-1");
    c.set("accountType", "human");
    await next();
  }),
}));

import { prisma } from "../db.js";
import { pushToConversationParticipants } from "../ws.js";
import messages from "../routes/messages.js";

// Wrap the route in a Hono app for testing
const app = new Hono<AppEnv>();
app.route("/messages", messages);

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const dmConversation = {
  id: "conv-1",
  type: "dm",
  targetId: "user-1:agent-account-1",
  updatedAt: new Date(),
};

const nonAgentConversation = {
  id: "conv-2",
  type: "dm",
  targetId: "user-1:user-2",
  updatedAt: new Date(),
};

const createdMessage = {
  id: "msg-1",
  conversationId: "conv-1",
  senderId: "user-1",
  content: "你好",
  type: "text",
  sender: { id: "user-1", name: "测试用户", avatar: "🐱", type: "human" },
};

function postMessage(body: object) {
  return app.request("/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer fake" },
    body: JSON.stringify(body),
  });
}

// Wait for fire-and-forget async tasks to settle
function flushAsync() {
  return new Promise((r) => setTimeout(r, 50));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.conversation.update).mockResolvedValue(dmConversation as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Typing indicator — forwardToAgent", () => {
  it("发消息给 Agent 后推送 typing 事件", async () => {
    // Conversation with an agent peer
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue(dmConversation as never);
    vi.mocked(prisma.message.create).mockResolvedValue(createdMessage as never);
    // Peer is an agent
    vi.mocked(prisma.account.findUnique).mockImplementation(((args: { where: { id: string } }) => {
      if (args.where.id === "agent-account-1") {
        return Promise.resolve({ id: "agent-account-1", name: "小助手", type: "agent" });
      }
      if (args.where.id === "user-1") {
        return Promise.resolve({ id: "user-1", name: "测试用户", type: "human" });
      }
      return Promise.resolve(null);
    }) as any);

    // Mock agent-server responses
    mockFetch
      // 1st call: GET /v1/agents?accountId=agent-account-1
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: "agent-uuid-1", name: "小助手" }]),
      })
      // 2nd call: POST /v1/agents/:id/chat
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      });

    const res = await postMessage({ conversationId: "conv-1", content: "你好" });
    expect(res.status).toBe(201);

    // Wait for fire-and-forget forwardToAgent to complete
    await flushAsync();

    // Verify typing indicator was pushed
    expect(pushToConversationParticipants).toHaveBeenCalledWith(
      "user-1:agent-account-1",
      { type: "typing", data: { conversationId: "conv-1", senderId: "agent-account-1" } },
      "agent-account-1",
    );
  });

  it("Agent 服务不可用时不影响消息发送", async () => {
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue(dmConversation as never);
    vi.mocked(prisma.message.create).mockResolvedValue(createdMessage as never);
    vi.mocked(prisma.account.findUnique).mockImplementation(((args: { where: { id: string } }) => {
      if (args.where.id === "agent-account-1") {
        return Promise.resolve({ id: "agent-account-1", name: "小助手", type: "agent" });
      }
      if (args.where.id === "user-1") {
        return Promise.resolve({ id: "user-1", name: "测试用户", type: "human" });
      }
      return Promise.resolve(null);
    }) as any);

    // Agent server is down
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const res = await postMessage({ conversationId: "conv-1", content: "你好" });
    // Message still created successfully
    expect(res.status).toBe(201);

    await flushAsync();

    // No typing event pushed when agent-server is unreachable
    expect(pushToConversationParticipants).not.toHaveBeenCalled();
  });

  it("发消息给普通用户不触发 typing 指示器", async () => {
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue(nonAgentConversation as never);
    vi.mocked(prisma.message.create).mockResolvedValue({
      ...createdMessage,
      conversationId: "conv-2",
    } as never);
    // Peer is a normal user
    vi.mocked(prisma.account.findUnique).mockResolvedValue({
      id: "user-2",
      name: "普通用户",
      type: "human",
    } as never);

    const res = await postMessage({ conversationId: "conv-2", content: "你好" });
    expect(res.status).toBe(201);

    await flushAsync();

    // No fetch to agent-server, no typing event
    expect(mockFetch).not.toHaveBeenCalled();
    expect(pushToConversationParticipants).not.toHaveBeenCalled();
  });

  it("Agent 查询返回空时不推送 typing", async () => {
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue(dmConversation as never);
    vi.mocked(prisma.message.create).mockResolvedValue(createdMessage as never);
    vi.mocked(prisma.account.findUnique).mockImplementation(((args: { where: { id: string } }) => {
      if (args.where.id === "agent-account-1") {
        return Promise.resolve({ id: "agent-account-1", name: "小助手", type: "agent" });
      }
      if (args.where.id === "user-1") {
        return Promise.resolve({ id: "user-1", name: "测试用户", type: "human" });
      }
      return Promise.resolve(null);
    }) as any);

    // Agent lookup returns empty list
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const res = await postMessage({ conversationId: "conv-1", content: "你好" });
    expect(res.status).toBe(201);

    await flushAsync();

    // Only one fetch (lookup), no chat call, no typing push
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(pushToConversationParticipants).not.toHaveBeenCalled();
  });

  it("Chat 请求返回 202 也推送 typing", async () => {
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue(dmConversation as never);
    vi.mocked(prisma.message.create).mockResolvedValue(createdMessage as never);
    vi.mocked(prisma.account.findUnique).mockImplementation(((args: { where: { id: string } }) => {
      if (args.where.id === "agent-account-1") {
        return Promise.resolve({ id: "agent-account-1", name: "小助手", type: "agent" });
      }
      if (args.where.id === "user-1") {
        return Promise.resolve({ id: "user-1", name: "测试用户", type: "human" });
      }
      return Promise.resolve(null);
    }) as any);

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: "agent-uuid-1" }]),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 202,
      });

    const res = await postMessage({ conversationId: "conv-1", content: "你好" });
    expect(res.status).toBe(201);

    await flushAsync();

    expect(pushToConversationParticipants).toHaveBeenCalledWith(
      "user-1:agent-account-1",
      { type: "typing", data: { conversationId: "conv-1", senderId: "agent-account-1" } },
      "agent-account-1",
    );
  });
});
