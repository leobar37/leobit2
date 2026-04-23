import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SyncAutoRunner } from "../auto-runner";
import { BACKOFF_BASE_MS, BACKOFF_MAX_MS } from "../../shared";

describe("SyncAutoRunner", () => {
  let runner: SyncAutoRunner;

  beforeEach(() => {
    runner = new SyncAutoRunner();
    vi.useFakeTimers();
  });

  afterEach(() => {
    runner.stop();
    vi.useRealTimers();
  });

  describe("start/stop", () => {
    it("starts running when start is called", () => {
      const task = vi.fn();
      runner.start(task, 1000);
      expect(runner.isRunning()).toBe(true);
    });

    it("stops running when stop is called", () => {
      const task = vi.fn();
      runner.start(task, 1000);
      runner.stop();
      expect(runner.isRunning()).toBe(false);
    });

    it("does not start twice", () => {
      const task = vi.fn();
      runner.start(task, 1000);
      runner.start(task, 1000);
      expect(runner.isRunning()).toBe(true);
    });

    it("executes task on interval", () => {
      const task = vi.fn();
      runner.start(task, 1000);
      expect(task).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      expect(task).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1000);
      expect(task).toHaveBeenCalledTimes(2);
    });
  });

  describe("backoff", () => {
    it("starts with zero backoff", () => {
      expect(runner.getBackoffAtMax()).toBe(false);
    });

    it("increases backoff on failure", () => {
      runner.recordFailure();
      expect(runner.getBackoffAtMax()).toBe(false);
    });

    it("doubles backoff on consecutive failures", () => {
      runner.recordFailure();
      expect(runner.getBackoffAtMax()).toBe(false); // 1000ms
      runner.recordFailure();
      expect(runner.getBackoffAtMax()).toBe(false); // 2000ms
      runner.recordFailure();
      expect(runner.getBackoffAtMax()).toBe(false); // 4000ms
    });

    it("caps backoff at max", () => {
      // 1000 * 2^4 = 16000, 1000 * 2^5 = 32000 (capped at 30000)
      for (let i = 0; i < 6; i++) {
        runner.recordFailure();
      }
      expect(runner.getBackoffAtMax()).toBe(true);
    });

    it("resets backoff on success", () => {
      runner.recordFailure();
      runner.recordFailure();
      runner.recordSuccess();
      expect(runner.getBackoffAtMax()).toBe(false);
    });

    it("resets backoff manually", () => {
      runner.recordFailure();
      runner.recordFailure();
      runner.resetBackoff();
      expect(runner.getBackoffAtMax()).toBe(false);
    });

    it("waits for backoff duration", async () => {
      runner.recordFailure(); // 1000ms
      const promise = runner.waitForBackoff();
      vi.advanceTimersByTime(500);
      // Should not resolve yet
      const resolvedEarly = await Promise.race([
        promise.then(() => true),
        Promise.resolve(false),
      ]);
      expect(resolvedEarly).toBe(false);
      vi.advanceTimersByTime(600);
      await promise;
    });

    it("resolves waitForBackoff immediately if no backoff", async () => {
      await runner.waitForBackoff(); // should resolve immediately
    });
  });

  describe("stop during backoff wait", () => {
    it("resolves waitForBackoff when stopped", async () => {
      runner.recordFailure(); // 1000ms
      const promise = runner.waitForBackoff();
      runner.stop();
      await promise; // should resolve immediately
    });
  });
});
