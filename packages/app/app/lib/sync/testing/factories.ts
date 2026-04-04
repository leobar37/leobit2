/**
 * Test Factories for Sync System
 * 
 * Provides factory functions for creating test data and mocks.
 */

import { vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import type { SyncOperationRecord, DeadLetterOperationRecord } from "../sync-service";

export function createSyncOperation(overrides: Partial<SyncOperationRecord> = {}): SyncOperationRecord {
  return {
    id: crypto.randomUUID(),
    business_id: "test-business-id",
    entity_type: "customers",
    operation: "create",
    entity_id: crypto.randomUUID(),
    payload: { name: "Test Customer" },
    status: "pending",
    version: 1,
    sync_attempts: 0,
    last_error: null,
    last_attempt_at: null,
    idempotency_key: crypto.randomUUID(),
    sync_group_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createDeadLetterOperation(overrides: Partial<DeadLetterOperationRecord> = {}): DeadLetterOperationRecord {
  return {
    id: crypto.randomUUID(),
    business_id: "test-business-id",
    operation_id: crypto.randomUUID(),
    entity_type: "customers",
    operation: "create",
    entity_id: crypto.randomUUID(),
    data: JSON.stringify({ name: "Test Customer" }),
    error: "Max retries exceeded",
    sync_attempts: 5,
    original_error: "Network error",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createBatchOperations(count: number): SyncOperationRecord[] {
  return Array.from({ length: count }, (_, i) =>
    createSyncOperation({
      entity_type: i % 2 === 0 ? "customers" : "sales",
      operation: i % 3 === 0 ? "update" : "create",
    })
  );
}

/**
 * Create a mock PGlite instance for testing
 */
export function createMockPGlite(): PGlite {
  return {
    query: vi.fn().mockResolvedValue({ rows: [], affectedRows: 0 }),
    exec: vi.fn().mockResolvedValue(undefined),
    transaction: vi.fn().mockImplementation((fn) => fn({ query: vi.fn() })),
  } as unknown as PGlite;
}

/**
 * Create a mock Drizzle DB instance for testing
 */
export function createMockDrizzleDB(): ReturnType<typeof drizzle> {
  return {
    query: {
      customers: { findMany: vi.fn().mockResolvedValue([]) },
      sales: { findMany: vi.fn().mockResolvedValue([]) },
    },
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
  } as unknown as ReturnType<typeof drizzle>;
}
