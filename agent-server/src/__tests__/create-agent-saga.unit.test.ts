import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external dependencies
vi.mock("../im-client.js", () => ({
  registerAgentAccount: vi.fn(),
  addDirectFriend: vi.fn(),
  deleteAgentAccount: vi.fn(),
}));

vi.mock("../openclaw-client.js", () => ({
  createInstance: vi.fn(),
  removeInstance: vi.fn(),
}));

vi.mock("../db.js", () => ({
  prisma: {
    agent: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    agentConfig: {
      update: vi.fn(),
    },
  },
}));

import * as imClient from "../im-client.js";
import * as openclawClient from "../openclaw-client.js";
import { prisma } from "../db.js";
import { createAgentSaga } from "../create-agent-saga.js";

const mockImAccount = { id: "im-acc-1", name: "TestBot", type: "agent" };
const mockAgent = {
  id: "agent-1",
  accountId: "im-acc-1",
  ownerId: "user-1",
  name: "TestBot",
  config: { gatewayToken: "agent-im-acc-1" },
};

beforeEach(() => {
  vi.clearAllMocks();

  // Default happy-path mocks
  vi.mocked(imClient.registerAgentAccount).mockResolvedValue(mockImAccount);
  vi.mocked(imClient.addDirectFriend).mockResolvedValue(undefined);
  vi.mocked(imClient.deleteAgentAccount).mockResolvedValue(undefined);
  vi.mocked(prisma.agent.create).mockResolvedValue(mockAgent as never);
  vi.mocked(prisma.agent.delete).mockResolvedValue(mockAgent as never);
  vi.mocked(prisma.agent.findUnique).mockResolvedValue(mockAgent as never);
  vi.mocked(prisma.agentConfig.update).mockResolvedValue({} as never);
  vi.mocked(openclawClient.createInstance).mockResolvedValue({ containerId: "ctr-1" });
  vi.mocked(openclawClient.removeInstance).mockResolvedValue(undefined);
});

describe("createAgentSaga", () => {
  it("全部成功 — 返回 agent", async () => {
    const result = await createAgentSaga({
      ownerId: "user-1",
      name: "TestBot",
      apiKey: "sk-test",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.agent).toBeDefined();
    }

    // Verify all steps executed
    expect(imClient.registerAgentAccount).toHaveBeenCalled();
    expect(prisma.agent.create).toHaveBeenCalled();
    expect(imClient.addDirectFriend).toHaveBeenCalled();
    expect(openclawClient.createInstance).toHaveBeenCalled();
  });

  it("无 apiKey — 跳过容器启动", async () => {
    const result = await createAgentSaga({
      ownerId: "user-1",
      name: "TestBot",
    });

    expect(result.success).toBe(true);
    expect(openclawClient.createInstance).not.toHaveBeenCalled();
  });

  it("im-server 注册失败 — 不需要补偿", async () => {
    vi.mocked(imClient.registerAgentAccount).mockRejectedValue(
      new Error("im-server down"),
    );

    const result = await createAgentSaga({
      ownerId: "user-1",
      name: "TestBot",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.failedStep).toBe("register-im-account");
    }
    // No compensation needed — nothing was created
    expect(prisma.agent.delete).not.toHaveBeenCalled();
    expect(imClient.deleteAgentAccount).not.toHaveBeenCalled();
  });

  it("添加好友失败 — 补偿：删 DB + 删 im 账号", async () => {
    vi.mocked(imClient.addDirectFriend).mockRejectedValue(
      new Error("friend limit reached"),
    );

    const result = await createAgentSaga({
      ownerId: "user-1",
      name: "TestBot",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.failedStep).toBe("add-friendship");
    }
    // Compensations: delete agent record, then delete im account
    expect(prisma.agent.delete).toHaveBeenCalledWith({ where: { id: "agent-1" } });
    expect(imClient.deleteAgentAccount).toHaveBeenCalledWith("im-acc-1");
  });

  it("容器启动失败 — 补偿前 3 步（容器本身未创建成功，无需删容器）", async () => {
    vi.mocked(openclawClient.createInstance).mockRejectedValue(
      new Error("docker unavailable"),
    );

    const result = await createAgentSaga({
      ownerId: "user-1",
      name: "TestBot",
      apiKey: "sk-test",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.failedStep).toBe("start-container");
    }
    // start-container failed during execute, so its compensate is NOT called
    // (container was never created). Only prior steps are compensated.
    expect(openclawClient.removeInstance).not.toHaveBeenCalled();
    expect(prisma.agent.delete).toHaveBeenCalled();
    expect(imClient.deleteAgentAccount).toHaveBeenCalled();
  });

  it("DB 创建失败 — 补偿：只删 im 账号", async () => {
    vi.mocked(prisma.agent.create).mockRejectedValue(
      new Error("unique constraint"),
    );

    const result = await createAgentSaga({
      ownerId: "user-1",
      name: "TestBot",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.failedStep).toBe("create-agent-record");
    }
    // Only step 1 needs compensation
    expect(imClient.deleteAgentAccount).toHaveBeenCalledWith("im-acc-1");
    expect(prisma.agent.delete).not.toHaveBeenCalled();
  });
});
