// Queue interface
export type { ISyncQueue } from "../queue/sync-queue";

/**
 * Sync Types Index
 *
 * Barrel export for all sync types.
 */

// Operations types
export { SYNC_STATUS_ENTITY_TABLES, SELF_HEAL_INSERTABLE_ENTITIES } from "./operations.types";
export { normalizeDatesToISO, buildPlaceholders, parsePayload, validateEntityTableName } from "./operations.types";
export type { EnqueueParams } from "./operations.types";
export type { SyncOperationRecord } from "./operations.types";
export type { SyncStatus } from "./operations.types";
export type { BatchSyncResponse } from "./operations.types";

// Error types
export { SyncErrorCode, classifyError } from "./error.types";
export type { ClassifiedError } from "./error.types";

// Dead letter types
export type { DeadLetterOperationRecord } from "./dead-letter.types";

// Conflict types
export type { BackendConflict, ConflictResolution, SyncApiResult } from "./conflict.types";
export type { BackendConflictListResponse } from "./conflict.types";
export type { BackendConflictResponse } from "./conflict.types";

// Queue options for getPending priority ordering
export interface QueueOptions {
  includePriority?: boolean;
  groupBySyncGroupId?: boolean;
}
