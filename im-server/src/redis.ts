import Redis from "ioredis";

const REDIS_URL = process.env["REDIS_URL"] || "redis://localhost:6379";

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 200, 3000),
});

// Agent reply queue key
export const AGENT_REPLY_QUEUE = "clawchat:agent-reply:queue";
// Dead letter queue for failed messages
export const AGENT_REPLY_DLQ = "clawchat:agent-reply:dlq";
