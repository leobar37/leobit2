/**
 * Server-side sync types
 *
 * Types for server-side sync processing, handlers, and conflict resolution.
 * Compatible with Avileo backend sync framework.
 * Now includes generic versions alongside legacy types.
 */

export type SyncEntity = string;

/**
 * Sync operation types
 */
export type SyncOperationType = "create" | "update" | "delete";

/**
 * Input for a sync operation (from client)
 */
export interface SyncOperationInput {
  idempotencyKey: string;
  entityType: SyncEntity;
  entityId: string;
  operation: SyncOperationType;
  payload: Record<string, unknown>;
  localVersion: number;
  localTimestamp: string;
  correlationId?: string;
  deviceId?: string;
  sourceFingerprint?: string;
  error?: string;
}

/**
 * Generic sync operation input (config-based)
 */
export interface GenericSyncOperationInput<TEntity extends string = string> {
  idempotencyKey: string;
  entityType: TEntity;
  entityId: string;
  operation: SyncOperationType;
  payload: Record<string, unknown>;
  localVersion: number;
  localTimestamp: string;
  correlationId?: string;
  deviceId?: string;
  sourceFingerprint?: string;
  error?: string;
}

/**
 * Result for a single sync operation
 */
export interface SyncOperationResult {
  idempotencyKey: string;
  success: boolean;
  error?: string;
  conflict?: {
    serverVersion: number;
    serverData: Record<string, unknown>;
  };
  serverTimestamp: string;
}

/**
 * Result for a batch of sync operations
 */
export interface SyncBatchResult {
  results: SyncOperationResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    conflicts: number;
  };
}

/**
 * A single entry in a sync batch request.
 * The client sends entries, where each entry is either a standalone operation
 * or an atomic group of operations.
 */
export interface SyncBatchSingleEntry {
  kind: "single";
  operation: SyncOperationInput;
}

export interface SyncBatchAtomicEntry {
  kind: "batch";
  operations: SyncOperationInput[];
}

export type SyncBatchEntry = SyncBatchSingleEntry | SyncBatchAtomicEntry;

/**
 * Sync execution context
 *
 * Provides request-scoped context for sync operations.
 * This is a generic version that can be extended by the consuming application.
 */
export interface SyncContext<TRequestContext = unknown> {
  /** The underlying request context (app-specific) */
  ctx: TRequestContext;
  /** Correlation ID for this operation */
  correlationId: string;
  /** Correlation ID for the batch */
  batchCorrelationId: string;
}

/**
 * Result from a sync handler execution
 */
export interface SyncHandlerResult {
  success: boolean;
  idempotencyKey: string;
  error?: string;
  conflict?: {
    serverVersion: number;
    serverData: Record<string, unknown>;
  };
  serverTimestamp: string;
}

/**
 * Handler dependencies (app-specific)
 * This is a placeholder interface that should be extended by the consuming application
 */
export interface SyncHandlerDeps {
  [key: string]: unknown;
}

/**
 * Conflict check result
 */
export interface ConflictCheckResult {
  hasConflict: boolean;
  serverVersion?: number;
  serverData?: Record<string, unknown>;
}

/**
 * Sync conflict resolver interface
 */
export interface IConflictResolver<TRequestContext = unknown, TTransaction = unknown> {
  checkConflict(
    ctx: TRequestContext,
    operation: SyncOperationInput,
    tx: TTransaction
  ): Promise<ConflictCheckResult>;
}

/**
 * Generic conflict resolver interface (config-based)
 */
export interface IGenericConflictResolver<
  TRequestContext = unknown,
  TTransaction = unknown,
  TEntity extends string = string
> {
  checkConflict(
    ctx: TRequestContext,
    operation: GenericSyncOperationInput<TEntity>,
    tx: TTransaction
  ): Promise<ConflictCheckResult>;
}

/**
 * Sync handler interface (legacy - uses SyncEntity)
 */
export interface ISyncHandler<TRequestContext = unknown, TTransaction = unknown> {
  readonly entityType: SyncEntity;
  validateBusinessRules(
    ctx: TRequestContext,
    payload: Record<string, unknown>,
    operation?: string,
    tx?: TTransaction
  ): Promise<void>;
  execute(
    ctx: TRequestContext,
    operation: SyncOperationInput,
    tx?: TTransaction
  ): Promise<SyncHandlerResult>;
  /** Optional: Set entity registry for tracking batch operations */
  setRegistry?(registry: EntityRegistry): void;
}

/**
 * Generic sync handler interface (config-based)
 */
export interface IGenericSyncHandler<
  TRequestContext = unknown,
  TTransaction = unknown,
  TEntity extends string = string
> {
  readonly entityType: TEntity;
  validateBusinessRules?(
    ctx: TRequestContext,
    payload: Record<string, unknown>,
    operation?: string,
    tx?: TTransaction
  ): Promise<void>;
  execute(
    ctx: TRequestContext,
    operation: GenericSyncOperationInput<TEntity>,
    tx?: TTransaction
  ): Promise<SyncHandlerResult>;
  setRegistry?(registry: EntityRegistry): void;
  supportsSelfHeal?(): boolean;
}

/**
 * Pipeline stage interface
 */
export interface IPipelineStage<TRequestContext = unknown, TTransaction = unknown> {
  name: string;
  execute(
    context: SyncContext<TRequestContext>,
    operation: SyncOperationInput,
    handler: ISyncHandler<TRequestContext, TTransaction>,
    tx?: TTransaction,
    registry?: EntityRegistry
  ): Promise<SyncHandlerResult>;
}

/**
 * Pipeline configuration
 */
export interface SyncPipelineConfig<TRequestContext = unknown, TTransaction = unknown> {
  stages: IPipelineStage<TRequestContext, TTransaction>[];
  onBeforeExecute?: (context: SyncContext<TRequestContext>, operation: SyncOperationInput) => void;
  onAfterExecute?: (context: SyncContext<TRequestContext>, operation: SyncOperationInput, result: SyncHandlerResult) => void;
  onError?: (context: SyncContext<TRequestContext>, operation: SyncOperationInput, error: Error) => void;
}

/**
 * Entity registry for tracking operations within a batch
 */
export interface EntityRegistry {
  register(operation: "create" | "update" | "delete", entityId: string): void;
  wasCreated(entityId: string): boolean;
  wasModified(entityId: string): boolean;
  wasDeleted(entityId: string): boolean;
  clear(): void;
  getStats(): { created: number; updated: number; deleted: number };
}

/**
 * Sync engine dependencies (app-specific)
 * This is a placeholder interface that should be extended by the consuming application
 */
export interface SyncEngineDeps extends SyncHandlerDeps {
  // Repositories and services needed by handlers
}
