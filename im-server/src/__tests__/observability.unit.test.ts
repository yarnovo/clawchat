import { describe, it, expect } from "vitest";
import app from "../app.js";

describe("Observability", () => {
  describe("Request ID middleware", () => {
    it("生成 x-request-id 当请求没有传入时", async () => {
      const res = await app.request("/v1/im/health");
      const requestId = res.headers.get("x-request-id");
      expect(requestId).toBeTruthy();
      // UUID v4 format
      expect(requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it("透传客户端传入的 x-request-id", async () => {
      const customId = "test-request-id-123";
      const res = await app.request("/v1/im/health", {
        headers: { "x-request-id": customId },
      });
      expect(res.headers.get("x-request-id")).toBe(customId);
    });
  });

  describe("Prometheus metrics", () => {
    it("GET /metrics 返回 Prometheus 格式", async () => {
      const res = await app.request("/v1/im/metrics");
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("http_request_duration_seconds");
      expect(text).toContain("ws_connections_active");
      expect(text).toContain("agent_reply_queue_depth");
    });
  });

  describe("Health check", () => {
    it("返回增强格式，包含 checks 字段", async () => {
      const res = await app.request("/v1/im/health");
      const body = await res.json();
      expect(body.status).toBe("ok");
      expect(body.checks).toBeDefined();
      expect(body.checks.db).toBe("ok");
      expect(body.checks.redis).toBe("ok");
    });
  });
});
