// Saga pattern — execute steps in order, compensate in reverse on failure

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
      console.error(`[saga] step "${step.name}" failed:`, error.message);

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
        console.log(`[saga] compensated "${step.name}"`);
        lastError = undefined;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(
          `[saga] compensate "${step.name}" attempt ${attempt}/${COMPENSATE_MAX_RETRIES} failed:`,
          lastError.message,
        );
        if (attempt < COMPENSATE_MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
        }
      }
    }

    if (lastError) {
      console.error(
        `[saga] compensate "${step.name}" failed after ${COMPENSATE_MAX_RETRIES} attempts`,
      );
      errors.push({ step: step.name, error: lastError });
    }
  }

  return errors;
}
