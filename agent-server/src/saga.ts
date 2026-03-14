// Saga pattern — execute steps in order, compensate in reverse on failure

import { logger } from "./logger.js";

export interface SagaStep<TContext> {
  name: string;
  execute: (ctx: TContext) => Promise<void>;
  compensate: (ctx: TContext) => Promise<void>;
}

export interface SagaResult<TContext> {
  success: boolean;
  context: TContext;
  failedStep?: string;
  error?: Error;
  compensationErrors: { step: string; error: Error }[];
}

const COMPENSATE_MAX_RETRIES = 3;

/**
 * Run a saga: execute steps in order, compensate in reverse on failure.
 * Compensations are retried up to COMPENSATE_MAX_RETRIES times.
 */
export async function runSaga<TContext>(
  steps: SagaStep<TContext>[],
  context: TContext,
): Promise<SagaResult<TContext>> {
  const completed: SagaStep<TContext>[] = [];

  for (const step of steps) {
    try {
      await step.execute(context);
      completed.push(step);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error({ step: step.name, err: error.message }, "saga step failed");

      // Compensate completed steps in reverse order
      const compensationErrors = await compensate(completed, context);

      return {
        success: false,
        context,
        failedStep: step.name,
        error,
        compensationErrors,
      };
    }
  }

  return { success: true, context, compensationErrors: [] };
}

async function compensate<TContext>(
  completedSteps: SagaStep<TContext>[],
  context: TContext,
): Promise<{ step: string; error: Error }[]> {
  const errors: { step: string; error: Error }[] = [];

  // Reverse order
  for (let i = completedSteps.length - 1; i >= 0; i--) {
    const step = completedSteps[i]!;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= COMPENSATE_MAX_RETRIES; attempt++) {
      try {
        await step.compensate(context);
        logger.info({ step: step.name }, "saga compensated");
        lastError = undefined;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          { step: step.name, attempt, maxAttempts: COMPENSATE_MAX_RETRIES, err: lastError.message },
          "saga compensate attempt failed",
        );
        if (attempt < COMPENSATE_MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
        }
      }
    }

    if (lastError) {
      logger.error(
        { step: step.name, maxAttempts: COMPENSATE_MAX_RETRIES },
        "saga compensate failed after all attempts",
      );
      errors.push({ step: step.name, error: lastError });
    }
  }

  return errors;
}
