import { Window } from "happy-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSyncStorage } from "./session-storage";

function createSuccessRequest<T extends Record<string, unknown>>(result?: T) {
  const request: Record<string, unknown> = {
    result,
    error: null,
    onsuccess: null,
    onerror: null,
    onblocked: null,
  };

  queueMicrotask(() => {
    const onsuccess = request.onsuccess as
      | ((event: { target: typeof request }) => void)
      | null;
    onsuccess?.({ target: request });
  });

  return request as IDBOpenDBRequest;
}

describe("clearSyncStorage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const windowInstance = new Window();

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: windowInstance,
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: windowInstance.document,
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: windowInstance.localStorage,
    });

    window.localStorage.clear();
  });

  it("preserves auth and business context when preserveSession is true", async () => {
    localStorage.setItem("bearer_token", "token-123");
    localStorage.setItem("current_business_id", "biz-123");

    await clearSyncStorage({ preserveSession: true });

    expect(localStorage.getItem("bearer_token")).toBe("token-123");
    expect(localStorage.getItem("current_business_id")).toBe("biz-123");
  });

  it("can clear the stored session when requested", async () => {
    localStorage.setItem("bearer_token", "token-123");
    localStorage.setItem("current_business_id", "biz-123");

    await clearSyncStorage({ preserveSession: false });

    expect(localStorage.getItem("bearer_token")).toBeNull();
    expect(localStorage.getItem("current_business_id")).toBeNull();
  });
});
