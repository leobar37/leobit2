/**
 * Core Module Entrypoint
 *
 * Exports runtime-agnostic core types, interfaces, and utilities.
 */

// ============================================================================
// Types
// ============================================================================

// Operation types
export type {
  SyncOperationType,
  SyncStatusType,
} from "./types";

// Core sync types (snake_case DB fields)
export type {
  EnqueueParams,
  SyncWritePort,
  SyncOperationRecord,
  SyncOperation, // Compatibility alias
  SyncStatus,
  BatchSyncResponse,
} from "./types";

// Conflict types
export type {
  BackendConflict,
  BackendConflictListResponse,
  BackendConflictResponse,
  ConflictResolution,
  SyncApiResult,
} from "./types";

// Error types
export type { ClassifiedError } from "./types";
export { SyncErrorCode } from "./types";

// Dead letter types
export type {
  DeadLetterOperationRecord,
  DeadLetterOperation, // Compatibility alias
} from "./types";

// Entity tracking sets (from @avileo/shared)
export {
  SYNC_STATUS_TRACKED,
  SELF_HEAL_INSERTABLE,
  SYNC_STATUS_ENTITY_TABLES,
  SELF_HEAL_INSERTABLE_ENTITIES,
} from "./types";

// Generic entity tracking (config-based)
export {
  getSyncStatusTrackedEntities,
  getSelfHealEntities,
  entityTracksSyncStatus,
  entitySupportsSelfHeal,
} from "./types";

// Utility functions
export {
  normalizeDatesToISO,
  buildPlaceholders,
  parsePayload,
  validateEntityTableName,
  classifyError,
} from "./types";

// ============================================================================
// Interfaces
// ============================================================================

export type {
  QueueOptions,
  SyncContext,
  ISyncQueue,
  HandlerResult,
  ISyncHandler,
  SyncLogLevel,
  SyncLogEntry,
  ISyncLogger,
  ISyncHttpClient,
  IConflictResolver,
  IErrorClassifier,
} from "./interfaces";

// ============================================================================
// Priority
// ============================================================================

export type { EntityPriorityConfig, SyncEntity } from "./priority";

export {
  DEFAULT_ENTITY_PRIORITIES,
} from "./priority";

export {
  DEFAULT_PRIORITY,
  getEntityPriorityFromConfig,
  sortEntitiesByPriorityFromConfig,
  groupEntitiesByPriorityFromConfig,
  isParentEntityFromConfig,
  isChildEntityFromConfig,
  getChildEntities,
  getParentEntity,
  buildEntityProcessingOrder,
  buildPriorityConfigFromEntities,
} from "./priority";

// ============================================================================
// Coalesce
// ============================================================================

export type {
  CoalescePlanType,
  CoalescePlan,
} from "./coalesce";

export {
  mergeArrayById,
  deepMerge,
  parsePayload as parsePayloadCoalesce,
  getCoalescePlan,
  canCoalesce,
} from "./coalesce";

// ============================================================================
// Backoff
// ============================================================================

export type {
  BackoffOptions,
  IBackoffStrategy,
  RetryOptions,
} from "./backoff";

export {
  DEFAULT_BACKOFF_CONFIG,
  calculateBackoffDelay,
  ExponentialBackoff,
  isTransientError,
  sleep,
  withRetry,
  createRetryWrapper,
} from "./backoff";

// ============================================================================
// Sync Events
// ============================================================================

// Event types
export type {
  SyncEventType,
  PullCompleteEvent,
  PullStaleEvent,
  PullErrorEvent,
  PushCompleteEvent,
  PushErrorEvent,
  ConflictDetectedEvent,
  SyncEventTypeMap,
} from "./sync-events";

// Handler types
export type {
  SyncEventHandler,
  Unsubscribe,
} from "./sync-events";

// Emitter interface and implementations
export type { ISyncEventEmitter } from "./sync-events";
export {
  SyncEventEmitter,
  NoOpSyncEventEmitter,
  noOpSyncEventEmitter,
  createSyncEventEmitter,
} from "./sync-events";

// Event Buffer (for devtools timeline)
export type { TimelineEvent } from "./event-buffer";
export {
  initializeEventBuffer,
  getEventBuffer,
  clearEventBuffer,
  getEventsByType,
} from "./event-buffer";
