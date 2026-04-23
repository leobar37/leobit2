import { describe, it, expect, vi, beforeEach } from "vitest";
import { PushSyncService } from "../push-service";
import type { PGlite } from "@electric-sql/pglite";
import type { ISyncQueue, ISyncHttpClient, SyncOperationRecord, HandlerResult } from "../../core";

describe("PushSyncService", () => {
  let pg: ReturnType<typeof createMockPg>;
  let queue: ISyncQueue;
  let httpClient: ISyncHttpClient;
  let service: PushSyncService;

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

  function createMockHttpClient(): ISyncHttpClient {
    return {
      sendBatch: vi.fn().mockResolvedValue([]),
      fetchChanges: vi.fn().mockResolvedValue({ changes: [], cursor: null, hasMore: false }),
    };
  }

  function createContext() {
    return {
      pg,
      db: {} as any,
      tenantId: "tenant-1",
      tenantColumn: "tenant_id",
      userId: "user-1",
      syncService: null as any,
    };
  }

  beforeEach(() => {
    pg = createMockPg();
    queue = createMockQueue();
    httpClient = createMockHttpClient();
    service = new PushSyncService(createContext(), {
      queue,
      httpClient,
    });
  });

  describe("initialization", () => {
    it("initializes successfully", async () => {
      await service.initialize();
      expect(service.isRunning()).toBe(false);
    });

    it("throws when not initialized", async () => {
      await expect(service.enqueue({ entity_type: "test", operation: "create", entityId: "1", data: {} }))
        .rejects.toThrow("not initialized");
    });
  });

  describe("enqueue", () => {
    it("delegates to queue", async () => {
      await service.initialize();
      await service.enqueue({ entity_type: "test", operation: "create", entityId: "1", data: {} });
      expect(queue.enqueue).toHaveBeenCalled();
    });
  });

  describe("processPending", () => {
    it("returns empty result when no pending operations", async () => {
      await service.initialize();
      const result = await service.processPending(true);
      expect(result).toEqual({ processed: 0, failed: 0, conflicts: 0 });
    });

    it("processes successful operations", async () => {
      await service.initialize();
      const operations: SyncOperationRecord[] = [
        { id: "op-1", tenant_id: "tenant-1", entity_type: "customers", operation: "create", entity_id: "1", payload: {}, status: "pending", version: 1, sync_attempts: 0, last_error: null, last_attempt_at: null, idempotency_key: null, created_at: "", updated_at: "" },
      ];
      
      (pg.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: operations });
      (httpClient.sendBatch as ReturnType<typeof vi.fn>).mockResolvedValue([
        { success: true, idempotencyKey: "op-1", serverTimestamp: new Date().toISOString() },
      ]);

      const result = await service.processPending(true);
      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
    });

    it("handles failed operations", async () => {
      await service.initialize();
      const operations: SyncOperationRecord[] = [
        { id: "op-1", tenant_id: "tenant-1", entity_type: "customers", operation: "create", entity_id: "1", payload: {}, status: "pending", version: 1, sync_attempts: 0, last_error: null, last_attempt_at: null, idempotency_key: null, created_at: "", updated_at: "" },
      ];
      
      (pg.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: operations });
      (httpClient.sendBatch as ReturnType<typeof vi.fn>).mockResolvedValue([
        { success: false, idempotencyKey: "op-1", error: "Server error", serverTimestamp: new Date().toISOString() },
      ]);

      const result = await service.processPending(true);
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
    });

    it("records backoff on failure", async () => {
      await service.initialize();
      const operations: SyncOperationRecord[] = [
        { id: "op-1", tenant_id: "tenant-1", entity_type: "customers", operation: "create", entity_id: "1", payload: {}, status: "pending", version: 1, sync_attempts: 0, last_error: null, last_attempt_at: null, idempotency_key: null, created_at: "", updated_at: "" },
      ];
      
      (pg.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: operations });
      (httpClient.sendBatch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

      await service.processPending(true);
      expect(service.getBackoffAtMax()).toBe(false);
    });
  });

  describe("backoff", () => {
    it("resets backoff", async () => {
      await service.initialize();
      service.resetBackoff();
      expect(service.getBackoffAtMax()).toBe(false);
    });
  });

  describe("auto sync", () => {
    it("starts and stops auto sync", async () => {
      await service.initialize();
      service.startAutoSync();
      expect(service.isRunning()).toBe(true);
      service.stopAutoSync();
      expect(service.isRunning()).toBe(false);
    });
  });

  describe("dead letter", () => {
    it("gets dead letter operations from queue", async () => {
      await service.initialize();
      await service.getDeadLetterOperations();
      expect(queue.getDeadLetterOperations).toHaveBeenCalledWith(100);
    });

    it("clears dead letter operations", async () => {
      await service.initialize();
      (queue.getDeadLetterOperations as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const result = await service.clearDeadLetterOperations();
      expect(result).toBe(0);
    });
  });

  describe("status", () => {
    it("gets queue status", async () => {
      await service.initialize();
      await service.getStatus();
      expect(queue.getStatus).toHaveBeenCalled();
    });

    it("logs detailed status without errors", async () => {
      await service.initialize();
      await service.logDetailedStatus(); // should not throw
    });
  });

  describe("backend conflicts", () => {
    it("returns default when HTTP client lacks getConflicts", async () => {
      await service.initialize();
      const result = await service.getBackendConflicts();
      expect(result).toEqual({ success: false, data: { conflicts: [], pendingCount: 0 } });
    });
  });
});
