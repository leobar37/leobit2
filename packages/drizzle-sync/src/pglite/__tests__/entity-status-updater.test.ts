import { describe, it, expect, vi } from "vitest";
import { SyncEntityStatusUpdater } from "../entity-status-updater";
import type { PGlite } from "@electric-sql/pglite";
import type { SyncOperationRecord } from "../../core";

describe("SyncEntityStatusUpdater", () => {
  const createMockPg = () =>
    ({
      query: vi.fn().mockResolvedValue({ rows: [] }),
    }) as unknown as PGlite;

  const createOperation = (entityType: string, entityId: string): SyncOperationRecord =>
    ({
      id: "op-1",
      tenant_id: "tenant-1",
      entity_type: entityType,
      entity_id: entityId,
      operation: "create",
      payload: {},
      status: "completed",
      version: 1,
      sync_attempts: 0,
      last_error: null,
      last_attempt_at: null,
      idempotency_key: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }) as SyncOperationRecord;

  describe("markSynced", () => {
    it("updates sync_status for valid entity", async () => {
      const pg = createMockPg();
      const updater = new SyncEntityStatusUpdater(pg, "tenant-1", {
        tenantColumn: "business_id",
        trackedTables: new Set(["customers"]),
      });

      const op = createOperation("customers", "cust-1");
      await updater.markSynced(op);

      expect(pg.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "customers"'),
        expect.arrayContaining(["synced", "cust-1", "tenant-1"])
      );
    });

    it("uses custom tenant column", async () => {
      const pg = createMockPg();
      const updater = new SyncEntityStatusUpdater(pg, "tenant-1", {
        tenantColumn: "business_id",
        trackedTables: new Set(["customers"]),
      });

      const op = createOperation("customers", "cust-1");
      await updater.markSynced(op);

      const queryCall = (pg.query as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(queryCall[0]).toContain('"business_id" = $3');
    });

    it("skips non-tracked tables", async () => {
      const pg = createMockPg();
      const updater = new SyncEntityStatusUpdater(pg, "tenant-1", {
        trackedTables: new Set(["customers"]),
      });

      const op = createOperation("products", "prod-1");
      await updater.markSynced(op);

      expect(pg.query).not.toHaveBeenCalled();
    });

    it("allows all valid tables when trackedTables is empty", async () => {
      const pg = createMockPg();
      const updater = new SyncEntityStatusUpdater(pg, "tenant-1");

      const op = createOperation("customers", "cust-1");
      await updater.markSynced(op);

      expect(pg.query).toHaveBeenCalled();
    });

    it("uses default tenant_id column", async () => {
      const pg = createMockPg();
      const updater = new SyncEntityStatusUpdater(pg, "tenant-1", {
        trackedTables: new Set(["customers"]),
      });

      const op = createOperation("customers", "cust-1");
      await updater.markSynced(op);

      const queryCall = (pg.query as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(queryCall[0]).toContain('"tenant_id" = $3');
    });

    it("catches and logs errors without throwing", async () => {
      const pg = createMockPg();
      (pg.query as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("DB error")
      );
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const updater = new SyncEntityStatusUpdater(pg, "tenant-1", {
        trackedTables: new Set(["customers"]),
      });

      const op = createOperation("customers", "cust-1");
      await updater.markSynced(op); // should not throw

      consoleSpy.mockRestore();
    });
  });
});
