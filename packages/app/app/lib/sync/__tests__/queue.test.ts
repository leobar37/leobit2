import { describe, it, expect, beforeEach } from "vitest";
import {
  enqueue,
  listPending,
  markProcessed,
  markFailed,
  getRetryStats,
  getOperationById,
  clear,
  type QueueOperation,
} from "../queue";
import type { SyncOperation } from "~/lib/db/schema";
import "fake-indexeddb/auto";

describe("Sync Queue", () => {
  beforeEach(async () => {
    await clear();
  });

  describe("Exponential Backoff Retry", () => {
    it("should enqueue operation with initial state", async () => {
      const operation: SyncOperation = {
        id: "op-1",
        entity: "customers",
        operation: "insert",
        entityId: "customer-123",
        data: { name: "John" },
        timestamp: Date.now(),
        attempts: 0,
      };

      const queued = await enqueue(operation);

      expect(queued.status).toBe("pending");
      expect(queued.retryCount).toBe(0);
      expect(queued.id).toBe("op-1");
    });

    it("should increment retryCount on failure", async () => {
      const operation: SyncOperation = {
        id: "op-fail",
        entity: "customers",
        operation: "insert",
        entityId: "c-1",
        data: {},
        timestamp: Date.now(),
        attempts: 0,
      };

      await enqueue(operation);
      await markFailed("op-fail", "Network error", true);
      const failed = await getOperationById("op-fail");
      expect(failed?.retryCount).toBe(1);

    it("should store lastError message", async () => {
      const operation: SyncOperation = {
        id: "op-err",
        entity: "sales",
        operation: "update",
        entityId: "s-1",
        data: {},
        timestamp: Date.now(),
        attempts: 0,
      };

      const errorMsg = "Connection refused";
      await enqueue(operation);
      await markFailed("op-err", errorMsg, true);

      const op = await getOperationById("op-err");
      expect(op?.lastError).toBe(errorMsg);

    it("should mark as failed after MAX_RETRIES", async () => {
      const operation: SyncOperation = {
        id: "op-max-retries",
        entity: "customers",
        operation: "insert",
        entityId: "c-2",
        data: {},
        timestamp: Date.now(),
        attempts: 0,
      };

      await enqueue(operation);

      for (let i = 0; i < 5; i++) {
        await markFailed("op-max-retries", `Failed ${i + 1}`, true);
      }

      const pending = await listPending();
      expect(pending.find((op: QueueOperation) => op.id === "op-max-retries")).toBeUndefined();
    });

    it("should mark immediately failed for non-retryable errors", async () => {
      const operation: SyncOperation = {
        id: "op-non-retryable",
        entity: "customers",
        operation: "insert",
        entityId: "c-3",
        data: {},
        timestamp: Date.now(),
        attempts: 0,
      };

      await enqueue(operation);
      await markFailed("op-non-retryable", "Validation error", false);

      const pending = await listPending();
      expect(pending.find((op: QueueOperation) => op.id === "op-non-retryable")).toBeUndefined();
    });
  });

  describe("Queue Operations", () => {
    it("should list pending operations", async () => {
      const op1: SyncOperation = {
        id: "op-1",
        entity: "customers",
        operation: "insert",
        entityId: "c-1",
        data: { name: "Customer 1" },
        timestamp: Date.now(),
        attempts: 0,
      };

      await enqueue(op1);
      const pending = await listPending();
      expect(pending.length).toBeGreaterThanOrEqual(1);
      expect(pending.some((op: QueueOperation) => op.id === "op-1")).toBe(true);
    });

    it("should mark operation as processed", async () => {
      const operation: SyncOperation = {
        id: "op-process",
        entity: "abonos",
        operation: "insert",
        entityId: "p-1",
        data: { amount: 100 },
        timestamp: Date.now(),
        attempts: 0,
      };

      await enqueue(operation);
      await markProcessed("op-process");

      const pending = await listPending();
      const processed = pending.find((op: QueueOperation) => op.id === "op-process");
      expect(processed).toBeUndefined();
    });

    it("should return empty list when queue is empty", async () => {
      await clear();
      const pending = await listPending();
      expect(pending).toEqual([]);
    });
  });

  describe("Retry Statistics", () => {
    it("should calculate retry statistics", async () => {
      const op1: SyncOperation = {
        id: "op-stat-1",
        entity: "customers",
        operation: "insert",
        entityId: "c-1",
        data: {},
        timestamp: Date.now(),
        attempts: 0,
      };

      const op2: SyncOperation = {
        id: "op-stat-2",
        entity: "customers",
        operation: "insert",
        entityId: "c-2",
        data: {},
        timestamp: Date.now(),
        attempts: 0,
      };

      await enqueue(op1);
      await enqueue(op2);

      await markFailed("op-stat-1", "Error 1", true);
      await markFailed("op-stat-1", "Error 2", true);
      await markFailed("op-stat-2", "Error 1", true);

      const stats = await getRetryStats();
      expect(stats.totalRetries).toBeGreaterThan(0);
    });
  });

  describe("Integration Cycle", () => {
    it("should handle enqueue -> fail -> retry -> success", async () => {
      const operation: SyncOperation = {
        id: "op-cycle",
        entity: "customers",
        operation: "insert",
        entityId: "c-1",
        data: { name: "Integration Test" },
        timestamp: Date.now(),
        attempts: 0,
      };

      const queued = await enqueue(operation);
      expect(queued.status).toBe("pending");

      await markFailed("op-cycle", "Network timeout", true);
      let op = await getOperationById("op-cycle");
      expect(op?.retryCount).toBe(1);
      await markFailed("op-cycle", "Still failing", true);
      op = await getOperationById("op-cycle");
      expect(op?.retryCount).toBe(2);
      await markProcessed("op-cycle");
      const pending = await listPending();
      expect(pending.find((o: QueueOperation) => o.id === "op-cycle")).toBeUndefined();
    });
  });
});
