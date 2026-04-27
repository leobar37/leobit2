/**
 * PGlite Module Entrypoint
 *
 * Exports PGlite-specific sync implementations for frontend use.
 */

// Core services
export { ChangeApplier } from "./change-applier";
export { PgSyncQueue } from "./queue-queue";
export { PushSyncService } from "./push-service";
export { PullSyncService } from "./pull-service";
export { MemoryCursorStorage } from "./pull-types";

// Coordination
export {
  SyncCoordinator,
  createSyncCoordinator,
} from "./coordination-coordinator";

export { StagedPullCoordinator } from "./coordination-staged-pull-coordinator";

// Infra
export { createSqlExecutor, type SqlExecutor } from "./sql-executor";
export { SyncAutoRunner } from "./auto-runner";
export { SyncEntityStatusUpdater } from "./entity-status-updater";
export { SyncOperationLifecycleService } from "./operation-lifecycle";
export { SyncBatchProcessor } from "./batch-processor";

// Config
export {
  REQUIRED_COLUMN_DEFAULTS,
  DEFAULT_CONFLICT_STRATEGY,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_BATCH_CONFIG,
} from "./config-defaults";

// Re-export core types for convenience
export type {
  ISyncQueue,
  ISyncHttpClient,
  ISyncLogger,
} from "../core";

export type {
  PullChange,
  PullResponse,
  PullStatus,
} from "./types";

export { SyncMutex } from "./sync-mutex";
export type { ISyncMutex } from "./sync-mutex";

// Change applier types
export type {
  ApplyResult,
  BatchApplyResult,
  ApplierOptions,
  ConflictStrategy as ConflictCheckStrategy,
} from "./change-types";

// Queue types
export type { QueueOptions } from "./queue-types";

// Push types
export type {
  PushServiceOptions,
  PushResult,
  ConflictStrategy as PushConflictStrategy,
} from "./push-types";

// Pull types
export type {
  PullServiceOptions,
  PullResult,
  PullHttpClient,
  CursorStorage,
} from "./pull-types";

// Coordination types
export type {
  ISyncService,
  IPullService as ICoordinatorPullService,
  SyncCoordinatorOptions,
  SyncCoordinatorStatus,
} from "./coordination-coordinator";

export type {
  StageConfig,
  StageBehaviorConfig,
  SyncStagesConfig,
  StagedPullState,
  StagedPullResult,
  StagedPullProgressCallback,
  IPullService as IStagedPullService,
  StagedPullCoordinatorOptions,
} from "./coordination-staged-pull-coordinator";

// Re-export queue constants and types for app compatibility
export { OPERATION_STATUS } from "./queue-types";
export type { QueueOptions as PgSyncQueueOptions } from "./queue-types";
export type EntityPriorityConfig = Record<string, number>;

// Re-export schema mapper utilities for app compatibility
export {
  VALID_TABLES,
  isValidTableName,
  getTableColumns,
  isValidColumn,
  getInvalidColumns,
  filterValidColumns,
  toSnakeCase,
  isRelationField,
  type TableMap,
  type ChangeApplierConfig,
} from "./schema-mapper";

// Database Adapter
export { PgLiteAdapter } from "./pglite-adapter";

// Schema hash utilities
export {
  computeSchemaHash,
  hasSchemaChanged,
  saveSchemaHash,
  clearSchemaHash,
} from "./schema-hash";

// Pending data export/import
export {
  exportPendingData,
  importPendingData,
  buildPendingDataConfig,
  buildPendingDataFromRegistry,
  type PendingTableConfig,
  type PendingTableData,
  type PendingDataConfig,
} from "./pending-data";

// Backward compatibility exports used by app integrations
export {
  syncLogger,
  applyChange,
  applyChangesBatch,
  type LegacyApplyOptions,
} from "./compat";
