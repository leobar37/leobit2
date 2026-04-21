import { BACKOFF_BASE_MS, BACKOFF_MAX_MS, SYNC_INTERVAL_MS } from "@avileo/drizzle-sync/shared";

/**
 * Owns auto-sync timers and cancelable backoff state for push sync.
 */
export class SyncAutoRunner {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private backoffTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffWaitResolver: (() => void) | null = null;
  private consecutiveFailures = 0;
  private currentBackoff = 0;

  start(
    task: () => Promise<unknown> | unknown,
    intervalMs: number = SYNC_INTERVAL_MS
  ): void {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      void task();
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.backoffTimer) {
      clearTimeout(this.backoffTimer);
      this.backoffTimer = null;
    }

    if (this.backoffWaitResolver) {
      const resolve = this.backoffWaitResolver;
      this.backoffWaitResolver = null;
      resolve();
    }
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }

  async waitForBackoff(): Promise<void> {
    if (this.currentBackoff <= 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      this.backoffWaitResolver = resolve;
      this.backoffTimer = setTimeout(() => {
        this.backoffTimer = null;
        this.backoffWaitResolver = null;
        resolve();
      }, this.currentBackoff);
    });
  }

  recordFailure(): void {
    this.consecutiveFailures += 1;
    this.currentBackoff = Math.min(
      BACKOFF_BASE_MS * Math.pow(2, this.consecutiveFailures - 1),
      BACKOFF_MAX_MS
    );
  }

  recordSuccess(): void {
    this.resetBackoff();
  }

  resetBackoff(): void {
    this.consecutiveFailures = 0;
    this.currentBackoff = 0;

    if (this.backoffTimer) {
      clearTimeout(this.backoffTimer);
      this.backoffTimer = null;
    }

    if (this.backoffWaitResolver) {
      const resolve = this.backoffWaitResolver;
      this.backoffWaitResolver = null;
      resolve();
    }
  }

  getBackoffAtMax(): boolean {
    return this.currentBackoff >= BACKOFF_MAX_MS;
  }
}
