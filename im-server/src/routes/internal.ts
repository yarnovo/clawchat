import { Hono } from "hono";
import { enqueueAgentReply } from "../agent-reply-worker.js";

// Internal endpoints — no auth required
// Called by OpenClaw containers within Docker network
const internal = new Hono();

// Receive agent reply from OpenClaw container callback
// Enqueue to Redis for reliable processing
internal.post("/agent-reply", async (c) => {
  const { conversationId, senderId, content, type: msgType } = await c.req.json();

  if (!conversationId || !senderId || !content) {
    return c.json({ error: "conversationId, senderId, and content are required" }, 400);
  }

  await enqueueAgentReply({
    conversationId,
    senderId,
    content,
    type: msgType || "text",
  });

  return c.json({ ok: true }, 202);
});

export default internal;
