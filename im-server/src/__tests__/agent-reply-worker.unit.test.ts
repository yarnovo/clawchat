import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { redis, AGENT_REPLY_QUEUE, AGENT_REPLY_DLQ } from "../redis.js";
import {
  enqueueAgentReply,
  processAgentReply,
  type AgentReplyMessage,
} from "../agent-reply-worker.js";

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
  },
}));

// Mock WebSocket push
vi.mock("../ws.js", () => ({
  pushToConversationParticipants: vi.fn(),
}));

import { prisma } from "../db.js";
import { pushToConversationParticipants } from "../ws.js";

const mockConversation = {
  id: "conv-1",
  type: "agent",
  targetId: "user-1",
};

const mockMessage = {
  id: "msg-1",
  conversationId: "conv-1",
  senderId: "agent-1",
  content: "Hello from agent",
  type: "text",
  sender: { id: "agent-1", name: "TestAgent", avatar: "🤖", type: "agent" },
};

beforeEach(async () => {
  vi.clearAllMocks();
  // Clean Redis test keys
  await redis.del(AGENT_REPLY_QUEUE);
  await redis.del(AGENT_REPLY_DLQ);
});

afterEach(async () => {
  await redis.del(AGENT_REPLY_QUEUE);
  await redis.del(AGENT_REPLY_DLQ);
});

describe("enqueueAgentReply", () => {
  it("消息入队成功", async () => {
    const msg: AgentReplyMessage = {
      conversationId: "conv-1",
      senderId: "agent-1",
      content: "Hello",
      type: "text",
    };

    await enqueueAgentReply(msg);

    const len = await redis.llen(AGENT_REPLY_QUEUE);
    expect(len).toBe(1);

    const raw = await redis.rpop(AGENT_REPLY_QUEUE);
    const parsed = JSON.parse(raw!);
    expect(parsed.conversationId).toBe("conv-1");
    expect(parsed.content).toBe("Hello");
    expect(parsed.retries).toBe(0);
    expect(parsed.enqueuedAt).toBeTypeOf("number");
  });

  it("多条消息按顺序入队", async () => {
    await enqueueAgentReply({ conversationId: "c1", senderId: "a1", content: "first", type: "text" });
    await enqueueAgentReply({ conversationId: "c2", senderId: "a2", content: "second", type: "text" });

    const len = await redis.llen(AGENT_REPLY_QUEUE);
    expect(len).toBe(2);

    // RPOP gets oldest first (FIFO)
    const first = JSON.parse((await redis.rpop(AGENT_REPLY_QUEUE))!);
    expect(first.content).toBe("first");

    const second = JSON.parse((await redis.rpop(AGENT_REPLY_QUEUE))!);
    expect(second.content).toBe("second");
  });
});

describe("processAgentReply", () => {
  it("正常处理：写 DB + 推 WebSocket", async () => {
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue(mockConversation as never);
    vi.mocked(prisma.message.create).mockResolvedValue(mockMessage as never);
    vi.mocked(prisma.conversation.update).mockResolvedValue(mockConversation as never);

    await processAgentReply({
      conversationId: "conv-1",
      senderId: "agent-1",
      content: "Hello from agent",
      type: "text",
    });

    expect(prisma.conversation.findUnique).toHaveBeenCalledWith({
      where: { id: "conv-1" },
    });
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: {
        conversationId: "conv-1",
        conversationType: "agent",
        senderId: "agent-1",
        content: "Hello from agent",
        type: "text",
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true, type: true } },
      },
    });
    expect(pushToConversationParticipants).toHaveBeenCalledWith("user-1", {
      type: "new_message",
      data: mockMessage,
    });
  });

  it("会话不存在时跳过（不抛错）", async () => {
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue(null as never);

    // Should not throw
    await processAgentReply({
      conversationId: "nonexistent",
      senderId: "agent-1",
      content: "Hello",
      type: "text",
    });

    expect(prisma.message.create).not.toHaveBeenCalled();
    expect(pushToConversationParticipants).not.toHaveBeenCalled();
  });

  it("DB 写入失败时抛错（让 worker 重试）", async () => {
    vi.mocked(prisma.conversation.findUnique).mockResolvedValue(mockConversation as never);
    vi.mocked(prisma.message.create).mockRejectedValue(new Error("DB connection lost"));

    await expect(
      processAgentReply({
        conversationId: "conv-1",
        senderId: "agent-1",
        content: "Hello",
        type: "text",
      }),
    ).rejects.toThrow("DB connection lost");
  });
});
