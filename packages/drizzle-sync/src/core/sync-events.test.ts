import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  SyncEventEmitter,
  NoOpSyncEventEmitter,
  noOpSyncEventEmitter,
  createSyncEventEmitter,
} from "./sync-events";
import type { SyncEventType } from "./sync-events";

describe("sync-events", () => {
  describe("SyncEventEmitter", () => {
    let emitter: SyncEventEmitter;

    beforeEach(() => {
      emitter = new SyncEventEmitter();
    });

    describe("on and emit", () => {
      it("calls handler when event is emitted", () => {
        const handler = vi.fn();
        emitter.on("pull:complete", handler);
        emitter.emit("pull:complete", {
          changesApplied: 5,
          entityTypes: ["sales"],
          hasMore: false,
          timestamp: "2024-01-01T00:00:00.000Z",
        });
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith({
          changesApplied: 5,
          entityTypes: ["sales"],
          hasMore: false,
          timestamp: "2024-01-01T00:00:00.000Z",
        });
      });

      it("calls multiple handlers for same event", () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();
        emitter.on("push:complete", handler1);
        emitter.on("push:complete", handler2);
        emitter.emit("push:complete", {
          operationsProcessed: 10,
          succeeded: 8,
          failed: 2,
          conflicts: 0,
          timestamp: "2024-01-01T00:00:00.000Z",
        });
        expect(handler1).toHaveBeenCalledTimes(1);
        expect(handler2).toHaveBeenCalledTimes(1);
      });

      it("does not call handler after unsubscribe", () => {
        const handler = vi.fn();
        const unsubscribe = emitter.on("pull:complete", handler);
        unsubscribe();
        emitter.emit("pull:complete", {
          changesApplied: 1,
          entityTypes: [],
          hasMore: false,
          timestamp: "2024-01-01T00:00:00.000Z",
        });
        expect(handler).not.toHaveBeenCalled();
      });

      it("handles errors in handler without affecting other handlers", () => {
        const errorHandler = vi.fn(() => {
          throw new Error("handler error");
        });
        const goodHandler = vi.fn();
        emitter.on("pull:complete", errorHandler);
        emitter.on("pull:complete", goodHandler);
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});

        emitter.emit("pull:complete", {
          changesApplied: 1,
          entityTypes: [],
          hasMore: false,
          timestamp: "2024-01-01T00:00:00.000Z",
        });

        expect(errorHandler).toHaveBeenCalled();
        expect(goodHandler).toHaveBeenCalled();
        spy.mockRestore();
      });

      it("does nothing when emitting with no listeners", () => {
        expect(() => {
          emitter.emit("pull:complete", {
            changesApplied: 1,
            entityTypes: [],
            hasMore: false,
            timestamp: "2024-01-01T00:00:00.000Z",
          });
        }).not.toThrow();
      });
    });

    describe("off", () => {
      it("removes all listeners for an event type", () => {
        const handler = vi.fn();
        emitter.on("pull:complete", handler);
        emitter.off("pull:complete");
        emitter.emit("pull:complete", {
          changesApplied: 1,
          entityTypes: [],
          hasMore: false,
          timestamp: "2024-01-01T00:00:00.000Z",
        });
        expect(handler).not.toHaveBeenCalled();
      });

      it("does not affect other event types when removing one", () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();
        emitter.on("pull:complete", handler1);
        emitter.on("push:complete", handler2);
        emitter.off("pull:complete");
        emitter.emit("push:complete", {
          operationsProcessed: 1,
          succeeded: 1,
          failed: 0,
          conflicts: 0,
          timestamp: "2024-01-01T00:00:00.000Z",
        });
        expect(handler2).toHaveBeenCalledTimes(1);
      });
    });

    describe("clear", () => {
      it("removes all listeners for all event types", () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();
        emitter.on("pull:complete", handler1);
        emitter.on("push:complete", handler2);
        emitter.clear();
        emitter.emit("pull:complete", {
          changesApplied: 1,
          entityTypes: [],
          hasMore: false,
          timestamp: "2024-01-01T00:00:00.000Z",
        });
        emitter.emit("push:complete", {
          operationsProcessed: 1,
          succeeded: 1,
          failed: 0,
          conflicts: 0,
          timestamp: "2024-01-01T00:00:00.000Z",
        });
        expect(handler1).not.toHaveBeenCalled();
        expect(handler2).not.toHaveBeenCalled();
      });
    });

    describe("hasListeners", () => {
      it("returns true when listeners exist", () => {
        emitter.on("pull:complete", vi.fn());
        expect(emitter.hasListeners("pull:complete")).toBe(true);
      });

      it("returns false when no listeners exist", () => {
        expect(emitter.hasListeners("pull:complete")).toBe(false);
      });

      it("returns false after unsubscribe", () => {
        const unsubscribe = emitter.on("pull:complete", vi.fn());
        unsubscribe();
        expect(emitter.hasListeners("pull:complete")).toBe(false);
      });
    });

    describe("listenerCount", () => {
      it("returns correct count", () => {
        emitter.on("pull:complete", vi.fn());
        emitter.on("pull:complete", vi.fn());
        expect(emitter.listenerCount("pull:complete")).toBe(2);
      });

      it("returns 0 for unknown event type", () => {
        expect(emitter.listenerCount("pull:complete")).toBe(0);
      });
    });

    describe("all event types", () => {
      it("can emit pull:stale event", () => {
        const handler = vi.fn();
        emitter.on("pull:stale", handler);
        emitter.emit("pull:stale", {
          consecutiveStalePulls: 3,
          reason: "cursor-stuck",
          timestamp: "2024-01-01T00:00:00.000Z",
        });
        expect(handler).toHaveBeenCalledTimes(1);
      });

      it("can emit pull:error event", () => {
        const handler = vi.fn();
        emitter.on("pull:error", handler);
        emitter.emit("pull:error", {
          error: "network timeout",
          consecutiveFailures: 2,
          timestamp: "2024-01-01T00:00:00.000Z",
        });
        expect(handler).toHaveBeenCalledTimes(1);
      });

      it("can emit push:error event", () => {
        const handler = vi.fn();
        emitter.on("push:error", handler);
        emitter.emit("push:error", {
          error: "batch failed",
          entityType: "sales",
          entityId: "entity-1",
          timestamp: "2024-01-01T00:00:00.000Z",
        });
        expect(handler).toHaveBeenCalledTimes(1);
      });

      it("can emit conflict:detected event", () => {
        const handler = vi.fn();
        emitter.on("conflict:detected", handler);
        emitter.emit("conflict:detected", {
          entityType: "sales",
          entityId: "entity-1",
          clientVersion: 1,
          serverVersion: 2,
          timestamp: "2024-01-01T00:00:00.000Z",
          correlationId: "corr-1",
        });
        expect(handler).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("NoOpSyncEventEmitter", () => {
    it("on returns a no-op unsubscribe", () => {
      const emitter = new NoOpSyncEventEmitter();
      const unsubscribe = emitter.on("pull:complete", vi.fn());
      unsubscribe(); // should not throw
    });

    it("emit does nothing", () => {
      const emitter = new NoOpSyncEventEmitter();
      expect(() => {
        emitter.emit("pull:complete", {
          changesApplied: 1,
          entityTypes: [],
          hasMore: false,
          timestamp: "2024-01-01T00:00:00.000Z",
        });
      }).not.toThrow();
    });

    it("off does nothing", () => {
      const emitter = new NoOpSyncEventEmitter();
      expect(() => emitter.off("pull:complete")).not.toThrow();
    });

    it("clear does nothing", () => {
      const emitter = new NoOpSyncEventEmitter();
      expect(() => emitter.clear()).not.toThrow();
    });

    it("hasListeners always returns false", () => {
      const emitter = new NoOpSyncEventEmitter();
      expect(emitter.hasListeners("pull:complete")).toBe(false);
    });
  });

  describe("noOpSyncEventEmitter", () => {
    it("is a singleton NoOpSyncEventEmitter instance", () => {
      expect(noOpSyncEventEmitter).toBeInstanceOf(NoOpSyncEventEmitter);
    });
  });

  describe("createSyncEventEmitter", () => {
    it("creates a new SyncEventEmitter instance", () => {
      const emitter = createSyncEventEmitter();
      expect(emitter).toBeInstanceOf(SyncEventEmitter);
    });

    it("returned emitter works correctly", () => {
      const emitter = createSyncEventEmitter();
      const handler = vi.fn();
      emitter.on("pull:complete", handler);
      emitter.emit("pull:complete", {
        changesApplied: 1,
        entityTypes: [],
        hasMore: false,
        timestamp: "2024-01-01T00:00:00.000Z",
      });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("SyncEventType", () => {
    it("includes all expected event types", () => {
      const types: SyncEventType[] = [
        "pull:complete",
        "pull:stale",
        "pull:error",
        "push:complete",
        "push:error",
        "conflict:detected",
      ];
      types.forEach((type) => expect(typeof type).toBe("string"));
    });
  });
});
