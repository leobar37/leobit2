/**
 * Server-side sync framework
 *
 * Exports all server-side sync components:
 * - SyncEngine: Core batch processing engine
 * - ConflictResolver: Version-based conflict detection
 * - BaseSyncHandler: Abstract base for entity handlers
 * - HandlerRegistry: Dynamic handler registration
 * - OperationSorter: Priority-based operation ordering
 * - EntityRegistry: In-batch entity tracking
 * - Repositories: Operation, Conflict, DeadLetter
 * - SyncLogger: Structured logging with metrics
 * - Types: All type definitions
 */

// Core engine
export { SyncEngine, type SyncEngineConfig, type SyncRequestContext, type DbClient } from "./sync-engine";

// Conflict resolution
export {
  BaseVersionConflictResolver,
  NoOpConflictResolver,
  GenericConflictResolverRegistry,
} from "./conflict-resolver";

// Base handler
export { BaseSyncHandler } from "./base-handler";

// Registry components
export { HandlerRegistry, type HandlerFactory, GenericHandlerRegistry, type GenericHandlerFactory, createHandlerRegistry } from "./handler-registry";
export { OperationSorter, type SortResult } from "./operation-sorter";
export { EntityRegistry } from "./entity-registry";

// Repositories
export {
  SyncOperationRepository,
  type SyncOperationRecord,
  type RepositoryRequestContext,
  type ISyncOperationRepository,
  type SyncOperationRepositoryOptions,
} from "./operation-repository";

export {
  SyncConflictRepository,
  type SyncConflict,
  type ConflictResolutionData,
  type ISyncConflictRepository,
} from "./conflict-repository";

export {
  SyncDeadLetterRepository,
  type DeadLetterRecord,
  type ISyncDeadLetterRepository,
} from "./dead-letter-repository";

// Logger
export { SyncLogger, syncLogger, type LogRequestContext } from "./sync-logger";
export {
  SyncLoggerAdapter,
  createSyncLoggerAdapter,
  syncLoggerAdapter,
} from "./sync-logger";

// ============================================================================
// Sync Events (re-exported from core for convenience)
// ============================================================================

export type {
  ISyncEventEmitter,
  SyncEventType,
  PushCompleteEvent,
  ConflictDetectedEvent,
  SyncEventHandler,
  Unsubscribe,
} from "../core";

export {
  SyncEventEmitter,
  NoOpSyncEventEmitter,
  noOpSyncEventEmitter,
  createSyncEventEmitter,
} from "../core";

// Types
export type {
  SyncEntity,
  SyncOperationType,
  SyncOperationInput,
  SyncOperationResult,
  SyncBatchResult,
  SyncContext,
  SyncHandlerResult,
  SyncHandlerDeps,
  ConflictCheckResult,
  IConflictResolver,
  ISyncHandler,
  IPipelineStage,
  SyncPipelineConfig,
  EntityRegistry as IEntityRegistry,
  SyncEngineDeps,
  // Generic types (NEW)
  GenericSyncOperationInput,
  IGenericConflictResolver,
  IGenericSyncHandler,
} from "./types";
