/**
 * PGlite Module Entrypoint
 *
 * Exports PGlite-specific sync implementations for frontend use.
 * This module provides:
 * - Change application (server → client)
 * - Pull service (fetching changes from server)
 * - Sync queue interface
 * - Schema mapping utilities
 * - Logging utilities
 *
 * ## Usage
 *
 * ```typescript
 * import { PullService, applyChange } from "@avileo/drizzle-sync/pglite";
 *
 * const pullService = new PullService(pg, null, {
 *   businessId: "business-123",
 *   authToken: "token",
 * });
 *
 * await pullService.initialize();
 * await pullService.pull();
 * ```
 *
 * ## Dependencies
 *
 * - `@electric-sql/pglite` - PGlite database
 * - `drizzle-orm/pglite` - Drizzle ORM for PGlite
 *
 * ## Integration Notes
 *
 * The PGlite module is designed to work with the Avileo frontend app.
 * When integrating, you'll need to provide:
 *
 * 1. **Cursor Storage**: Implement `ICursorStorage` for persisting sync cursors
 *    (typically using localStorage in the browser)
 *
 * 2. **Sync Mutex**: Implement `ISyncMutex` for coordinating push/pull operations
 *    (to prevent concurrent modifications to the same entities)
 *
 * 3. **Online Detection**: Provide an `isOnline` function for detecting network status
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Pull sync types
  PullChange,
  PullResponse,
  PullResult,
  PullStatus,

  // Change application types
  ChangeApplicationResult,
  ApplyChangeOptions,
  ApplyChangesBatchResult,
  ConflictStrategy,

  // Logger types
  SyncLogLevel,
  SyncLogEntry,
} from "./types";

// Re-export queue types from core (for backward compatibility)
export type { ISyncQueue, QueueOptions } from "../core";

// ============================================================================
// Pull Service
// ============================================================================

export {
  PullService,
  type PullServiceOptions,
  type PullServiceEvents,
  type ICursorStorage,
  type ISyncMutex,
} from "./pull-service";

// ============================================================================
// Change Applier
// ============================================================================

export {
  applyChange,
  applyChangesBatch,
} from "./change-applier";

// ============================================================================
// Schema Mapper
// ============================================================================

export {
  // Table validation
  VALID_TABLES,
  isValidTableName,
  getTableColumns,
  isValidColumn,
  getInvalidColumns,

  // Column utilities
  filterValidColumns,
  toSnakeCase,

  // Relation detection
  isRelationField,

  // Types
  type TableMap,

  // Dynamic schema mapper (NEW)
  createSchemaMapper,
  type SchemaMapper,
} from "./schema-mapper";

// ============================================================================
// Sync Logger
// ============================================================================

export {
  SyncLogger,
  syncLogger,
} from "./sync-logger";

// ============================================================================
// Sync Events (re-exported from core for convenience)
// ============================================================================

export type {
  ISyncEventEmitter,
  SyncEventType,
  PullCompleteEvent,
  PullStaleEvent,
  PullErrorEvent,
  SyncEventHandler,
  Unsubscribe,
} from "../core";

export {
  SyncEventEmitter,
  NoOpSyncEventEmitter,
  noOpSyncEventEmitter,
  createSyncEventEmitter,
} from "../core";

// ============================================================================
// Sync Queue
// ============================================================================

export {
  PgSyncQueue,
  OPERATION_STATUS,
  type PgSyncQueueOptions,
  type EntityPriorityConfig,
} from "./pg-sync-queue";
