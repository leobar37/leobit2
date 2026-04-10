import { describe, expect, it } from "vitest";
import { SyncAutoRunner } from "../sync-auto-runner";

describe("SyncAutoRunner", () => {
  it("resolves a pending backoff wait when stop is called", async () => {
    const runner = new SyncAutoRunner();

    runner.recordFailure();

    let resolved = false;
    const waitPromise = runner.waitForBackoff().then(() => {
      resolved = true;
    });

    runner.stop();
    await waitPromise;

    expect(resolved).toBe(true);
  });

  it("tracks running state for the auto-sync interval", () => {
    const runner = new SyncAutoRunner();

    runner.start(async () => {});
    expect(runner.isRunning()).toBe(true);

    runner.stop();
    expect(runner.isRunning()).toBe(false);
  });
});
