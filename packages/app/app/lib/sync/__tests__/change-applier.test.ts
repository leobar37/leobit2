/**
 * Change Applier Tests
 * Unit tests for applying sync changes with raw SQL (PGlite)
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PullChange } from "../types";

// Mock the schema mapper before importing change-applier
vi.mock("../schema-mapper", () => ({
  isValidTableName: vi.fn((name: string) =>
    ["customers", "sales", "products", "product_variants"].includes(name)
  ),
  getTableForEntity: vi.fn((entityType: string) => {
    if (entityType === "customers") return { id: { name: "id" } };
    if (entityType === "sales") return { id: { name: "id" } };
    if (entityType === "products") return { id: { name: "id" } };
    return null;
  }),
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

// Mock the retry-wrapper module (replaces direct backoff mocking)
vi.mock("../retry-wrapper", () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

// Import after mocking
import { applyChange } from "../change-applier";

describe("applyChange", () => {
  let mockPg: any;
  const mockDb = {} as any;
  const businessId = "test-business-id";

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock pg.query for raw SQL operations
    mockPg = {
      query: vi.fn(),
    };
  });

  describe("create operation", () => {
    it("creates new record successfully when no existing record", async () => {
      // Mock: no existing record
      mockPg.query.mockResolvedValueOnce({ rows: [] }); // SELECT returns empty
      mockPg.query.mockResolvedValueOnce({ rows: [] }); // INSERT succeeds

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
      // First call should be SELECT to check existence
      expect(mockPg.query.mock.calls[0][0]).toContain('SELECT id FROM "customers"');
      expect(mockPg.query.mock.calls[0][1]).toEqual(["customer-1"]);
      // Second call should be INSERT
      expect(mockPg.query.mock.calls[1][0]).toContain('INSERT INTO "customers"');
    });

    it("performs upsert when record already exists", async () => {
      // Mock: existing record found
      mockPg.query.mockResolvedValueOnce({ rows: [{ id: "customer-1" }] }); // SELECT returns record
      mockPg.query.mockResolvedValueOnce({ rows: [] }); // UPDATE succeeds

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
      // Second call should be UPDATE (upsert behavior)
      expect(mockPg.query.mock.calls[1][0]).toContain('UPDATE "customers" SET');
    });

    it("injects business_id and id into payload", async () => {
      mockPg.query.mockResolvedValueOnce({ rows: [] }); // No existing
      mockPg.query.mockResolvedValueOnce({ rows: [] }); // INSERT succeeds

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

      // Check that INSERT query contains id and business_id
      const insertCall = mockPg.query.mock.calls[1];
      expect(insertCall[0]).toContain('"id"');
      expect(insertCall[0]).toContain('"business_id"');
      expect(insertCall[1]).toContain("customer-1");
      expect(insertCall[1]).toContain(businessId);
    });
  });

  describe("update operation", () => {
    it("updates existing record successfully", async () => {
      // Mock: record exists
      mockPg.query.mockResolvedValueOnce({ rows: [{ id: "customer-1" }] });
      mockPg.query.mockResolvedValueOnce({ rows: [] }); // UPDATE succeeds

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
      // Mock: no existing record for first SELECT, then no existing for upsert SELECT
      mockPg.query
        .mockResolvedValueOnce({ rows: [] }) // First SELECT returns empty
        .mockResolvedValueOnce({ rows: [] }) // Upsert SELECT returns empty
        .mockResolvedValueOnce({ rows: [] }); // INSERT succeeds

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
      // Third call should be INSERT (converted from update)
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

      // Implementation returns error for empty payload
      expect(result.success).toBe(false);
      expect(result.error).toContain("Empty payload");
      // Empty payload check happens before any SQL query
      expect(mockPg.query).not.toHaveBeenCalled();
    });
  });

  describe("delete operation", () => {
    it("deletes record successfully", async () => {
      mockPg.query.mockResolvedValueOnce({ rows: [] }); // DELETE succeeds

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
      // Implementation includes business_id in DELETE for multi-tenancy safety
      expect(mockPg.query.mock.calls[0][1]).toEqual(["customer-1", businessId]);
    });
  });

  describe("backward compatibility", () => {
    it("handles 'insert' as 'create' for backward compatibility", async () => {
      // Setup mocks for INSERT path - need to reset first
      mockPg.query.mockReset();
      mockPg.query
        .mockResolvedValueOnce({ rows: [] }) // SELECT for existence check
        .mockResolvedValueOnce({ rows: [] }); // INSERT succeeds

      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "customers",
        operation: "insert" as any, // Old operation name
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
      // Mock returns immediately without retry for unit tests
      mockPg.query.mockResolvedValueOnce({ rows: [] }); // No existing
      mockPg.query.mockResolvedValueOnce({ rows: [] }); // INSERT succeeds

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
      // Single call (no retries in mock)
      expect(mockPg.query).toHaveBeenCalled();
    });

    it("returns error for constraint violations", async () => {
      // Non-transient error should fail immediately
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
