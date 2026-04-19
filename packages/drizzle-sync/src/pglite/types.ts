/**
 * PGlite-specific Sync Types
 *
 * Types specific to the PGlite (frontend) implementation.
 * Extends core types with PGlite-specific interfaces.
 */

import type { SyncOperationRecord, SyncStatus, EnqueueParams, DeadLetterOperationRecord } from "../core";

// ============================================================================
// Pull Sync Types
// ============================================================================

/**
 * A single change received from the server during pull sync.
 */
export interface PullChange {
  /** Unique key for this change */
  idempotencyKey: string;
  /** Entity type (e.g., 'sales', 'customers') */
  entityType: string;
  /** Operation type */
  operation: "create" | "update" | "delete" | "insert";
  /** Entity instance ID */
  entityId: string;
  /** Entity data */
  payload: Record<string, unknown>;
  /** Client timestamp when operation was created */
  localTimestamp: string;
  /** Server timestamp when operation was processed */
  processedAt: string;
}

/**
 * Response from the pull sync endpoint.
 */
export interface PullResponse {
  /** List of changes */
  changes: PullChange[];
  /** Cursor for pagination */
  nextSince: string;
  /** Whether more changes are available */
  hasMore: boolean;
  /** Optional server timestamp */
  serverTimestamp?: string;
}

/**
 * Result of a pull operation.
 */
export interface PullResult {
  /** Whether the pull succeeded */
  success: boolean;
  /** Number of changes applied */
  changesApplied: number;
  /** Whether more changes are available */
  hasMore: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Status of the pull sync service.
 */
export interface PullStatus {
  /** Whether a pull is currently in progress */
  isPulling: boolean;
  /** Time of last successful pull */
  lastPullTime: Date | null;
  /** Last error message */
  lastError: string | null;
  /** Number of consecutive failures */
  consecutiveFailures: number;
  /** Current cursor position */
  cursor: string | null;
  /** Whether sync is stuck (cursor not advancing) */
  isStuck: boolean;
  /** Number of consecutive stale pulls */
  consecutiveStalePulls: number;
}

// ============================================================================
// Change Application Types
// ============================================================================

/**
 * Result of applying a single change.
 */
export interface ChangeApplicationResult {
  /** Whether the change was applied successfully */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Strategy for checking conflicts during change application.
 */
export type ConflictStrategy = "check-db" | "pre-computed-set" | "none";

/**
 * Options for applying a change.
 */
export interface ApplyChangeOptions {
  /** Number of retries on transient errors (default: 3) */
  maxRetries?: number;
  /** Whether to check for conflicts with local unsynced changes */
  checkConflicts?: boolean;
  /** Conflict checking strategy */
  conflictStrategy?: ConflictStrategy;
  /** Pre-computed set of conflicting entity IDs (for "pre-computed-set" strategy) */
  conflictedIds?: Set<string>;
}

/**
 * Result of applying a batch of changes.
 */
export interface ApplyChangesBatchResult {
  /** Entity types that were modified */
  entityTypes: Set<string>;
  /** Changes that failed to apply */
  failedChanges: Array<{ change: PullChange; error: string }>;
  /** Number of changes applied successfully */
  appliedCount: number;
  /** Total number of changes */
  totalCount: number;
}

// ============================================================================
// Queue Interface (PGlite-specific)
// ============================================================================

/**
 * Queue options for getPending priority ordering.
 */
export interface QueueOptions {
  /** Include priority information */
  includePriority?: boolean;
  /** Group operations by syncGroupId */
  groupBySyncGroupId?: boolean;
}

/**
 * Interface for sync queue operations.
 *
 * This is the PGlite-specific interface that matches the existing
 * implementation in packages/app/app/lib/sync/queue/sync-queue.ts.
 */
export interface ISyncQueue {
  /**
   * Add an operation to the queue.
   */
  enqueue(params: EnqueueParams): Promise<string>;

  /**
   * Get pending operations (status = pending or failed).
   */
  getPending(limit: number, options?: QueueOptions): Promise<SyncOperationRecord[]>;

  /**
   * Get a single operation by ID.
   */
  getById(id: string): Promise<SyncOperationRecord | null>;

  /**
   * Get operations by entity type and ID with specific statuses.
   */
  getByEntityType(entityType: string, entityId: string, statuses: string[]): Promise<SyncOperationRecord[]>;

  /**
   * Mark an operation as processing.
   */
  markProcessing(id: string): Promise<void>;

  /**
   * Mark an operation as completed.
   */
  markCompleted(id: string): Promise<void>;

  /**
   * Mark an operation as failed.
   */
  markFailed(id: string, error: string, attempts: number): Promise<void>;

  /**
   * Mark an operation as having a conflict.
   */
  markConflict(id: string, conflictData: unknown): Promise<void>;

  /**
   * Move an operation to the dead letter queue.
   */
  moveToDeadLetter(operation: SyncOperationRecord, error: string): Promise<void>;

  /**
   * Get current queue status counts.
   */
  getStatus(): Promise<SyncStatus>;

  /**
   * Delete an operation from the queue.
   */
  deleteOperation(id: string): Promise<boolean>;

  /**
   * Cleanup completed operations older than specified days.
   */
  cleanupCompleted(olderThanDays: number): Promise<number>;

  /**
   * Retry a failed operation.
   */
  retryOperation(id: string): Promise<boolean>;

  /**
   * Get failed operations.
   */
  getFailedOperations(limit: number): Promise<SyncOperationRecord[]>;

  /**
   * Get dead letter operations.
   */
  getDeadLetterOperations(limit: number): Promise<DeadLetterOperationRecord[]>;
}

// ============================================================================
// Sync Logger Types
// ============================================================================

/**
 * Log level for sync operations.
 */
export type SyncLogLevel = "info" | "warn" | "error";

/**
 * A single log entry.
 */
export interface SyncLogEntry {
  /** Unique identifier */
  id: string;
  /** Timestamp */
  timestamp: Date;
  /** Log level */
  level: SyncLogLevel;
  /** Prefix/category */
  prefix: string;
  /** Log message */
  message: string;
  /** Additional data */
  data?: unknown;
}
