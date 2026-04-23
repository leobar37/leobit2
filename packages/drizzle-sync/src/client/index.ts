/**
 * @avileo/drizzle-sync/client
 *
 * Client-side sync engine entry point.
 * Framework-agnostic — no React or TanStack Query dependencies.
 *
 * ## Usage
 *
 * ```typescript
 * import { createSyncClientEngine } from '@avileo/drizzle-sync/client';
 *
 * const engine = createSyncClientEngine({ ... });
 * await engine.initialize();
 * await engine.start();
 * ```
 */

// Engine class
export { SyncClientEngine } from "./sync-client-engine";

export type {
  SyncClientEngine as SyncClientEngineClass,
  InitialSyncProgress,
  InitialSyncResult,
} from "./sync-client-engine";

// Factory function
export { createSyncClientEngine } from "./create-sync-client-engine";

// Configuration types
export type {
  SyncClientEngineConfig,
  SyncClientEngineContext,
  SyncClientEngineCallbacks,
  SyncClientEngineSyncConfig,
  SyncClientEngineStagedConfig,
  SyncClientEngineStatus,
  SyncClientServicePort,
  SyncClientStatusOperations,
  EntityServiceDefinition,
  ISyncClientHttpClient,
  IClientCursorStorage,
  SyncTableEntry,
} from "./types";

export type {
  SyncWritePort,
  EnqueueParams,
  BackendConflict,
  BackendConflictListResponse,
  BackendConflictResponse,
} from "../core";

// Database initialization
export {
  initPgliteDatabase,
  getDatabase,
  disposeDatabase,
  resetDatabase,
  type DatabaseInitConfig,
  type DatabaseInitResult,
} from "./database-init";

// Schema hash
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

// Cursor storage
export { createLocalStorageCursorStorage } from "./local-storage-cursor";

// Fetch HTTP client
export {
  createFetchHttpClient,
  type FetchHttpClientConfig,
} from "./fetch-http-client";

// Re-export event types from core for convenience
export type {
  ISyncEventEmitter,
  SyncEventType,
  SyncEventTypeMap,
  SyncEventHandler,
  Unsubscribe,
  PullCompleteEvent,
  PullStaleEvent,
  PullErrorEvent,
  PushCompleteEvent,
  PushErrorEvent,
  ConflictDetectedEvent,
} from "../core/sync-events";

export {
  SyncEventEmitter,
  NoOpSyncEventEmitter,
  noOpSyncEventEmitter,
  createSyncEventEmitter,
} from "../core/sync-events";
