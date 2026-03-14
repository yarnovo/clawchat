import { Registry, Counter, Histogram, collectDefaultMetrics } from "prom-client";

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

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

export const sagaOutcome = new Counter({
  name: "saga_outcome_total",
  help: "Saga execution outcomes",
  labelNames: ["saga", "result"],  // result: success | failed | compensated
  registers: [registry],
});

export const sagaStepDuration = new Histogram({
  name: "saga_step_duration_seconds",
  help: "Duration of each saga step",
  labelNames: ["saga", "step"],
  buckets: [0.1, 0.5, 1, 5, 10, 30],
  registers: [registry],
});
