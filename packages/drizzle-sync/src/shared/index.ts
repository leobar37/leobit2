/**
 * Shared Module Entrypoint
 *
 * Exports shared constants and utilities.
 */

// Operation status
export {
  OPERATION_STATUS,
  type OperationStatus,
} from "./constants";

// Conflict strategy
export {
  CONFLICT_STRATEGY,
  type ConflictStrategy,
} from "./constants";

// Syncable entities
export {
  SYNCABLE_ENTITIES,
  type SyncableEntity,
} from "./constants";

// Default sync configuration
export {
  DEFAULT_SYNC_CONFIG,
  MAX_RETRIES,
  BATCH_SIZE,
  SYNC_INTERVAL_MS,
  PULL_INTERVAL_MS,
  BACKOFF_BASE_MS,
  BACKOFF_MAX_MS,
  BACKOFF_MULTIPLIER,
  CONCURRENT_OPERATIONS,
  BATCH_TIMEOUT_MS,
  DLQ_MAX_SIZE,
  MAX_STALE_PULLS,
  MAX_EMPTY_PULLS,
} from "./constants";

// Pull stages
export {
  PULL_STAGES,
  type PullStage,
} from "./constants";

// Sync events
export {
  SYNC_EVENTS,
  type SyncEvent,
} from "./constants";
