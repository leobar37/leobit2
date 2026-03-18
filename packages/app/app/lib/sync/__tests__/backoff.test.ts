/**
 * Backoff Tests
 * Unit tests for exponential backoff and retry logic
 */

import { describe, expect, it } from "vitest";
import { calculateBackoffDelay, isTransientError, sleep } from "../backoff";

describe("calculateBackoffDelay", () => {
  it("returns 0 when no failures", () => {
    expect(calculateBackoffDelay(0)).toBe(0);
    expect(calculateBackoffDelay(-1)).toBe(0);
  });

  it("calculates exponential backoff for first failure", () => {
    // base * 2^(1-1) = 1000 * 1 = 1000
    expect(calculateBackoffDelay(1)).toBe(1000);
  });

  it("calculates exponential backoff for multiple failures", () => {
    // 2 failures: 1000 * 2^1 = 2000
    expect(calculateBackoffDelay(2)).toBe(2000);
    // 3 failures: 1000 * 2^2 = 4000
    expect(calculateBackoffDelay(3)).toBe(4000);
    // 4 failures: 1000 * 2^3 = 8000
    expect(calculateBackoffDelay(4)).toBe(8000);
  });

  it("caps backoff at maximum value (30000ms)", () => {
    // Many failures should still cap at 30000
    expect(calculateBackoffDelay(10)).toBe(30000);
    expect(calculateBackoffDelay(100)).toBe(30000);
  });

  it("returns values within expected range", () => {
    for (let i = 1; i <= 10; i++) {
      const delay = calculateBackoffDelay(i);
      expect(delay).toBeGreaterThan(0);
      expect(delay).toBeLessThanOrEqual(30000);
    }
  });
});

describe("isTransientError", () => {
  it("returns true for database locked errors", () => {
    expect(isTransientError("database is locked")).toBe(true);
    expect(isTransientError("Database is Locked")).toBe(true);
    expect(isTransientError("DATABASE IS LOCKED")).toBe(true);
  });

  it("returns true for SQLITE_BUSY errors", () => {
    expect(isTransientError("SQLITE_BUSY")).toBe(true);
    expect(isTransientError("sqlite_busy")).toBe(true);
  });

  it("returns true for connection errors", () => {
    expect(isTransientError("connection timeout")).toBe(true);
    expect(isTransientError("connection refused")).toBe(true);
  });

  it("returns true for timeout errors", () => {
    expect(isTransientError("request timeout")).toBe(true);
    expect(isTransientError("connection timeout")).toBe(true);
  });

  it("returns true for deadlock errors", () => {
    expect(isTransientError("deadlock detected")).toBe(true);
    expect(isTransientError("DEADLOCK")).toBe(true);
  });

  it("returns false for non-transient errors", () => {
    expect(isTransientError("syntax error")).toBe(false);
    expect(isTransientError("constraint violation")).toBe(false);
    expect(isTransientError("not found")).toBe(false);
    expect(isTransientError("")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isTransientError("")).toBe(false);
  });
});

describe("sleep", () => {
  it("resolves after specified time", async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45); // Allow small margin
  });

  it("resolves immediately for 0ms", async () => {
    const start = Date.now();
    await sleep(0);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10);
  });
});
