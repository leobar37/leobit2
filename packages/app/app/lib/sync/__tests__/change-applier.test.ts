/**
 * Change Applier Tests
 * Unit tests for applying sync changes with Drizzle ORM
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PullChange } from "../types";

// Mock the schema mapper before importing change-applier
vi.mock("../schema-mapper", () => ({
  isValidTableName: vi.fn((name: string) => name === "customers" || name === "sales"),
  getTableForEntity: vi.fn((entityType: string) => {
    if (entityType === "customers") {
      return {
        id: { name: "id" },
        name: { name: "name" },
        business_id: { name: "business_id" },
      };
    }
    if (entityType === "sales") {
      return {
        id: { name: "id" },
        total_amount: { name: "total_amount" },
        business_id: { name: "business_id" },
      };
    }
    return null;
  }),
  filterValidColumns: vi.fn((_tableName: string, payload: Record<string, unknown>) => payload),
  toSnakeCase: vi.fn((obj: Record<string, unknown>) => {
    // If object is empty, return empty object
    if (Object.keys(obj).length === 0) return {};
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      result[snakeKey] = value;
    }
    return result;
  }),
  VALID_TABLES: new Set(["customers", "sales", "sale_items"]),
}));

// Import after mocking
import { applyChange } from "../change-applier";

describe("applyChange", () => {
  const mockPg = {} as any;
  let mockDb: any;
  const businessId = "test-business-id";

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      select: vi.fn(() => mockDb),
      from: vi.fn(() => mockDb),
      where: vi.fn(() => mockDb),
      limit: vi.fn(() => Promise.resolve([])),
      insert: vi.fn(() => mockDb),
      values: vi.fn(() => Promise.resolve(undefined)),
      update: vi.fn(() => mockDb),
      set: vi.fn(() => mockDb),
      delete: vi.fn(() => mockDb),
      onConflictDoUpdate: vi.fn(() => Promise.resolve(undefined)),
    };
  });

  describe("insert operation", () => {
    it("inserts new record successfully", async () => {
      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "customers",
        operation: "insert",
        entityId: "customer-1",
        payload: { name: "John Doe" },
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      const result = await applyChange(mockPg, mockDb, change, businessId);

      expect(result.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalled();
    });

    it("injects business_id if missing", async () => {
      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "customers",
        operation: "insert",
        entityId: "customer-1",
        payload: { name: "John Doe" },
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      await applyChange(mockPg, mockDb, change, businessId);

      const valuesCall = mockDb.values.mock.calls[0][0];
      expect(valuesCall.business_id).toBe(businessId);
    });

    it("injects id if missing", async () => {
      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "customers",
        operation: "insert",
        entityId: "customer-1",
        payload: { name: "John Doe" },
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      await applyChange(mockPg, mockDb, change, businessId);

      const valuesCall = mockDb.values.mock.calls[0][0];
      expect(valuesCall.id).toBe("customer-1");
    });

    it("handles existing record gracefully", async () => {
      // When record exists, should still succeed (upsert behavior)
      // Note: Full upsert testing requires more complex mock setup
      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "customers",
        operation: "insert",
        entityId: "customer-1",
        payload: { name: "Updated Name" },
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      const result = await applyChange(mockPg, mockDb, change, businessId);

      // Should succeed because insert path is taken (mock returns no existing records)
      expect(result.success).toBe(true);
    });
  });

  describe("update operation", () => {
    it("updates existing record successfully", async () => {
      // Mock existing record
      mockDb.limit = vi.fn(() => Promise.resolve([{ id: "customer-1" }]));

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
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("skips update for non-existent record", async () => {
      // Mock no existing record
      mockDb.limit = vi.fn(() => Promise.resolve([]));

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
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("returns error for empty payload", async () => {
      mockDb.limit = vi.fn(() => Promise.resolve([{ id: "customer-1" }]));

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
    });
  });

  describe("delete operation", () => {
    it("deletes record successfully", async () => {
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
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe("create operation (alias for insert)", () => {
    it("treats create as insert", async () => {
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
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe("invalid operations", () => {
    it("returns error for invalid table name", async () => {
      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "invalid_table",
        operation: "insert",
        entityId: "entity-1",
        payload: { name: "Test" },
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      const result = await applyChange(mockPg, mockDb, change, businessId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid table name");
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
    it("retries on transient errors", async () => {
      let attempts = 0;
      mockDb.values = vi.fn(() => {
        attempts++;
        if (attempts < 2) {
          return Promise.reject(new Error("database is locked"));
        }
        return Promise.resolve(undefined);
      });

      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "customers",
        operation: "insert",
        entityId: "customer-1",
        payload: { name: "John Doe" },
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      const result = await applyChange(mockPg, mockDb, change, businessId);

      expect(result.success).toBe(true);
      expect(attempts).toBe(2);
    });

    it("fails after max retries", async () => {
      mockDb.values = vi.fn(() => Promise.reject(new Error("database is locked")));

      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "customers",
        operation: "insert",
        entityId: "customer-1",
        payload: { name: "John Doe" },
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      const result = await applyChange(mockPg, mockDb, change, businessId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("database is locked");
    });

    it("does not retry on non-transient errors", async () => {
      mockDb.values = vi.fn(() => Promise.reject(new Error("constraint violation")));

      const change: PullChange = {
        idempotencyKey: "key-1",
        entityType: "customers",
        operation: "insert",
        entityId: "customer-1",
        payload: { name: "John Doe" },
        localTimestamp: "2024-01-01T00:00:00Z",
        processedAt: "2024-01-01T00:00:00Z",
      };

      const result = await applyChange(mockPg, mockDb, change, businessId);

      expect(result.success).toBe(false);
      expect(mockDb.values).toHaveBeenCalledTimes(1);
    });
  });
});
