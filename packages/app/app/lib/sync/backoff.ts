/**
 * Backoff Utilities
 * Exponential backoff logic for retry operations
 */

import { BACKOFF_BASE_MS, BACKOFF_MAX_MS } from "./config";

/**
 * Interface for backoff strategy
 */
export interface IBackoffStrategy {
  getDelay(): number;
  recordSuccess(): void;
  recordFailure(): void;
  reset(): void;
}

/**
 * Exponential backoff implementation
 */
export class ExponentialBackoff implements IBackoffStrategy {
  private consecutiveFailures = 0;
  private currentDelay = 0;

  constructor(
    private baseMs: number = BACKOFF_BASE_MS,
    private maxMs: number = BACKOFF_MAX_MS,
    private multiplier: number = 2
  ) {}

  getDelay(): number {
    return this.currentDelay;
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.currentDelay = 0;
  }

  recordFailure(): void {
    this.consecutiveFailures++;
    this.currentDelay = Math.min(
      this.baseMs * Math.pow(this.multiplier, this.consecutiveFailures - 1),
      this.maxMs
    );
  }

  reset(): void {
    this.consecutiveFailures = 0;
    this.currentDelay = 0;
  }
}

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
