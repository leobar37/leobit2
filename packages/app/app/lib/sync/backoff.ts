/**
 * Backoff Utilities
 * Exponential backoff logic for retry operations
 */

import { BACKOFF_BASE_MS, BACKOFF_MAX_MS } from "./config";

/**
 * Calculate exponential backoff delay
 * @param consecutiveFailures - Number of consecutive failures
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(consecutiveFailures: number): number {
  if (consecutiveFailures <= 0) return 0;

  // Exponential backoff: base * 2^(failures-1), capped at max
  const delay = Math.min(
    BACKOFF_BASE_MS * Math.pow(2, consecutiveFailures - 1),
    BACKOFF_MAX_MS
  );
  return delay;
}

/**
 * Check if an error is transient and worth retrying
 * @param errorMessage - Error message to check
 * @returns True if the error is transient
 */
export function isTransientError(errorMessage: string): boolean {
  const transientPatterns = [
    "database is locked",
    "SQLITE_BUSY",
    "connection",
    "timeout",
    "deadlock",
  ];
  return transientPatterns.some((pattern) =>
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Sleep for a given number of milliseconds
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
