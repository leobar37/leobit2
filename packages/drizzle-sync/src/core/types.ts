/**
 * Core Sync Types
 *
 * Runtime-agnostic types for sync operations, status tracking, and results.
 * These types preserve the exact Avileo sync shapes for compatibility.
 */

import {
  SYNC_STATUS_TRACKED,
  SELF_HEAL_INSERTABLE,
} from "@avileo/shared";

// Re-export from shared for convenience
export { SYNC_STATUS_TRACKED, SELF_HEAL_INSERTABLE };

/**
 * Entity types that are tracked for sync status
 * Alias for compatibility with existing code
 */
export const SYNC_STATUS_ENTITY_TABLES: ReadonlySet<string> = new Set(SYNC_STATUS_TRACKED);

/**
 * Entity types that support self-healing (update → create conversion)
 * Alias for compatibility with existing code
 */
export const SELF_HEAL_INSERTABLE_ENTITIES: ReadonlySet<string> = new Set(SELF_HEAL_INSERTABLE);

// ============================================================================
// Generic Entity Tracking (config-based)
// ============================================================================

export function getSyncStatusTrackedEntities<TEntity extends string>(
  entities: Record<TEntity, { syncStatusField?: string }>
): TEntity[] {
  return (Object.entries(entities) as [TEntity, { syncStatusField?: string }][])
    .filter(([, config]) => config.syncStatusField !== undefined)
    .map(([entity]) => entity);
}

export function getSelfHealEntities<TEntity extends string>(
  entities: Record<TEntity, { selfHeal: boolean }>
): TEntity[] {
  return (Object.entries(entities) as [TEntity, { selfHeal: boolean }][])
    .filter(([, config]) => config.selfHeal)
    .map(([entity]) => entity);
}

export function entityTracksSyncStatus<TEntity extends string>(
  entity: TEntity,
  entities: Record<TEntity, { syncStatusField?: string }>
): boolean {
  return entities[entity]?.syncStatusField !== undefined;
}

export function entitySupportsSelfHeal<TEntity extends string>(
  entity: TEntity,
  entities: Record<TEntity, { selfHeal: boolean }>
): boolean {
  return entities[entity]?.selfHeal === true;
}

/**
 * Operation types supported by the sync system
 */
export type SyncOperationType = "create" | "update" | "delete";

/**
 * Status values for sync operations
 */
export type SyncStatusType =
  | "pending"
  | "processing"
  | "syncing"
  | "completed"
  | "failed"
  | "conflict"
  | "dead_letter";

/**
 * Parameters for enqueueing a sync operation
 * Uses snake_case field names for DB compatibility
 */
export interface EnqueueParams {
  /** Entity type (e.g., 'sales', 'customers') - snake_case for DB */
  entity_type: string;
  /** Entity instance ID */
  entityId: string;
  /** Operation type */
  operation: SyncOperationType;
  /** Operation payload (entity data) */
  data: Record<string, unknown>;
  /** Optional unique key for idempotency (auto-generated if not provided) */
  idempotencyKey?: string;
  /**
   * Fast-path flag for hot paths.
   * When true, skips precheck/coalescing lookup work for lower latency.
   */
  fastPath?: boolean;
}

/**
 * Record representing a sync operation in the database
 * Uses snake_case field names matching the DB schema
 */
export interface SyncOperationRecord {
  /** Unique identifier for the operation */
  id: string;
  /** Business/tenant ID for multi-tenancy - snake_case for DB */
  business_id: string;
  /** Entity type (e.g., 'sales', 'customers') - snake_case for DB */
  entity_type: string;
  /** Operation type */
  operation: SyncOperationType;
  /** Entity instance ID - snake_case for DB */
  entity_id: string;
  /** Operation payload (entity data) */
  payload: unknown;
  /** Current sync status */
  status: string;
  /** Version number for optimistic locking */
  version: number;
  /** Number of sync attempts - snake_case for DB */
  sync_attempts: number;
  /** Last error message (if failed) - snake_case for DB */
  last_error: string | null;
  /** Timestamp of last attempt - snake_case for DB */
  last_attempt_at: string | null;
  /** Unique key for idempotency - snake_case for DB */
  idempotency_key: string | null;
  /** Creation timestamp (ISO string) - snake_case for DB */
  created_at: string;
  /** Last update timestamp (ISO string) - snake_case for DB */
  updated_at: string;
}

/**
 * Compatibility alias - SyncOperation = SyncOperationRecord
 * For gradual migration support
 */
export type SyncOperation = SyncOperationRecord;

/**
 * Aggregated sync status across all operations
 */
export interface SyncStatus {
  /** Number of pending operations */
  pending: number;
  /** Number of processing operations */
  processing: number;
  /** Number of syncing operations */
  syncing: number;
  /** Number of completed operations */
  completed: number;
  /** Number of failed operations */
  failed: number;
  /** Number of conflict operations */
  conflict: number;
  /** Number of dead letter operations */
  deadLetter: number;
  /** Total operations in queue */
  total: number;
}

/**
 * Response from a batch sync operation
 */
export interface BatchSyncResponse {
  /** Individual operation results */
  results: Array<{
    /** Idempotency key from the original operation */
    idempotencyKey: string;
    /** Whether the operation succeeded */
    success: boolean;
    /** Error message if failed */
    error?: string;
    /** Conflict details if version conflict detected */
    conflict?: {
      /** Server's version number */
      serverVersion: number;
      /** Server's current data */
      serverData: Record<string, unknown>;
      /** Optional suggested merge */
      suggestedMerge: Record<string, unknown>;
    };
  }>;
}

/**
 * Backend conflict record (from server)
 */
export interface BackendConflict {
  /** Unique identifier */
  id: string;
  /** Business/tenant ID */
  businessId: string;
  /** Original operation ID */
  operationId: string;
  /** Entity type */
  entityType: string;
  /** Entity instance ID */
  entityId: string;
  /** Client's data */
  localData: Record<string, unknown>;
  /** Server's data */
  serverData: Record<string, unknown>;
  /** Client's version number */
  localVersion: number;
  /** Server's version number */
  serverVersion: number;
  /** Conflict status */
  status: "pending" | "resolved";
  /** Resolution chosen */
  resolution: "server" | "local" | "merge" | null;
  /** User who resolved the conflict */
  resolvedBy: string | null;
  /** Timestamp when resolved */
  resolvedAt: string | null;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Response for list of backend conflicts
 */
export interface BackendConflictListResponse {
  success: boolean;
  data: {
    conflicts: BackendConflict[];
    pendingCount: number;
    pagination: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}

/**
 * Response for single backend conflict
 */
export interface BackendConflictResponse {
  success: boolean;
  data: BackendConflict;
}

/**
 * Conflict resolution choice
 */
export interface ConflictResolution {
  /** Resolution strategy */
  resolution: "server" | "local" | "merge";
  /** Merged data (if resolution is 'merge') */
  mergedData?: Record<string, unknown>;
}

/**
 * Result of a single sync API operation
 */
export interface SyncApiResult {
  /** Idempotency key from the original operation */
  idempotencyKey: string;
  /** Whether the operation succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Conflict details if version conflict detected */
  conflict?: {
    serverVersion: number;
    serverData: Record<string, unknown>;
  };
}

/**
 * Error codes for structured error handling
 */
export enum SyncErrorCode {
  RECORD_NOT_FOUND = "RECORD_NOT_FOUND",
  VERSION_CONFLICT = "VERSION_CONFLICT",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  RATE_LIMITED = "RATE_LIMITED",
  UNKNOWN = "UNKNOWN",
}

/**
 * Classified error for structured error handling
 */
export interface ClassifiedError {
  /** Error code */
  code: SyncErrorCode;
  /** Whether the error is retryable */
  isRetryable: boolean;
  /** Whether the error can be self-healed (update→create) */
  isSelfHealable: boolean;
  /** Original error message */
  originalError: string;
}

/**
 * Dead letter operation record
 *
 * Represents an operation that exceeded retry limits and was moved
 * to the dead letter queue for manual intervention.
 */
export interface DeadLetterOperationRecord {
  /** Unique identifier */
  id: string;
  /** Business/tenant ID - snake_case for DB */
  business_id: string;
  /** Original operation ID - snake_case for DB */
  operation_id: string;
  /** Entity type - snake_case for DB */
  entity_type: string;
  /** Operation type */
  operation: SyncOperationType;
  /** Entity instance ID - snake_case for DB */
  entity_id: string;
  /** Serialized operation data */
  data: string;
  /** Error message */
  error: string;
  /** Number of sync attempts - snake_case for DB */
  sync_attempts: number;
  /** Original error message - snake_case for DB */
  original_error: string | null;
  /** Creation timestamp - snake_case for DB */
  created_at: string;
}

/**
 * Compatibility alias - DeadLetterOperation = DeadLetterOperationRecord
 */
export type DeadLetterOperation = DeadLetterOperationRecord;

// ============================================================================
// Utility Functions
// ============================================================================

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

/**
 * Classify an error using regex patterns for structured error handling
 */
export function classifyError(error: string): ClassifiedError {
  const lower = error.toLowerCase();

  const patterns: Array<{
    code: SyncErrorCode;
    patterns: RegExp[];
    isRetryable: boolean;
    isSelfHealable: boolean;
  }> = [
    {
      code: SyncErrorCode.RECORD_NOT_FOUND,
      patterns: [
        /record.*not found/i,
        /no encontrad[oa]/i,
        /does not exist/i,
        /no existe/i,
        /404/i,
        /not found/i,
      ],
      isRetryable: false,
      isSelfHealable: true,
    },
    {
      code: SyncErrorCode.VERSION_CONFLICT,
      patterns: [
        /version.*conflict/i,
        /optimistic.*lock/i,
        /concurrent.*modification/i,
        /409/i,
      ],
      isRetryable: false,
      isSelfHealable: false,
    },
    {
      code: SyncErrorCode.NETWORK_ERROR,
      patterns: [
        /network.*error/i,
        /timeout/i,
        /connection.*refused/i,
        /fetch.*failed/i,
        /abort/i,
        /offline/i,
      ],
      isRetryable: true,
      isSelfHealable: false,
    },
    {
      code: SyncErrorCode.PERMISSION_DENIED,
      patterns: [
        /permission.*denied/i,
        /unauthorized/i,
        /forbidden/i,
        /403/i,
        /401/i,
      ],
      isRetryable: false,
      isSelfHealable: false,
    },
    {
      code: SyncErrorCode.VALIDATION_ERROR,
      patterns: [
        /validation.*failed/i,
        /invalid.*input/i,
        /required.*field/i,
        /constraint.*violated/i,
        /400/i,
      ],
      isRetryable: false,
      isSelfHealable: false,
    },
  ];

  for (const p of patterns) {
    if (p.patterns.some((regex) => regex.test(lower))) {
      return {
        code: p.code,
        isRetryable: p.isRetryable,
        isSelfHealable: p.isSelfHealable,
        originalError: error,
      };
    }
  }

  return {
    code: SyncErrorCode.UNKNOWN,
    isRetryable: true,
    isSelfHealable: false,
    originalError: error,
  };
}
