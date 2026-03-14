import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from "prom-client";

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

// HTTP metrics
export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [registry],
});

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [registry],
});

// Business metrics
export const wsConnectionsActive = new Gauge({
  name: "ws_connections_active",
  help: "Active WebSocket connections",
  registers: [registry],
});

export const agentReplyQueueDepth = new Gauge({
  name: "agent_reply_queue_depth",
  help: "Messages pending in agent reply queue",
  registers: [registry],
});

export const agentReplyDlqDepth = new Gauge({
  name: "agent_reply_dlq_depth",
  help: "Messages in dead letter queue",
  registers: [registry],
});

export const agentReplyProcessed = new Counter({
  name: "agent_reply_processed_total",
  help: "Agent replies processed",
  labelNames: ["result"],  // success | error | dlq
  registers: [registry],
});
