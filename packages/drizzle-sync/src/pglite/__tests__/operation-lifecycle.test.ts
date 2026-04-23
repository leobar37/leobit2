import { describe, it, expect, vi, beforeEach } from "vitest";
import { SyncOperationLifecycleService } from "../operation-lifecycle";
import type { PGlite } from "@electric-sql/pglite";
import type { ISyncQueue, SyncOperationRecord } from "../../core";
import { SyncErrorCode } from "../../core";
import { SyncEntityStatusUpdater } from "../entity-status-updater";
import { OPERATION_STATUS } from "../queue-types";

describe("SyncOperationLifecycleService", () => {
  let pg: ReturnType<typeof createMockPg>;
  let queue: ISyncQueue;
  let updater: SyncEntityStatusUpdater;
  let service: SyncOperationLifecycleService;

  function createMockPg() {
    return {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as PGlite;
  }

  function createMockQueue(): ISyncQueue {
    return {
      enqueue: vi.fn().mockResolvedValue("op-id"),
      getPending: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(null),
      getByEntityType: vi.fn().mockResolvedValue([]),
      markProcessing: vi.fn().mockResolvedValue(undefined),
      markCompleted: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined),
      markConflict: vi.fn().mockResolvedValue(undefined),
      moveToDeadLetter: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockResolvedValue({
        pending: 0, processing: 0, syncing: 0, completed: 0,
        failed: 0, conflict: 0, deadLetter: 0, total: 0,
      }),
      deleteOperation: vi.fn().mockResolvedValue(true),
      cleanupCompleted: vi.fn().mockResolvedValue(0),
      retryOperation: vi.fn().mockResolvedValue(true),
      getFailedOperations: vi.fn().mockResolvedValue([]),
      getDeadLetterOperations: vi.fn().mockResolvedValue([]),
    };
  }

  function createOperation(overrides: Partial<SyncOperationRecord> = {}): SyncOperationRecord {
    return {
      id: "op-1",
      tenant_id: "tenant-1",
      entity_type: "customers",
      operation: "update",
      entity_id: "entity-1",
      payload: {},
      status: "pending",
      version: 1,
      sync_attempts: 0,
      last_error: null,
      last_attempt_at: null,
      idempotency_key: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  beforeEach(() => {
    pg = createMockPg();
    queue = createMockQueue();
    updater = new SyncEntityStatusUpdater(pg, "tenant-1", {
      tenantColumn: "tenant_id",
      trackedTables: new Set(["customers"]),
    });
    service = new SyncOperationLifecycleService(pg, "tenant-1", queue, updater, {
      tenantColumn: "tenant_id",
      selfHealRules: new Set(["customers"]),
    });
  });

  describe("markProcessing", () => {
    it("delegates to queue", async () => {
      await service.markProcessing("op-1");
      expect(queue.markProcessing).toHaveBeenCalledWith("op-1");
    });
  });

  describe("markCompleted", () => {
    it("marks operation completed and updates entity status", async () => {
      const op = createOperation();
      (pg.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [op] });

      await service.markCompleted("op-1");

      expect(queue.markCompleted).toHaveBeenCalledWith("op-1");
    });

    it("handles missing operation gracefully", async () => {
      (pg.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });

      await service.markCompleted("op-1");

      expect(queue.markCompleted).toHaveBeenCalledWith("op-1");
    });
  });

  describe("markFailed", () => {
    it("self-heals update→create for configured entities when record not found", async () => {
      const op = createOperation({ operation: "update", sync_attempts: 0 });
      (pg.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [op] }) // getOperation
        .mockResolvedValueOnce({ rows: [] }); // self-heal update

      await service.markFailed("op-1", "Record not found");

      expect(queue.markFailed).not.toHaveBeenCalled();
      expect(queue.moveToDeadLetter).not.toHaveBeenCalled();
    });

    it("moves to dead letter when max retries exceeded", async () => {
      const op = createOperation({ sync_attempts: 4 });
      (pg.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [op] });

      await service.markFailed("op-1", "Some error");

      expect(queue.moveToDeadLetter).toHaveBeenCalledWith(op, "Some error");
    });

    it("marks failed when retryable and under max retries", async () => {
      const op = createOperation({ sync_attempts: 1 });
      (pg.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [op] });

      await service.markFailed("op-1", "Network timeout");

      expect(queue.markFailed).toHaveBeenCalledWith("op-1", "Network timeout", 2);
    });

    it("does not self-heal for non-configured entities", async () => {
      const op = createOperation({ entity_type: "products", operation: "update" });
      (pg.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [op] });

      await service.markFailed("op-1", "Record not found");

      expect(queue.markFailed).toHaveBeenCalled();
    });
  });

  describe("markConflict", () => {
    it("delegates to queue", async () => {
      const conflictData = { serverData: {}, suggestedMerge: {} };
      await service.markConflict("op-1", conflictData);
      expect(queue.markConflict).toHaveBeenCalledWith("op-1", conflictData);
    });
  });

  describe("dead letter operations", () => {
    it("retries dead letter operation", async () => {
      const dlRecord = {
        id: "dl-1",
        tenant_id: "tenant-1",
        operation_id: "op-1",
        entity_type: "customers",
        operation: "create",
        entity_id: "entity-1",
        data: {},
        error: "failed",
        sync_attempts: 5,
        original_error: "error",
        created_at: new Date().toISOString(),
      };

      (pg.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [dlRecord] }) // getDeadLetterOperation
        .mockResolvedValueOnce({ rows: [{ id: "op-1" }] }) // update sync_operations
        .mockResolvedValueOnce({ rows: [{ id: "dl-1" }] }); // delete dead letter

      const result = await service.retryDeadLetterOperation("dl-1");
      expect(result).toBe(true);
    });

    it("deletes dead letter operation", async () => {
      (pg.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [{ id: "dl-1" }],
      });

      const result = await service.deleteDeadLetterOperation("dl-1");
      expect(result).toBe(true);
    });

    it("clears all dead letter operations", async () => {
      (pg.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [{ id: "dl-1" }, { id: "dl-2" }],
      });

      const result = await service.clearDeadLetterOperations();
      expect(result).toBe(2);
    });
  });

  describe("delete operations", () => {
    it("deletes single operation via queue", async () => {
      const result = await service.deleteOperation("op-1");
      expect(result).toBe(true);
      expect(queue.deleteOperation).toHaveBeenCalledWith("op-1");
    });

    it("deletes multiple operations via SQL", async () => {
      (pg.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [{ id: "op-1" }, { id: "op-2" }],
      });

      const result = await service.deleteOperations(["op-1", "op-2"]);
      expect(result).toBe(2);
    });

    it("returns 0 for empty operation list", async () => {
      const result = await service.deleteOperations([]);
      expect(result).toBe(0);
    });
  });

  describe("custom error classifier", () => {
    it("uses custom classifier when provided", async () => {
      const customClassifier = vi.fn().mockReturnValue({
        code: SyncErrorCode.UNKNOWN,
        isRetryable: false,
        isSelfHealable: true,
        originalError: "custom",
      });

      const customService = new SyncOperationLifecycleService(
        pg, "tenant-1", queue, updater,
        {
          selfHealRules: new Set(["customers"]),
          errorClassifier: customClassifier,
        }
      );

      const op = createOperation({ operation: "update" });
      (pg.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [op] })
        .mockResolvedValueOnce({ rows: [] });

      await customService.markFailed("op-1", "anything");

      expect(customClassifier).toHaveBeenCalledWith("anything");
    });
  });
});
