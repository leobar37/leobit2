/**
 * Sync Types
 * Local types not yet available from the framework.
 */

// PullStatus is now re-exported from the framework
export type { PullStatus } from "@avileo/drizzle-sync/pglite";

// Re-export commonly used types from framework for convenience
export type {
  EnqueueParams,
  SyncOperationRecord,
  SyncStatus,
  BatchSyncResponse,
  DeadLetterOperationRecord,
  BackendConflict,
  ConflictResolution,
  SyncApiResult,
  BackendConflictListResponse,
  BackendConflictResponse,
  ClassifiedError,
} from "@avileo/drizzle-sync/core";

export {
  SyncErrorCode,
  classifyError,
  normalizeDatesToISO,
  buildPlaceholders,
  parsePayload,
  validateEntityTableName,
} from "@avileo/drizzle-sync/core";
