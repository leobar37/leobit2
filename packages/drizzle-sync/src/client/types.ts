/**
 * SyncClientEngine Configuration Types
 *
 * Framework-agnostic type definitions for the client-side sync engine.
 * No React or TanStack imports — cache integration is callback-only.
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import type { ISyncEventEmitter } from "../core";
import type {
  EnqueueParams,
  SyncStatus,
  SyncOperationRecord,
  DeadLetterOperationRecord,
  BackendConflictListResponse,
  BackendConflictResponse,
  SyncWritePort,
  ISyncLogger,
  ISyncQueue,
} from "../core";
import type { DatabaseInitConfig } from "./database-init";
import type { ConflictStrategy } from "../shared";
import type { PushSyncService } from "../pglite/push-service";
import type { ISyncMutex } from "../pglite/sync-mutex";
import type { PullStatus } from "../pglite/pull-types";
import type { ChangeApplierConfig } from "../pglite/schema-mapper";

export interface SyncClientStatusOperations {
  getStatus(): Promise<SyncStatus>;
  getFailedOperations(): Promise<SyncOperationRecord[]>;
  getProblemOperations(): Promise<SyncOperationRecord[]>;
  getDeadLetterOperations(): Promise<DeadLetterOperationRecord[]>;
  deleteOperation(operationId: string): Promise<boolean>;
  deleteOperations(operationIds: string[]): Promise<number>;
  retryOperation(operationId: string): Promise<boolean>;
  retryDeadLetterOperation(deadLetterId: string): Promise<boolean>;
  deleteDeadLetterOperation(deadLetterId: string): Promise<boolean>;
  clearDeadLetterOperations(): Promise<number>;
  resolveConflict(
    operationId: string,
    resolution: ConflictStrategy,
    mergedData?: Record<string, unknown>
  ): Promise<boolean>;
  processPending(ignoreOnlineCheck?: boolean): Promise<{
    processed: number;
    failed: number;
    conflicts: number;
  }>;
  processGroup(groupId: string): Promise<{ success: boolean; errors: string[] }>;
  getBackendConflicts(options?: {
    status?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  }): Promise<BackendConflictListResponse>;
  getBackendConflict(conflictId: string): Promise<BackendConflictResponse>;
  resolveBackendConflict(
    conflictId: string,
    resolution: "server" | "local" | "merge",
    mergedData?: Record<string, unknown>
  ): Promise<BackendConflictResponse>;
}

export interface SyncClientServicePort
  extends SyncWritePort,
    SyncClientStatusOperations {}

/**
 * Context object passed to entity service factories during registration.
 * Provides all dependencies a domain service needs to operate.
 */
export interface SyncClientEngineContext {
  /** PGlite instance for raw SQL queries */
  pg: PGlite;
  /** Drizzle ORM instance for type-safe queries */
  db: ReturnType<typeof drizzle>;
  /** Business/tenant ID for multi-tenancy */
  tenantId: string;
  /** Tenant partition column for scoped entities */
  tenantColumn: string;
  /** Business user ID for audit trails */
  userId: string;
  /** Sync service for enqueuing operations */
  syncService: SyncWritePort;
}

/**
 * Definition for a single entity service to be registered with the engine.
 * The factory receives a SyncClientEngineContext and returns the service instance.
 */
export interface EntityServiceDefinition<T = unknown> {
  /** Unique name for the service (e.g., 'customers', 'sales') */
  name: string;
  /** Sync entity type string (e.g., 'customers', 'sale_items') */
  entityType: string;
  /** Factory function that creates the service given engine context */
  factory: (context: SyncClientEngineContext) => T;
  /** Optional extra configuration for this service */
  options?: Record<string, unknown>;
}

/**
 * Optional lifecycle callbacks for engine events.
 * Used for cache invalidation, logging, and other side effects
 * without coupling the engine to any specific framework.
 */
export interface SyncClientEngineCallbacks {
  /** Called after a pull completes with applied changes */
  onPullComplete?: (data: { changesApplied: number; entityTypes: string[] }) => void;
  /** Called after a push completes */
  onPushComplete?: (data: { processed: number; failed: number; conflicts: number }) => void;
  /** Called on sync errors */
  onError?: (error: string, context?: string) => void;
  /** Called when sync status changes */
  onStatusChange?: (status: SyncClientEngineStatus) => void;
  /** Called after services are instantiated, before engine state changes to 'initialized' */
  onServicesReady?: (services: Map<string, unknown>) => void | Promise<void>;
}

/**
 * Entry in the sync table registry used for pending data export/import.
 * Auto-generated from entity configuration.
 */
export interface SyncTableEntry {
  /** Database table name */
  name: string;
  /** Entity type identifier */
  entityType: string;
  /** Parent tables this table depends on (for ordering) */
  dependsOn: string[];
}

/**
 * Configuration for sync timing and auto-sync behavior.
 */
export interface SyncClientEngineSyncConfig {
  /** Interval for push (sync) operations in milliseconds (default: 5000) */
  pushIntervalMs?: number;
  /** Interval for pull operations in milliseconds (default: 10000) */
  pullIntervalMs?: number;
  /** Whether to enable auto-sync on start (default: true) */
  enableAutoSync?: boolean;
  /** Base delay for exponential backoff in milliseconds */
  backoffBaseMs?: number;
  /** Maximum backoff delay in milliseconds */
  backoffMaxMs?: number;
}

/**
 * Configuration for staged (prioritized) pull loading.
 */
export interface SyncClientEngineStagedConfig<TStage extends string = string> {
  /** Ordered list of stage definitions */
  stages: Array<{
    name: TStage;
    entities: readonly string[];
    lookbackDays: number | null;
    behavior: {
      maxIterations: number;
      retryAttempts: number;
      retryDelayMs?: number;
      onError: "throw" | "continue";
      batchDelayMs?: number;
    };
  }>;
  /** Progress callback for staged loading */
  onProgress?: (stage: TStage, status: "pending" | "loading" | "complete" | "error", changesApplied: number) => void;
}

/**
 * Combined status returned by the engine.
 */
export interface SyncClientEngineStatus {
  /** Whether the engine is initialized */
  isInitialized: boolean;
  /** Whether the engine is running (auto-sync active) */
  isRunning: boolean;
  /** Number of pending operations in the push queue */
  pending: number;
  /** Number of failed operations */
  failed: number;
  /** Number of conflict operations */
  conflict: number;
  /** Number of dead letter operations */
  deadLetter: number;
  /** Whether the sync is stuck */
  isStuck: boolean;
  /** Last successful sync timestamp */
  lastSyncTime: Date | null;
  /** Whether the client appears to be online */
  isOnline: boolean;
  push?: SyncStatus;
  pull?: PullStatus;
}

/**
 * HTTP client interface for sync operations.
 * The consumer must provide an implementation that authenticates
 * requests and communicates with the backend API.
 */
export interface ISyncClientHttpClient {
  /** Post a batch of sync operations to the server */
  postBatch(operations: unknown[]): Promise<{ success: boolean; results: unknown[] }>;
  /** Fetch changes from the server since a given cursor */
  getChanges(params: {
    tenantId: string;
    since?: string;
    entityTypes?: string[];
    limit?: number;
  }): Promise<{
    changes: unknown[];
    nextSince: string;
    hasMore: boolean;
  }>;
  getConflicts?(options?: {
    status?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  }): Promise<BackendConflictListResponse>;
  getConflict?(conflictId: string): Promise<BackendConflictResponse>;
  resolveConflict?(
    conflictId: string,
    resolution: "server" | "local" | "merge",
    mergedData?: Record<string, unknown>
  ): Promise<BackendConflictResponse>;
  /** Abort any in-flight requests */
  abort(): void;
}

/**
 * Cursor storage interface for persisting pull cursors.
 * Defaults to an in-memory implementation.
 */
export interface IClientCursorStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/**
 * Main configuration object for creating a SyncClientEngine.
 *
 * @example
 * ```typescript
 * const engine = createSyncClientEngine({
 *   pg: myPgliteInstance,
 *   db: drizzle(myPgliteInstance),
 *   tenantId: 'biz-123',
 *   userId: 'user-456',
 *   authToken: 'token-abc',
 *   apiUrl: 'https://api.example.com',
 *   httpClient: myHttpClient,
 *   entities: [
 *     {
 *       name: 'customers',
 *       entityType: 'customers',
 *       factory: (ctx) => new CustomerService(ctx.pg, ctx.db, ctx.syncService, ctx.tenantId, ctx.userId),
 *     },
 *   ],
 *   sync: { pushIntervalMs: 5000, pullIntervalMs: 10000 },
 *   callbacks: {
 *     onPullComplete: ({ entityTypes }) => queryClient.invalidateQueries(...),
 *   },
 * });
 * await engine.initialize();
 * await engine.start();
 * ```
 */
export interface SyncClientEngineConfig<TStage extends string = string> {
  /**
   * PGlite database instance (legacy mode — provide this OR databaseConfig).
   * If omitted, the engine will auto-initialize PGlite using databaseConfig.
   */
  pg?: PGlite;
  /**
   * Drizzle ORM instance (legacy mode — provide this OR databaseConfig).
   * Must match the pg instance if both are provided.
   */
  db?: ReturnType<typeof drizzle>;
  /**
   * Database initialization config (auto-init mode — provide this OR pg/db).
   * When provided, the engine creates and manages its own PGlite instance.
   */
  databaseConfig?: DatabaseInitConfig;
  /** Business/tenant ID */
  tenantId: string;
  /** Tenant partition column used by pull/apply writes (default: tenant_id) */
  tenantColumn?: string;
  /** Business user ID (for audit) */
  userId: string;
  /** Authentication token for API calls */
  authToken: string;
  /** Base URL for the sync API */
  apiUrl: string;
  /** HTTP client implementation for communicating with the server */
  httpClient: ISyncClientHttpClient;
  /** Optional custom queue implementation */
  queue?: ISyncQueue;
  /** Optional custom mutex implementation */
  mutex?: ISyncMutex;
  /** Optional custom logger implementation */
  logger?: ISyncLogger;
  /** Optional generated config used by pull/apply validation */
  applierConfig?: ChangeApplierConfig;
  /** Entity service definitions to register with the engine */
  entities: EntityServiceDefinition[];
  /** Optional sync timing configuration */
  sync?: SyncClientEngineSyncConfig;
  /** Optional staged pull configuration */
  stages?: SyncClientEngineStagedConfig<TStage>;
  /** Optional cursor storage (defaults to in-memory) */
  cursorStorage?: IClientCursorStorage;
  /** Optional custom event emitter (defaults to SyncEventEmitter) */
  eventEmitter?: ISyncEventEmitter;
  /** Optional lifecycle callbacks */
  callbacks?: SyncClientEngineCallbacks;
  /** Optional function to check online status (defaults to navigator.onLine) */
  isOnline?: () => boolean;
}
