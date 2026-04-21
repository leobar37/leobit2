/**
 * Change Applier Tests
 * Unit tests for applying sync changes with raw SQL (PGlite)
 *
 * Since change-applier.ts now re-exports from @avileo/drizzle-sync/pglite,
 * we mock the library's internal dependencies for unit testing.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@avileo/drizzle-sync/pglite/change-applier", () => {
  const mockApplyChange = vi.fn();
  const mockApplyChangesBatch = vi.fn();

  return {
    applyChange: mockApplyChange,
    applyChangesBatch: mockApplyChangesBatch,
  };
});

// Re-import with proper mocking setup for unit tests
// The actual tests import from the library's real applyChange via change-applier re-export
// Since the library bundles internals, we test against the real implementation
// with a controlled PGlite mock

import type { PullChange } from "../types";

// Mock schema mapper at library level
vi.mock("../../../../../drizzle-sync/src/pglite/schema-mapper", () => ({
  isValidTableName: vi.fn((name: string) =>
    ["customers", "sales", "products", "product_variants"].includes(name)
  ),
  getTableColumns: vi.fn(() => new Set(["id", "business_id", "name", "sync_status", "sync_attempts"])),
  filterValidColumns: vi.fn((_tableName: string, payload: Record<string, unknown>) => payload),
  toSnakeCase: vi.fn((obj: Record<string, unknown>) => {
    if (Object.keys(obj).length === 0) return {};
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      result[snakeKey] = value;
    }
    return result;
  }),
  isRelationField: vi.fn((field: string) => {
    const relationFields = [
      "items", "customer", "seller", "business", "distribucion", "visita",
      "sale", "product", "variant", "supplier", "purchase",
      "advanceProofImage", "cancelledBy", "createdBy", "updatedBy",
    ];
    return relationFields.includes(field);
  }),
  VALID_TABLES: new Set(["customers", "sales", "sale_items", "products", "product_variants"]),
}));

vi.mock("../../../../../drizzle-sync/src/core/backoff", () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
  calculateBackoffDelay: vi.fn(() => 1000),
  isTransientError: vi.fn(() => false),
  sleep: vi.fn(() => Promise.resolve()),
  ExponentialBackoff: vi.fn(),
}));

vi.mock("../../../../../drizzle-sync/src/pglite/sync-logger", () => ({
  SyncLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getEntries: vi.fn(() => []),
  })),
  syncLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getEntries: vi.fn(() => []),
  },
}));

// Import the library's applyChange directly for testing
// Since change-applier.ts is just a re-export, import from library source
import { applyChange } from "../../../../../drizzle-sync/src/pglite/change-applier";

describe("applyChange", () => {
  let mockPg: any;
  const mockDb = {} as any;
  const businessId = "test-business-id";

  beforeEach(() => {
    vi.clearAllMocks();
    mockPg = {
      query: vi.fn(),
    };
  });

  describe("create operation", () => {
    it("creates new record successfully when no existing record", async () => {
      mockPg.query.mockResolvedValueOnce({ rows: [] });
      mockPg.query.mockResolvedValueOnce({ rows: [] });

      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "customers",
        operation: "create",
        entityId: "customer-1",
        payload: { name: "John Doe" },
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      const result = await applyChange(mockPg, mockDb, change, businessId);

      expect(result.success).toBe(true);
      expect(mockPg.query).toHaveBeenCalledTimes(2);
      expect(mockPg.query.mock.calls[0][0]).toContain('SELECT id FROM "customers"');
      expect(mockPg.query.mock.calls[0][1]).toEqual(["customer-1"]);
      expect(mockPg.query.mock.calls[1][0]).toContain('INSERT INTO "customers"');
    });

    it("performs upsert when record already exists", async () => {
      mockPg.query.mockResolvedValueOnce({ rows: [{ id: "customer-1" }] });
      mockPg.query.mockResolvedValueOnce({ rows: [] });

      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "customers",
        operation: "create",
        entityId: "customer-1",
        payload: { name: "John Doe" },
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      const result = await applyChange(mockPg, mockDb, change, businessId);

      expect(result.success).toBe(true);
      expect(mockPg.query).toHaveBeenCalledTimes(2);
      expect(mockPg.query.mock.calls[1][0]).toContain('UPDATE "customers" SET');
    });

    it("injects business_id and id into payload", async () => {
      mockPg.query.mockResolvedValueOnce({ rows: [] });
      mockPg.query.mockResolvedValueOnce({ rows: [] });

      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "customers",
        operation: "create",
        entityId: "customer-1",
        payload: { name: "John Doe" },
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      await applyChange(mockPg, mockDb, change, businessId);

      const insertCall = mockPg.query.mock.calls[1];
      expect(insertCall[0]).toContain('"id"');
      expect(insertCall[0]).toContain('"business_id"');
      expect(insertCall[1]).toContain("customer-1");
      expect(insertCall[1]).toContain(businessId);
    });
  });

  describe("update operation", () => {
    it("updates existing record successfully", async () => {
      mockPg.query.mockResolvedValueOnce({ rows: [{ id: "customer-1" }] });
      mockPg.query.mockResolvedValueOnce({ rows: [] });

      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "customers",
        operation: "update",
        entityId: "customer-1",
        payload: { name: "Updated Name" },
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      const result = await applyChange(mockPg, mockDb, change, businessId);

      expect(result.success).toBe(true);
      expect(mockPg.query).toHaveBeenCalledTimes(2);
      expect(mockPg.query.mock.calls[1][0]).toContain('UPDATE "customers"');
      expect(mockPg.query.mock.calls[1][0]).toContain("WHERE id =");
    });

    it("converts update to insert when record does not exist (upsert)", async () => {
      mockPg.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "customers",
        operation: "update",
        entityId: "customer-1",
        payload: { name: "New Name" },
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      const result = await applyChange(mockPg, mockDb, change, businessId);

      expect(result.success).toBe(true);
      expect(mockPg.query).toHaveBeenCalledTimes(3);
      expect(mockPg.query.mock.calls[2][0]).toContain('INSERT INTO "customers"');
    });

    it("returns error for empty payload", async () => {
      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "customers",
        operation: "update",
        entityId: "customer-1",
        payload: {},
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      const result = await applyChange(mockPg, mockDb, change, businessId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Empty payload");
      expect(mockPg.query).not.toHaveBeenCalled();
    });
  });

  describe("delete operation", () => {
    it("deletes record successfully", async () => {
      mockPg.query.mockResolvedValueOnce({ rows: [] });

      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "customers",
        operation: "delete",
        entityId: "customer-1",
        payload: {},
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      const result = await applyChange(mockPg, mockDb, change, businessId);

      expect(result.success).toBe(true);
      expect(mockPg.query).toHaveBeenCalledTimes(1);
      expect(mockPg.query.mock.calls[0][0]).toContain('DELETE FROM "customers"');
      expect(mockPg.query.mock.calls[0][0]).toContain("WHERE id = $1");
      expect(mockPg.query.mock.calls[0][1]).toEqual(["customer-1", businessId]);
    });
  });

  describe("backward compatibility", () => {
    it("handles 'insert' as 'create' for backward compatibility", async () => {
      mockPg.query.mockReset();
      mockPg.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "customers",
        operation: "insert" as any,
        entityId: "customer-1",
        payload: { name: "John Doe" },
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      const result = await applyChange(mockPg, mockDb, change, businessId);

      expect(result.success).toBe(true);
      expect(mockPg.query).toHaveBeenCalledTimes(2);
    });
  });

  describe("invalid operations", () => {
    it("returns error for invalid table name", async () => {
      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "invalid_table",
        operation: "create",
        entityId: "entity-1",
        payload: { name: "Test" },
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      const result = await applyChange(mockPg, mockDb, change, businessId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid table name");
      expect(mockPg.query).not.toHaveBeenCalled();
    });

    it("returns error for unknown operation", async () => {
      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "customers",
        operation: "unknown" as any,
        entityId: "customer-1",
        payload: { name: "Test" },
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      const result = await applyChange(mockPg, mockDb, change, businessId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown operation");
    });
  });

  describe("retry logic", () => {
    it("applies change successfully (withRetry mock)", async () => {
      mockPg.query.mockResolvedValueOnce({ rows: [] });
      mockPg.query.mockResolvedValueOnce({ rows: [] });

      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "customers",
        operation: "create",
        entityId: "customer-1",
        payload: { name: "John Doe" },
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      const result = await applyChange(mockPg, mockDb, change, businessId);

      expect(result.success).toBe(true);
      expect(mockPg.query).toHaveBeenCalled();
    });

    it("returns error for constraint violations", async () => {
      mockPg.query.mockRejectedValue(new Error("constraint violation: UNIQUE constraint failed"));

      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "customers",
        operation: "create",
        entityId: "customer-1",
        payload: { name: "John Doe" },
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      const result = await applyChange(mockPg, mockDb, change, businessId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("constraint violation");
    });
  });

  describe("error handling", () => {
    it("handles SQL syntax errors gracefully", async () => {
      mockPg.query.mockRejectedValue(new Error("syntax error at or near 'VALUES'"));

      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "customers",
        operation: "create",
        entityId: "customer-1",
        payload: { name: "John Doe" },
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      const result = await applyChange(mockPg, mockDb, change, businessId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("syntax error");
    });

    it("handles connection errors", async () => {
      mockPg.query.mockRejectedValue(new Error("Connection refused"));

      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "customers",
        operation: "create",
        entityId: "customer-1",
        payload: { name: "John Doe" },
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      const result = await applyChange(mockPg, mockDb, change, businessId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Connection refused");
    });
  });
});
