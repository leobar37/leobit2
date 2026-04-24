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
/** @deprecated Use createStorageAdapter() from ./storage instead */
export { createLocalStorageCursorStorage } from "./local-storage-cursor";

// Storage abstraction
export {
  StorageAdapter,
  createStorageAdapter,
  createLocalStorageBackend,
  createNoOpStorage,
  createMemoryStorage,
  resolveStorageKey,
} from "./storage";

export type {
  IKVStorage,
  StorageKeyConfig,
  StorageKeyKind,
  LogoutCleanupConfig,
  StorageConfig,
} from "./storage";

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

// File upload service
export {
  FileUploadServiceImpl,
  getFileUploadService,
  resetFileUploadService,
  saveTemp,
  uploadFile,
  isUploaded,
  getTemp,
  removeTemp,
  getPendingUploads,
  clearAll,
  type FileUploadMetadata,
  type PendingFileUpload,
  type FileUploadResult,
} from "./file-upload-service";
