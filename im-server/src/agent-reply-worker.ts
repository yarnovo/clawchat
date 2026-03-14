import { redis, AGENT_REPLY_QUEUE, AGENT_REPLY_DLQ } from "./redis.js";
import { prisma } from "./db.js";
import { pushToConversationParticipants } from "./ws.js";
import { logger } from "./logger.js";
import { agentReplyProcessed, agentReplyQueueDepth, agentReplyDlqDepth } from "./metrics.js";
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
    logger.error(
      { conversationId: msg.conversationId },
      "agent-reply-worker: conversation not found, dropping message",
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

// Periodically update queue depth gauges
async function updateQueueDepthMetrics(): Promise<void> {
  try {
    const queueLen = await redis.llen(AGENT_REPLY_QUEUE);
    const dlqLen = await redis.llen(AGENT_REPLY_DLQ);
    agentReplyQueueDepth.set(queueLen);
    agentReplyDlqDepth.set(dlqLen);
  } catch {
    // Non-critical — metrics will be stale until next poll
  }
}

// Start the background worker loop
export function startAgentReplyWorker(): void {
  logger.info("agent-reply-worker started");
  // Update queue metrics every 10s
  setInterval(updateQueueDepthMetrics, 10_000);
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
        agentReplyProcessed.inc({ result: "success" });
      } catch (err) {
        const retries = (msg.retries || 0) + 1;
        if (retries >= MAX_RETRIES) {
          logger.error(
            { conversationId: msg.conversationId, retries, err },
            "agent-reply-worker: max retries reached, moving to DLQ",
          );
          await redis.lpush(AGENT_REPLY_DLQ, JSON.stringify({ ...msg, retries, lastError: String(err) }));
          agentReplyProcessed.inc({ result: "dlq" });
        } else {
          logger.warn(
            { conversationId: msg.conversationId, retries, maxRetries: MAX_RETRIES, err },
            "agent-reply-worker: retrying",
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
      logger.error({ err }, "agent-reply-worker: poll error");
      // Avoid tight loop on Redis connection error
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    }
  }
}
