/**
 * HTTP Utilities
 *
 * Simple utilities for retry logic and timeouts.
 * Focused on what the sync client actually needs.
 */

import { TimeoutError, AbortError } from "./errors";
import type { RetryConfig } from "./types";

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number
): number {
  if (attempt <= 0) return 0;
  return Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
}

/**
 * Check if an error is transient and worth retrying
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof AbortError) return false;
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const transientPatterns = [
      "database is locked",
      "sqlite_busy",
      "connection",
      "timeout",
      "deadlock",
      "econnreset",
      "enotfound",
      "etimedout",
    ];
    return transientPatterns.some((pattern) => message.includes(pattern));
  }
  return false;
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  shouldAbort?: () => boolean
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay, shouldRetry } = config;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check if we should abort before attempting
    if (shouldAbort?.()) {
      throw new AbortError("Retry aborted");
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Check if this error should be retried
      const retryable = shouldRetry
        ? shouldRetry(lastError, attempt + 1)
        : isTransientError(lastError);

      if (!retryable) {
        throw lastError;
      }

      // Calculate delay and wait
      const delay = calculateBackoffDelay(attempt + 1, baseDelay, maxDelay);

      if (delay > 0) {
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Execute a request with timeout
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new TimeoutError(timeoutMs));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Merge headers with priority for custom headers
 */
export function mergeHeaders(
  defaults: Record<string, string>,
  custom?: Record<string, string>
): Record<string, string> {
  return { ...defaults, ...(custom || {}) };
}

/**
 * Build URL with query parameters
 */
export function buildUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, baseUrl);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}
