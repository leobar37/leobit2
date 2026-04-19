import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateBackoffDelay,
  ExponentialBackoff,
  isTransientError,
  sleep,
  withRetry,
  createRetryWrapper,
  DEFAULT_BACKOFF_CONFIG,
} from "./backoff";

describe("backoff", () => {
  describe("calculateBackoffDelay", () => {
    it("returns 0 for 0 consecutive failures", () => {
      expect(calculateBackoffDelay(0)).toBe(0);
    });

    it("returns 0 for negative failures", () => {
      expect(calculateBackoffDelay(-1)).toBe(0);
    });

    it("returns base delay for 1 failure (1000ms default)", () => {
      const delay = calculateBackoffDelay(1, { jitter: false });
      expect(delay).toBe(1000);
    });

    it("returns multiplied delay for 2 failures", () => {
      const delay = calculateBackoffDelay(2, { jitter: false });
      expect(delay).toBe(2000); // 1000 * 2^1
    });

    it("returns multiplied delay for 3 failures", () => {
      const delay = calculateBackoffDelay(3, { jitter: false });
      expect(delay).toBe(4000); // 1000 * 2^2
    });

    it("caps delay at maxDelayMs", () => {
      const delay = calculateBackoffDelay(10, { jitter: false });
      expect(delay).toBe(30000); // capped at max
    });

    it("respects custom baseDelayMs", () => {
      const delay = calculateBackoffDelay(1, { baseDelayMs: 500, jitter: false });
      expect(delay).toBe(500);
    });

    it("respects custom maxDelayMs", () => {
      const delay = calculateBackoffDelay(3, { maxDelayMs: 1000, jitter: false });
      expect(delay).toBe(1000); // capped at 1000
    });
  });

  describe("ExponentialBackoff", () => {
    let backoff: ExponentialBackoff;

    beforeEach(() => {
      backoff = new ExponentialBackoff(1000, 30000, 2);
    });

    it("starts with 0 delay", () => {
      expect(backoff.getDelay()).toBe(0);
    });

    it("records failure and increases delay", () => {
      backoff.recordFailure();
      expect(backoff.getDelay()).toBe(1000);
      expect(backoff.getConsecutiveFailures()).toBe(1);
    });

    it("doubles delay on each failure", () => {
      backoff.recordFailure();
      backoff.recordFailure();
      expect(backoff.getDelay()).toBe(2000);
      expect(backoff.getConsecutiveFailures()).toBe(2);
    });

    it("caps at max delay", () => {
      for (let i = 0; i < 10; i++) backoff.recordFailure();
      expect(backoff.getDelay()).toBe(30000);
    });

    it("resets on success", () => {
      backoff.recordFailure();
      backoff.recordFailure();
      backoff.recordSuccess();
      expect(backoff.getDelay()).toBe(0);
      expect(backoff.getConsecutiveFailures()).toBe(0);
    });

    it("reset clears state", () => {
      backoff.recordFailure();
      backoff.recordFailure();
      backoff.reset();
      expect(backoff.getDelay()).toBe(0);
      expect(backoff.getConsecutiveFailures()).toBe(0);
    });
  });

  describe("isTransientError", () => {
    it("returns true for database locked", () => {
      expect(isTransientError("database is locked")).toBe(true);
    });

    it("returns true for SQLITE_BUSY", () => {
      expect(isTransientError("SQLITE_BUSY")).toBe(true);
    });

    it("returns true for connection errors", () => {
      expect(isTransientError("connection refused")).toBe(true);
    });

    it("returns true for timeout errors", () => {
      expect(isTransientError("timeout error")).toBe(true);
    });

    it("returns true for network errors", () => {
      expect(isTransientError("network error")).toBe(true);
    });

    it("returns true for fetch failures", () => {
      expect(isTransientError("fetch failed")).toBe(true);
    });

    it("returns false for validation errors", () => {
      expect(isTransientError("validation error: field is required")).toBe(false);
    });

    it("is case insensitive", () => {
      expect(isTransientError("DATABASE IS LOCKED")).toBe(true);
    });
  });

  describe("sleep", () => {
    it("resolves after specified milliseconds", async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45); // allow some tolerance
    });
  });

  describe("withRetry", () => {
    it("returns result on first success", async () => {
      const fn = vi.fn().mockResolvedValue("ok");
      const result = await withRetry(fn);
      expect(result).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("retries on transient failure then succeeds", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("connection timeout"))
        .mockResolvedValue("ok");
      const result = await withRetry(fn, { maxRetries: 3 });
      expect(result).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("throws after max retries on persistent error", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("validation error"));
      await expect(withRetry(fn, { maxRetries: 2 })).rejects.toThrow(
        "validation error"
      );
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it("throws immediately on non-retryable error", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("validation error: required"));
      const isRetryable = (e: Error) =>
        !e.message.toLowerCase().includes("validation");
      await expect(
        withRetry(fn, { maxRetries: 3, isRetryable })
      ).rejects.toThrow("validation error");
      expect(fn).toHaveBeenCalledTimes(1); // no retries
    });
  });

  describe("createRetryWrapper", () => {
    it("wraps a function with retry logic", async () => {
      const inner = vi.fn().mockResolvedValue("wrapped");
      const wrapped = createRetryWrapper(inner);
      const result = await wrapped();
      expect(result).toBe("wrapped");
      expect(inner).toHaveBeenCalledTimes(1);
    });
  });
});
