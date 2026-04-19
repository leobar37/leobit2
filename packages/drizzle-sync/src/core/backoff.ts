/**
 * Backoff Utilities
 *
 * Exponential backoff logic for retry operations.
 * Pure JavaScript logic - testable and maintainable.
 */

/**
 * Default backoff configuration
 */
export const DEFAULT_BACKOFF_CONFIG = {
  /** Base delay in milliseconds */
  baseDelayMs: 1000,
  /** Maximum delay in milliseconds */
  maxDelayMs: 30000,
  /** Backoff multiplier */
  multiplier: 2,
} as const;

/**
 * Backoff options
 */
export interface BackoffOptions {
  /** Base delay in milliseconds (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number;
  /** Backoff multiplier (default: 2) */
  multiplier?: number;
  /** Add jitter to prevent thundering herd (default: true) */
  jitter?: boolean;
}

/**
 * Interface for backoff strategy
 */
export interface IBackoffStrategy {
  /** Get current delay */
  getDelay(): number;
  /** Record a success (reset backoff) */
  recordSuccess(): void;
  /** Record a failure (increase backoff) */
  recordFailure(): void;
  /** Reset to initial state */
  reset(): void;
  /** Get consecutive failure count */
  getConsecutiveFailures(): number;
}

/**
 * Exponential backoff implementation
 */
export class ExponentialBackoff implements IBackoffStrategy {
  private consecutiveFailures = 0;
  private currentDelay = 0;

  constructor(
    private baseMs: number = DEFAULT_BACKOFF_CONFIG.baseDelayMs,
    private maxMs: number = DEFAULT_BACKOFF_CONFIG.maxDelayMs,
    private multiplier: number = DEFAULT_BACKOFF_CONFIG.multiplier
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

  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }
}

/**
 * Calculate exponential backoff delay.
 *
 * @param consecutiveFailures Number of consecutive failures
 * @param options Backoff options
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(
  consecutiveFailures: number,
  options: BackoffOptions = {}
): number {
  const {
    baseDelayMs = DEFAULT_BACKOFF_CONFIG.baseDelayMs,
    maxDelayMs = DEFAULT_BACKOFF_CONFIG.maxDelayMs,
    multiplier = DEFAULT_BACKOFF_CONFIG.multiplier,
    jitter = true,
  } = options;

  if (consecutiveFailures <= 0) return 0;

  // Exponential backoff: base * multiplier^(failures-1), capped at max
  let delay = Math.min(
    baseDelayMs * Math.pow(multiplier, consecutiveFailures - 1),
    maxDelayMs
  );

  // Add jitter to prevent thundering herd
  if (jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }

  return Math.floor(delay);
}

/**
 * Check if an error is transient and worth retrying.
 *
 * @param errorMessage Error message to check
 * @returns True if the error is transient
 */
export function isTransientError(errorMessage: string): boolean {
  const transientPatterns = [
    "database is locked",
    "SQLITE_BUSY",
    "connection",
    "timeout",
    "deadlock",
    "network",
    "fetch failed",
    "abort",
    "offline",
  ];

  const lower = errorMessage.toLowerCase();
  return transientPatterns.some((pattern) => lower.includes(pattern.toLowerCase()));
}

/**
 * Sleep for a given number of milliseconds.
 *
 * @param ms Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry options
 */
export interface RetryOptions {
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
  /** Base retry delay in milliseconds (default: 100) */
  retryDelayMs?: number;
  /** Callback on each retry attempt */
  onRetry?: (attempt: number, error: Error) => void;
  /** Context string for logging */
  context?: string;
  /** Check if error is retryable */
  isRetryable?: (error: Error) => boolean;
}

/**
 * Execute a function with retry logic.
 *
 * @param fn Function to execute
 * @param options Retry options
 * @returns Function result
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelayMs = 100,
    onRetry,
    context = "unknown",
    isRetryable = () => true,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      if (!isRetryable(lastError)) {
        throw lastError;
      }

      // Last attempt failed, throw
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Log retry
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait before retry
      await sleep(retryDelayMs * Math.pow(2, attempt));
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError ?? new Error("Retry failed");
}

/**
 * Create a retry wrapper for a function.
 *
 * @param fn Function to wrap
 * @param options Retry options
 * @returns Wrapped function
 */
export function createRetryWrapper<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    return withRetry(() => fn(...args), options);
  };
}
