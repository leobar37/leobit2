import { describe, it, expect, vi, beforeEach } from "vitest";
import { SyncBatchProcessor } from "../batch-processor";
import type { DatabaseAdapter } from "../../core/database-adapter";
import type { ISyncHttpClient, SyncOperationRecord, HandlerResult } from "../../core";
import { SyncAutoRunner } from "../auto-runner";
import { SyncOperationLifecycleService } from "../operation-lifecycle";
import { SyncEntityStatusUpdater } from "../entity-status-updater";

describe("SyncBatchProcessor", () => {
  let adapter: ReturnType<typeof createMockAdapter>;
  let httpClient: ISyncHttpClient;
  let autoRunner: SyncAutoRunner;
  let lifecycle: SyncOperationLifecycleService;

  function createMockAdapter() {
    return {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      exec: vi.fn().mockResolvedValue(undefined),
      getDb: vi.fn(),
    } as unknown as DatabaseAdapter;
  }

  function createMockHttpClient(): ISyncHttpClient {
    return {
      sendBatch: vi.fn().mockResolvedValue([]),
      fetchChanges: vi.fn().mockResolvedValue({ changes: [], cursor: null, hasMore: false }),
    };
  }

  function createMockLifecycle(): SyncOperationLifecycleService {
    return {
      markProcessing: vi.fn().mockResolvedValue(undefined),
      markCompleted: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined),
      markConflict: vi.fn().mockResolvedValue(undefined),
      getOperation: vi.fn().mockResolvedValue(null),
    } as unknown as SyncOperationLifecycleService;
  }

  function createOperation(
    entityType: string,
    createdAt: string,
    overrides: Partial<SyncOperationRecord> = {}
  ): SyncOperationRecord {
    return {
      id: crypto.randomUUID(),
      tenant_id: "tenant-1",
      entity_type: entityType,
      operation: "create",
      entity_id: "entity-1",
      payload: {},
      status: "pending",
      version: 1,
      sync_attempts: 0,
      last_error: null,
      last_attempt_at: null,
      idempotency_key: null,
      created_at: createdAt,
      updated_at: createdAt,
      ...overrides,
    };
  }

  beforeEach(() => {
    adapter = createMockAdapter();
    httpClient = createMockHttpClient();
    autoRunner = new SyncAutoRunner();
    lifecycle = createMockLifecycle();
  });

  describe("processPending", () => {
    it("returns empty when no pending operations", async () => {
      const processor = new SyncBatchProcessor(adapter, "tenant-1", httpClient, lifecycle, autoRunner, {
        tenantColumn: "tenant_id",
      });

      const result = await processor.processPending(true);
      expect(result).toEqual({ processed: 0, failed: 0, conflicts: 0 });
    });

    it("sorts by entity priority when configured", async () => {
      const op1 = createOperation("sales", "2024-01-01T00:00:00Z");
      const op2 = createOperation("customers", "2024-01-02T00:00:00Z");

      (adapter.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [op1, op2],
      });

      (httpClient.sendBatch as ReturnType<typeof vi.fn>).mockResolvedValue([
        { success: true, idempotencyKey: op1.id, serverTimestamp: new Date().toISOString() },
        { success: true, idempotencyKey: op2.id, serverTimestamp: new Date().toISOString() },
      ]);

      const processor = new SyncBatchProcessor(adapter, "tenant-1", httpClient, lifecycle, autoRunner, {
        tenantColumn: "tenant_id",
        entityPriorities: ["customers", "sales"],
      });

      await processor.processPending(true);

      // customers should be processed before sales
      expect(lifecycle.markProcessing).toHaveBeenNthCalledWith(1, op2.id);
      expect(lifecycle.markProcessing).toHaveBeenNthCalledWith(2, op1.id);
    });

    it("processes operations in batches of configured size", async () => {
      const operations = Array.from({ length: 5 }, (_, i) =>
        createOperation("customers", `2024-01-0${i + 1}T00:00:00Z`)
      );

      (adapter.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: operations,
      });

      (httpClient.sendBatch as ReturnType<typeof vi.fn>).mockResolvedValue(
        operations.map((op) => ({
          success: true,
          idempotencyKey: op.id,
          serverTimestamp: new Date().toISOString(),
        }))
      );

      const processor = new SyncBatchProcessor(adapter, "tenant-1", httpClient, lifecycle, autoRunner, {
        tenantColumn: "tenant_id",
        batchSize: 2,
      });

      const result = await processor.processPending(true);
      expect(result.processed).toBe(5);
      expect(httpClient.sendBatch).toHaveBeenCalledTimes(3); // 2 + 2 + 1
    });

    it("handles partial failure", async () => {
      const op1 = createOperation("customers", "2024-01-01T00:00:00Z");
      const op2 = createOperation("customers", "2024-01-02T00:00:00Z");

      (adapter.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [op1, op2],
      });

      (httpClient.sendBatch as ReturnType<typeof vi.fn>).mockResolvedValue([
        { success: true, idempotencyKey: op1.id, serverTimestamp: new Date().toISOString() },
        { success: false, idempotencyKey: op2.id, error: "Validation failed", serverTimestamp: new Date().toISOString() },
      ]);

      const processor = new SyncBatchProcessor(adapter, "tenant-1", httpClient, lifecycle, autoRunner, {
        tenantColumn: "tenant_id",
      });

      const result = await processor.processPending(true);
      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
    });

    it("handles conflict resolution", async () => {
      const op1 = createOperation("customers", "2024-01-01T00:00:00Z");

      (adapter.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [op1],
      });

      (httpClient.sendBatch as ReturnType<typeof vi.fn>).mockResolvedValue([
        { success: false, idempotencyKey: op1.id, conflict: { serverData: {}, suggestedMerge: {} }, serverTimestamp: new Date().toISOString() },
      ]);

      const processor = new SyncBatchProcessor(adapter, "tenant-1", httpClient, lifecycle, autoRunner, {
        tenantColumn: "tenant_id",
      });

      const result = await processor.processPending(true);
      expect(result.conflicts).toBe(1);
    });

    it("handles batch-level errors", async () => {
      const op1 = createOperation("customers", "2024-01-01T00:00:00Z");

      (adapter.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [op1],
      });

      (httpClient.sendBatch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

      const processor = new SyncBatchProcessor(adapter, "tenant-1", httpClient, lifecycle, autoRunner, {
        tenantColumn: "tenant_id",
      });

      const result = await processor.processPending(true);
      expect(result.failed).toBe(1);
      expect(result.errors).toContain("Network error");
    });
  });
});
