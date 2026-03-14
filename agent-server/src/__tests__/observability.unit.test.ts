import { describe, it, expect } from "vitest";
import app from "../app.js";

describe("Observability", () => {
  describe("Request ID middleware", () => {
    it("生成 x-request-id 当请求没有传入时", async () => {
      const res = await app.request("/v1/agents/health");
      const requestId = res.headers.get("x-request-id");
      expect(requestId).toBeTruthy();
      expect(requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it("透传客户端传入的 x-request-id", async () => {
      const customId = "test-request-id-456";
      const res = await app.request("/v1/agents/health", {
        headers: { "x-request-id": customId },
      });
      expect(res.headers.get("x-request-id")).toBe(customId);
    });
  });

  describe("Prometheus metrics", () => {
    it("GET /metrics 返回 Prometheus 格式", async () => {
      const res = await app.request("/v1/agents/metrics");
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("http_request_duration_seconds");
      expect(text).toContain("saga_outcome_total");
    });
  });

  describe("Health check", () => {
    it("返回增强格式，包含 checks 字段", async () => {
      const res = await app.request("/v1/agents/health");
      const body = await res.json();
      expect(body.status).toBe("ok");
      expect(body.checks).toBeDefined();
      expect(body.checks.db).toBe("ok");
    });
  });
});
