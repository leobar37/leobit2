/**
 * Core Sync Interfaces
 *
 * Runtime-agnostic interfaces for sync queue, handlers, and observability.
 * These interfaces define the contracts that platform-specific implementations
 * must fulfill.
 */

import type {
  SyncOperationRecord,
  SyncStatus,
  EnqueueParams,
  DeadLetterOperationRecord,
  ClassifiedError,
} from "./types";

/**
 * Queue options for getPending priority ordering
 */
export interface QueueOptions {
  includePriority?: boolean;
  groupBySyncGroupId?: boolean;
}

/**
 * Sync queue interface
 *
 * Abstraction for operation enqueue, dequeue, and status tracking.
 * Implementations: PGlite (frontend), PostgreSQL (backend).
 *
 * Matches the current Avileo sync-queue.ts contract.
 */
export interface ISyncQueue {
  /**
   * Add an operation to the queue
   */
  enqueue(params: EnqueueParams): Promise<string>;

  /**
   * Get pending operations (status = pending or failed)
   */
  getPending(limit: number, options?: QueueOptions): Promise<SyncOperationRecord[]>;

  /**
   * Get a single operation by ID
   */
  getById(id: string): Promise<SyncOperationRecord | null>;

  /**
   * Get operations by entity type and ID with specific statuses
   */
  getByEntityType(entityType: string, entityId: string, statuses: string[]): Promise<SyncOperationRecord[]>;

  /**
   * Mark an operation as processing
   */
  markProcessing(id: string): Promise<void>;

  /**
   * Mark an operation as completed
   */
  markCompleted(id: string): Promise<void>;

  /**
   * Mark an operation as failed
   */
  markFailed(id: string, error: string, attempts: number): Promise<void>;

  /**
   * Mark an operation as having a conflict
   */
  markConflict(id: string, conflictData: unknown): Promise<void>;

  /**
   * Move an operation to the dead letter queue
   */
  moveToDeadLetter(operation: SyncOperationRecord, error: string): Promise<void>;

  /**
   * Get current queue status counts
   */
  getStatus(): Promise<SyncStatus>;

  /**
   * Delete an operation from the queue
   */
  deleteOperation(id: string): Promise<boolean>;

  /**
   * Cleanup completed operations older than specified days
   */
  cleanupCompleted(olderThanDays: number): Promise<number>;

  /**
   * Retry a failed operation
   */
  retryOperation(id: string): Promise<boolean>;

  /**
   * Get failed operations
   */
  getFailedOperations(limit: number): Promise<SyncOperationRecord[]>;

  /**
   * Get dead letter operations
   */
  getDeadLetterOperations(limit: number): Promise<DeadLetterOperationRecord[]>;
}

/**
 * Sync execution context
 *
 * Provides request-scoped context for sync operations.
 */
export interface SyncContext {
  /** Business/tenant ID for multi-tenancy */
  businessId: string;
  /** User performing the operation */
  userId: string;
  /** Correlation ID for distributed tracing */
  correlationId?: string;
  /** Device ID for multi-device tracking */
  deviceId?: string;
}

/**
 * Result from a sync handler execution
 */
export interface HandlerResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Idempotency key from the operation */
  idempotencyKey: string;
  /** Error message if failed */
  error?: string;
  /** Conflict details if version conflict detected */
  conflict?: {
    entityType: string;
    entityId: string;
    clientVersion: number;
    serverVersion: number;
    serverData: Record<string, unknown>;
  };
  /** Server timestamp when processed */
  serverTimestamp: string;
}

/**
 * Sync handler interface
 *
 * Entity-specific handler for processing sync operations.
 * Implementations extend this interface for each entity type.
 */
export interface ISyncHandler {
  /** Entity type this handler processes */
  readonly entityType: string;

  /**
   * Execute a sync operation
   * @param ctx Execution context
   * @param operation Operation to execute
   * @param tx Optional transaction (for batch operations)
   * @returns Handler result
   */
  execute(
    ctx: SyncContext,
    operation: SyncOperationRecord,
    tx?: unknown
  ): Promise<HandlerResult>;

  /**
   * Validate business rules before execution (optional)
   * @param ctx Execution context
   * @param payload Operation payload
   */
  validateBusinessRules?(
    ctx: SyncContext,
    payload: Record<string, unknown>
  ): Promise<void>;

  /**
   * Check if entity supports self-healing (update→create conversion)
   */
  supportsSelfHeal?(): boolean;
}

/**
 * Log levels for sync observability
 */
export type SyncLogLevel = "info" | "warn" | "error" | "debug";

/**
 * Log entry for sync observability
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

/**
 * Sync logger interface
 *
 * Abstraction for sync observability.
 * Implementations: RingBufferLogger (frontend), PinoSyncLogger (backend).
 */
export interface ISyncLogger {
  /**
   * Log an info message
   * @param prefix Category/prefix
   * @param message Log message
   * @param data Additional data
   */
  info(prefix: string, message: string, data?: unknown): void;

  /**
   * Log a warning message
   * @param prefix Category/prefix
   * @param message Log message
   * @param data Additional data
   */
  warn(prefix: string, message: string, data?: unknown): void;

  /**
   * Log an error message
   * @param prefix Category/prefix
   * @param message Log message
   * @param data Additional data
   */
  error(prefix: string, message: string, data?: unknown): void;

  /**
   * Log a debug message
   * @param prefix Category/prefix
   * @param message Log message
   * @param data Additional data
   */
  debug?(prefix: string, message: string, data?: unknown): void;

  /**
   * Get all log entries (optional, for ring-buffer implementations)
   * @returns Array of log entries
   */
  getEntries?(): SyncLogEntry[];

  /**
   * Clear log entries (optional, for ring-buffer implementations)
   */
  clear?(): void;
}

/**
 * HTTP client interface for sync operations
 *
 * Abstraction for making HTTP requests to the sync API.
 */
export interface ISyncHttpClient {
  /**
   * Send a batch of operations to the server
   * @param operations Operations to send
   * @returns Batch result
   */
  sendBatch(operations: SyncOperationRecord[]): Promise<HandlerResult[]>;

  /**
   * Fetch changes from the server (pull sync)
   * @param cursor Last seen cursor
   * @param limit Maximum changes to fetch
   * @returns Changes and new cursor
   */
  fetchChanges(
    cursor?: string,
    limit?: number
  ): Promise<{
    changes: unknown[];
    cursor: string;
    hasMore: boolean;
  }>;
}

/**
 * Conflict resolver interface
 *
 * Abstraction for detecting and resolving sync conflicts.
 */
export interface IConflictResolver {
  /**
   * Check if an operation has a conflict with server data
   * @param operation Client operation
   * @param serverData Server entity data
   * @returns True if conflict detected
   */
  hasConflict(
    operation: SyncOperationRecord,
    serverData: Record<string, unknown>
  ): boolean;

  /**
   * Resolve a conflict
   * @param conflict Conflict data
   * @param resolution Resolution strategy
   * @returns Resolved data
   */
  resolve(
    conflict: {
      localData: Record<string, unknown>;
      serverData: Record<string, unknown>;
      localVersion: number;
      serverVersion: number;
    },
    resolution: "server" | "local" | "merge"
  ): Record<string, unknown>;
}

/**
 * Error classifier interface
 *
 * Abstraction for classifying errors for retry/self-heal decisions.
 */
export interface IErrorClassifier {
  /**
   * Classify an error
   * @param error Error message
   * @returns Classified error
   */
  classify(error: string): ClassifiedError;
}
