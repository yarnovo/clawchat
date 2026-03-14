import { redis, AGENT_REPLY_QUEUE, AGENT_REPLY_DLQ } from "./redis.js";
import { prisma } from "./db.js";
import { pushToConversationParticipants } from "./ws.js";
import type { MessageType } from "./generated/prisma/client.js";

const MAX_RETRIES = 5;
const POLL_INTERVAL = 500; // ms

export interface AgentReplyMessage {
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  retries?: number;
  enqueuedAt?: number;
}

// Process a single agent reply message
export async function processAgentReply(
  msg: AgentReplyMessage,
): Promise<void> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: msg.conversationId },
  });

  if (!conversation) {
    console.error(
      `[agent-reply-worker] conversation ${msg.conversationId} not found, dropping message`,
    );
    return;
  }

  const message = await prisma.message.create({
    data: {
      conversationId: msg.conversationId,
      conversationType: conversation.type,
      senderId: msg.senderId,
      content: msg.content,
      type: (msg.type || "text") as MessageType,
    },
    include: {
      sender: {
        select: { id: true, name: true, avatar: true, type: true },
      },
    },
  });

  await prisma.conversation.update({
    where: { id: msg.conversationId },
    data: { updatedAt: new Date() },
  });

  pushToConversationParticipants(conversation.targetId, {
    type: "new_message",
    data: message,
  });
}

// Enqueue an agent reply message
export async function enqueueAgentReply(
  msg: AgentReplyMessage,
): Promise<void> {
  const payload = { ...msg, retries: 0, enqueuedAt: Date.now() };
  await redis.lpush(AGENT_REPLY_QUEUE, JSON.stringify(payload));
}

// Start the background worker loop
export function startAgentReplyWorker(): void {
  console.log("[agent-reply-worker] started");
  poll();
}

async function poll(): Promise<void> {
  while (true) {
    try {
      // Blocking pop with 1s timeout
      const result = await redis.brpop(AGENT_REPLY_QUEUE, 1);
      if (!result) continue;

      const raw = result[1];
      const msg: AgentReplyMessage = JSON.parse(raw);

      try {
        await processAgentReply(msg);
      } catch (err) {
        const retries = (msg.retries || 0) + 1;
        if (retries >= MAX_RETRIES) {
          console.error(
            `[agent-reply-worker] max retries reached, moving to DLQ:`,
            err,
          );
          await redis.lpush(AGENT_REPLY_DLQ, JSON.stringify({ ...msg, retries, lastError: String(err) }));
        } else {
          console.warn(
            `[agent-reply-worker] retry ${retries}/${MAX_RETRIES}:`,
            err,
          );
          // Re-enqueue with incremented retry count, delay via setTimeout
          const delay = Math.min(1000 * Math.pow(2, retries), 30000);
          setTimeout(async () => {
            await redis.lpush(
              AGENT_REPLY_QUEUE,
              JSON.stringify({ ...msg, retries }),
            );
          }, delay);
        }
      }
    } catch (err) {
      console.error("[agent-reply-worker] poll error:", err);
      // Avoid tight loop on Redis connection error
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    }
  }
}
