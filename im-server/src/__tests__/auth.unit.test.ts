import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "../auth.js";

describe("JWT", () => {
  it("signToken 生成有效 token", () => {
    const token = signToken({ sub: "user-123", type: "human" });
    expect(token).toBeTruthy();
    expect(token.split(".")).toHaveLength(3);
  });

  it("verifyToken 解析正确的 payload", () => {
    const token = signToken({ sub: "user-456", type: "agent" });
    const payload = verifyToken(token);
    expect(payload.sub).toBe("user-456");
    expect(payload.type).toBe("agent");
  });

  it("verifyToken 对无效 token 抛错", () => {
    expect(() => verifyToken("invalid.token.here")).toThrow();
  });
});
