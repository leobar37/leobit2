/**
 * Sync Operations Types
 *
 * Core types for sync operations, queue management, and status tracking.
 */

import {
  ENTITY_PRIORITIES,
  SELF_HEAL_INSERTABLE,
  SYNC_STATUS_TRACKED,
} from "@avileo/shared";

/**
 * Entity types that are tracked for sync status
 */
export const SYNC_STATUS_ENTITY_TABLES: ReadonlySet<string> = new Set(SYNC_STATUS_TRACKED);

/**
 * Entity types that support self-healing (update → create conversion)
 */
export const SELF_HEAL_INSERTABLE_ENTITIES: ReadonlySet<string> = new Set(SELF_HEAL_INSERTABLE);

/**
 * Parameters for enqueueing a sync operation
 */
export interface EnqueueParams {
  entity_type: string;
  operation: "create" | "update" | "delete";
  entityId: string;
  data: Record<string, unknown>;
  idempotencyKey?: string;
  syncGroupId?: string;
  fastPath?: boolean;
}

/**
 * Record representing a sync operation in the database
 */
export interface SyncOperationRecord {
  id: string;
  business_id: string;
  entity_type: string;
  operation: "create" | "update" | "delete";
  entity_id: string;
  payload: unknown;
  status: string;
  version: number;
  sync_attempts: number;
  last_error: string | null;
  last_attempt_at: string | null;
  idempotency_key: string | null;
  sync_group_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Aggregated sync status across all operations
 */
export interface SyncStatus {
  pending: number;
  processing: number;
  syncing: number;
  completed: number;
  failed: number;
  conflict: number;
  deadLetter: number;
  total: number;
}

/**
 * Response from a batch sync operation
 */
export interface BatchSyncResponse {
  results: Array<{
    idempotencyKey: string;
    success: boolean;
    error?: string;
    conflict?: {
      serverData: Record<string, unknown>;
      suggestedMerge: Record<string, unknown>;
    };
  }>;
}

/**
 * Recursively converts Date objects to ISO strings for safe JSON serialization.
 * This fixes the bug where Date.toString() produces "Tue Mar 24 2026 19:00:00 GMT-0500"
 * instead of "2026-03-25T00:00:00.000Z".
 */
export function normalizeDatesToISO(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => normalizeDatesToISO(item));
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = normalizeDatesToISO(value);
    }
    return result;
  }

  return obj;
}

/**
 * Build parameterized placeholders for SQL queries
 */
export function buildPlaceholders(count: number, offset: number = 1): string {
  return Array.from({ length: count }, (_, index) => `$${index + offset}`).join(", ");
}

/**
 * Parse payload from string or object
 */
export function parsePayload(payload: unknown): Record<string, unknown> {
  if (!payload) return {};
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof payload === "object") {
    return payload as Record<string, unknown>;
  }
  return {};
}

/**
 * Validate that an entity type is a tracked sync table
 */
export function validateEntityTableName(entityType: string): string | null {
  return SYNC_STATUS_ENTITY_TABLES.has(entityType) ? entityType : null;
}
