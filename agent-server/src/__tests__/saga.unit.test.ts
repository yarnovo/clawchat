import { describe, it, expect, vi } from "vitest";
import { runSaga, type SagaStep } from "../saga.js";

interface TestContext {
  log: string[];
}

function makeStep(name: string, opts?: {
  executeFail?: boolean;
  compensateFail?: boolean;
  compensateFailTimes?: number;
}): SagaStep<TestContext> {
  let compensateAttempts = 0;
  return {
    name,
    execute: async (ctx) => {
      if (opts?.executeFail) throw new Error(`${name} failed`);
      ctx.log.push(`exec:${name}`);
    },
    compensate: async (ctx) => {
      compensateAttempts++;
      if (opts?.compensateFail && compensateAttempts <= (opts.compensateFailTimes ?? Infinity)) {
        throw new Error(`compensate ${name} failed`);
      }
      ctx.log.push(`comp:${name}`);
    },
  };
}

describe("runSaga", () => {
  it("全部成功 — 不触发补偿", async () => {
    const ctx: TestContext = { log: [] };
    const result = await runSaga(
      [makeStep("a"), makeStep("b"), makeStep("c")],
      ctx,
    );

    expect(result.success).toBe(true);
    expect(ctx.log).toEqual(["exec:a", "exec:b", "exec:c"]);
    expect(result.compensationErrors).toEqual([]);
  });

  it("第 3 步失败 — 反向补偿前 2 步", async () => {
    const ctx: TestContext = { log: [] };
    const result = await runSaga(
      [makeStep("a"), makeStep("b"), makeStep("c", { executeFail: true })],
      ctx,
    );

    expect(result.success).toBe(false);
    expect(result.failedStep).toBe("c");
    expect(result.error?.message).toBe("c failed");
    // 执行了 a, b，然后反向补偿 b, a
    expect(ctx.log).toEqual(["exec:a", "exec:b", "comp:b", "comp:a"]);
  });

  it("第 1 步失败 — 无需补偿", async () => {
    const ctx: TestContext = { log: [] };
    const result = await runSaga(
      [makeStep("a", { executeFail: true }), makeStep("b")],
      ctx,
    );

    expect(result.success).toBe(false);
    expect(result.failedStep).toBe("a");
    expect(ctx.log).toEqual([]);
  });

  it("补偿失败后重试成功", async () => {
    const ctx: TestContext = { log: [] };
    const result = await runSaga(
      [
        makeStep("a"),
        // compensate fails first time, succeeds second
        makeStep("b", { compensateFail: true, compensateFailTimes: 1 }),
        makeStep("c", { executeFail: true }),
      ],
      ctx,
    );

    expect(result.success).toBe(false);
    // b compensation retried and succeeded
    expect(ctx.log).toContain("comp:b");
    expect(ctx.log).toContain("comp:a");
    expect(result.compensationErrors).toEqual([]);
  });

  it("补偿彻底失败 — 记录到 compensationErrors", async () => {
    const ctx: TestContext = { log: [] };
    const result = await runSaga(
      [
        makeStep("a"),
        // compensate always fails
        makeStep("b", { compensateFail: true }),
        makeStep("c", { executeFail: true }),
      ],
      ctx,
    );

    expect(result.success).toBe(false);
    expect(result.compensationErrors.length).toBe(1);
    expect(result.compensationErrors[0]!.step).toBe("b");
    // a still compensated successfully
    expect(ctx.log).toContain("comp:a");
  });
});
