import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import app from "../app.js";
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
