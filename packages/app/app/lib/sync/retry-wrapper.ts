/**
 * Retry Wrapper Utilities
 * Provides retry logic for transient errors with configurable options
 */

import { isTransientError, sleep } from "@avileo/drizzle-sync/core";
import { syncLogger } from "@avileo/drizzle-sync/pglite";

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 100;

export interface RetryOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
  context?: string;
}

/**
 * Execute a function with retry logic for transient errors.
 * Retries only on transient errors (database locked, timeout, etc.)
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => applyInsert(pg, tableName, change, businessId),
 *   { maxRetries: 3, context: "applyInsert" }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    onRetry,
    context,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMsg = lastError.message;

      if (attempt < maxRetries && isTransientError(errorMsg)) {
        onRetry?.(attempt + 1, lastError);
        syncLogger.warn(
          "[Retry]",
          `${context ? `[${context}] ` : ""}Attempt ${attempt + 1} failed: ${errorMsg}. Retrying...`
        );
        await sleep(retryDelayMs);
        continue;
      }

      // No more retries or non-transient error
      break;
    }
  }

  throw lastError;
}

/**
 * Execute multiple operations with individual retry logic.
 * If one fails, others continue (no transaction).
 *
 * @example
 * ```typescript
 * const { results, errors } = await withRetryAll(
 *   changes.map(change => () => applyChange(pg, change, businessId)),
 *   { maxRetries: 2 }
 * );
 * ```
 */
export async function withRetryAll<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<{
  results: T[];
  errors: Array<{ index: number; error: Error }>;
}> {
  const { maxRetries = DEFAULT_MAX_RETRIES, retryDelayMs = DEFAULT_RETRY_DELAY_MS } = options;
  const results: T[] = [];
  const errors: Array<{ index: number; error: Error }> = [];

  for (let i = 0; i < operations.length; i++) {
    try {
      const result = await withRetry(operations[i], {
        maxRetries,
        retryDelayMs,
        context: `operation[${i}]`,
      });
      results.push(result);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push({ index: i, error: err });
    }
  }

  return { results, errors };
}
