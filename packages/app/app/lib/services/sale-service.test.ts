/**
 * Unit tests for SaleService FK-reference migration
 * Verifies that syncGroupId is no longer used - items use FK references instead
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { SaleService, type CreateSaleInput, type CreateSaleItemInput } from "./sale-service";

// Mock SyncService - captures all enqueue calls for verification
const mockSyncService = {
  enqueue: vi.fn().mockResolvedValue("op-1"),
  processPending: vi.fn().mockResolvedValue({ processed: 0, failed: 0, conflicts: 0 }),
  getPendingCount: vi.fn().mockResolvedValue(0),
  getConflicts: vi.fn().mockResolvedValue([]),
};

// Mock PGlite
const createMockPg = () => {
  const mockPg = {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    exec: vi.fn().mockResolvedValue(undefined),
  } as unknown as PGlite;
  return mockPg;
};

// Mock Drizzle with proper chainable API
const createMockDb = () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    returning: vi.fn().mockResolvedValue([]),
  };
  return mockDb as unknown as ReturnType<typeof drizzle>;
};

// Helper to check if any enqueue call uses syncGroupId
function hasSyncGroupIdCall(mock: typeof mockSyncService.enqueue): boolean {
  return mock.mock.calls.some(call => call[4] !== undefined);
}

describe("SaleService FK Reference Migration", () => {
  let service: SaleService;
  let mockPg: PGlite;
  let mockDb: ReturnType<typeof drizzle>;

  const businessId = "biz-123";
  const businessUserId = "user-456";

  beforeEach(() => {
    vi.clearAllMocks();
    mockPg = createMockPg();
    mockDb = createMockDb();
    service = new SaleService(mockPg, mockDb, mockSyncService as any, businessId, businessUserId);
  });

  describe("No syncGroupId usage - all operations use FK references", () => {
    it("createDraft should NOT use syncGroupId", async () => {
      mockPg.query.mockResolvedValue({ rows: [] });
      mockPg.exec.mockResolvedValue(undefined);

      await service.createDraft({
        sellerId: "seller-1",
        type: "instant_sale",
      });

      // Verify no enqueue call has syncGroupId
      expect(hasSyncGroupIdCall(mockSyncService.enqueue)).toBe(false);
    });

    it("confirm should NOT use syncGroupId", async () => {
      // Mock findById with items
      mockPg.query
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: "sale-123", type: "instant_sale", status: "draft",
            customer_id: null, payment_mode: "pago_total", amount_paid: "0",
            sync_group_id: null, sale_type: "contado", total_amount: "100", balance_due: "100"
          }] 
        }) // SELECT sale
        .mockResolvedValueOnce({ 
          rows: [{ id: "item-1", subtotal: "100", quantity: "1" }] 
        }) // SELECT items
        .mockResolvedValueOnce({ rows: [{ id: "sale-123" }] }); // UPDATE

      mockPg.exec.mockResolvedValue(undefined);

      await service.confirm("sale-123");

      expect(hasSyncGroupIdCall(mockSyncService.enqueue)).toBe(false);
    });

    it("cancel should NOT use syncGroupId", async () => {
      // Mock findById
      mockPg.query
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: "sale-123", type: "instant_sale", status: "draft",
            customer_id: null, sync_group_id: null, refund_amount: null,
          }] 
        }) // SELECT sale
        .mockResolvedValueOnce({ rows: [] }) // SELECT items
        .mockResolvedValueOnce({ rows: [{ id: "sale-123" }] }); // UPDATE

      mockPg.exec.mockResolvedValue(undefined);

      await service.cancel("sale-123", "Customer requested");

      expect(hasSyncGroupIdCall(mockSyncService.enqueue)).toBe(false);
    });

    it("deliver should NOT use syncGroupId", async () => {
      mockPg.query
        .mockResolvedValueOnce({ 
          rows: [{ id: "sale-123", type: "pre_order", status: "confirmed",
                   customer_id: null, sale_type: "contado" }] 
        }) // SELECT sale
        .mockResolvedValueOnce({ rows: [{ id: "sale-123" }] }); // UPDATE

      mockPg.exec.mockResolvedValue(undefined);

      await service.deliver("sale-123");

      expect(hasSyncGroupIdCall(mockSyncService.enqueue)).toBe(false);
    });
  });

  describe("generateSyncGroup is no longer called", () => {
    it("SaleService class does not reference generateSyncGroup", async () => {
      // Read the source file and verify it doesn't contain generateSyncGroup
      const fs = await import("fs");
      const path = await import("path");
      const sourceFile = path.join(process.cwd(), "app/lib/services/sale-service.ts");
      const source = fs.readFileSync(sourceFile, "utf-8");
      
      expect(source).not.toContain("generateSyncGroup");
      expect(source).not.toContain("getSaleSyncGroupId");
    });
  });
});
