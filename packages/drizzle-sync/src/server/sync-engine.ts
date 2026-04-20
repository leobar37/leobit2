/**
 * SyncEngine
 *
 * Core engine for processing sync operation batches.
 * Orchestrates conflict detection, handler execution, and transaction management.
 */

import type {
  SyncOperationInput,
  SyncOperationResult,
  SyncBatchResult,
  SyncEngineDeps,
  SyncContext,
  ISyncHandler,
  SyncHandlerResult,
} from "./types";
import type {
  ISyncEventEmitter,
  PushCompleteEvent,
  ConflictDetectedEvent,
} from "../core";
import { noOpSyncEventEmitter } from "../core";
import { HandlerRegistry } from "./handler-registry";
import { GenericConflictResolverRegistry, NoOpConflictResolver } from "./conflict-resolver";
import { OperationSorter } from "./operation-sorter";
import { EntityRegistry } from "./entity-registry";
import { syncLogger } from "./sync-logger";
import type { ISyncOperationRepository } from "./operation-repository";
import type { ISyncConflictRepository } from "./conflict-repository";

/**
 * Request context interface for sync engine
 * Index signature allows compatibility with extended context types (e.g., RequestContext)
 */
export interface SyncRequestContext {
  businessId: string;
  businessUserId: string;
  [key: string]: unknown;
}

/**
 * Database transaction type - generic placeholder
 */
export type DbTransaction = unknown;

/**
 * Database client interface
 */
export interface DbClient<TTransaction = DbTransaction> {
  transaction<T>(fn: (tx: TTransaction) => Promise<T>): Promise<T>;
  execute(sql: unknown): Promise<unknown>;
}

/**
 * Middleware hook for intercepting handler execution
 * Allows pre/post processing around the handler's execute() call
 */
export interface SyncEngineMiddleware<
  TRequestContext extends SyncRequestContext = SyncRequestContext,
  TTransaction = DbTransaction
> {
  /**
   * Called before handler.execute().
   * Return a SyncHandlerResult to short-circuit (skip handler execution),
   * or null/undefined to proceed.
   */
  beforeExecute?(
    ctx: TRequestContext,
    operation: SyncOperationInput,
    handler: ISyncHandler<TRequestContext, TTransaction>,
    tx?: TTransaction
  ): Promise<SyncHandlerResult | null | undefined> | SyncHandlerResult | null | undefined;

  /**
   * Called after handler.execute() succeeds.
   * Can transform the result.
   */
  afterExecute?(
    ctx: TRequestContext,
    operation: SyncOperationInput,
    result: SyncHandlerResult,
    handler: ISyncHandler<TRequestContext, TTransaction>,
    tx?: TTransaction
  ): Promise<SyncHandlerResult> | SyncHandlerResult;

  /**
   * Called when handler.execute() throws an error.
   * Return a SyncHandlerResult to convert error to handled failure,
   * or re-throw to propagate.
   */
  onError?(
    ctx: TRequestContext,
    operation: SyncOperationInput,
    error: Error,
    handler: ISyncHandler<TRequestContext, TTransaction>,
    tx?: TTransaction
  ): Promise<SyncHandlerResult> | SyncHandlerResult;
}

/**
 * Sync engine configuration
 */
export interface SyncEngineConfig<
  TRequestContext extends SyncRequestContext = SyncRequestContext,
  TTransaction = DbTransaction
> {
  /** Database client */
  db: DbClient<TTransaction>;
  /** Sync operation repository */
  syncOpRepo: ISyncOperationRepository<TRequestContext, TTransaction>;
  /** Sync conflict repository (optional) */
  syncConflictRepo?: ISyncConflictRepository<TRequestContext, TTransaction>;
  conflictResolverRegistry?: GenericConflictResolverRegistry<string, TRequestContext, TTransaction>;
  /** Logger implementation */
  logger?: {
    info: (data: unknown) => void;
    error: (data: unknown) => void;
    warn: (data: unknown) => void;
    debug?: (data: unknown) => void;
  };
  /** Optional event emitter for typed events */
  eventEmitter?: ISyncEventEmitter;
  /** Optional middleware for intercepting handler execution */
  middleware?: SyncEngineMiddleware<TRequestContext, TTransaction>;
  /** Function to get current ISO timestamp */
  now: () => string;
  /** Function to generate savepoint SQL */
  savepointSql: (name: string) => unknown;
  /** Function to generate release savepoint SQL */
  releaseSavepointSql: (name: string) => unknown;
  /** Function to generate rollback savepoint SQL */
  rollbackSavepointSql: (name: string) => unknown;
}

/**
 * SyncEngine
 *
 * Core engine for processing sync operation batches.
 * Uses per-operation savepoints for partial rollback support.
 */
export class SyncEngine<
  TRequestContext extends SyncRequestContext = SyncRequestContext,
  TTransaction = DbTransaction,
  TDeps extends SyncEngineDeps = SyncEngineDeps
> {
  protected deps: TDeps;
  protected syncOpRepo: ISyncOperationRepository<TRequestContext, TTransaction>;
  protected syncConflictRepo: ISyncConflictRepository<TRequestContext, TTransaction>;
  protected operationSorter: OperationSorter;
  protected config: SyncEngineConfig<TRequestContext, TTransaction>;
  protected eventEmitter: ISyncEventEmitter;
  protected conflictResolverRegistry: GenericConflictResolverRegistry<string, TRequestContext, TTransaction>;

  constructor(
    deps: TDeps,
    config: SyncEngineConfig<TRequestContext, TTransaction>
  ) {
    this.deps = deps;
    this.config = config;
    this.syncOpRepo = config.syncOpRepo;
    this.syncConflictRepo = config.syncConflictRepo ?? this.createDefaultConflictRepo();
    this.operationSorter = new OperationSorter();
    this.eventEmitter = config.eventEmitter ?? noOpSyncEventEmitter;
    this.conflictResolverRegistry = config.conflictResolverRegistry ?? new GenericConflictResolverRegistry<string, TRequestContext, TTransaction>();
  }

  /**
   * Process a batch of sync operations
   */
  async processBatch(
    ctx: TRequestContext,
    operations: SyncOperationInput[]
  ): Promise<SyncBatchResult> {
    const batchCorrelationId = syncLogger.generateCorrelationId();
    const nowIso = this.config.now();

    this.log("info", {
      msg: "📥 Sync batch received",
      correlationId: batchCorrelationId,
      operations: operations.length,
      businessId: ctx.businessId,
      userId: ctx.businessUserId,
    });

    const { operations: sortedOperations, groupCount } =
      this.operationSorter.sort(operations);

    this.log("info", {
      msg: "📥 Sync batch sorted",
      correlationId: batchCorrelationId,
      totalOperations: sortedOperations.length,
      uniqueGroups: groupCount,
      priorityMap: this.operationSorter.getPriorityMap(),
    });

    const results: SyncOperationResult[] = [];
    const registry = new EntityRegistry();

    try {
      await this.config.db.transaction(async (tx) => {
        for (let i = 0; i < sortedOperations.length; i++) {
          const operation = sortedOperations[i];
          const correlationId =
            operation.correlationId || syncLogger.generateCorrelationId();
          const savepointName = `sp_op_${i}`;

          this.log("info", {
            msg: "📋 Processing operation",
            correlationId,
            batchCorrelationId,
            idempotencyKey: operation.idempotencyKey,
            entityType: operation.entityType,
            operation: operation.operation,
            entityId: operation.entityId,
          });

          try {
            await this.config.db.execute(
              this.config.savepointSql(savepointName)
            );
            const result = await this.processOperation(
              ctx,
              operation,
              correlationId,
              batchCorrelationId,
              tx,
              nowIso,
              registry
            );
            await this.config.db.execute(
              this.config.releaseSavepointSql(savepointName)
            );
            results.push(result);

            // Register successful operation in entity registry
            if (result.success) {
              registry.register(operation.operation, operation.entityId);
            }
          } catch (opError) {
            await this.rollbackSavepoint(savepointName);

            const errorMessage =
              opError instanceof Error ? opError.message : String(opError);

            this.log("error", {
              msg: "Operation failed in batch (rolled back via savepoint)",
              correlationId,
              savepointName,
              operation: operation.operation,
              entityType: operation.entityType,
              entityId: operation.entityId,
              error: errorMessage,
            });

            results.push({
              idempotencyKey: operation.idempotencyKey,
              success: false,
              error: errorMessage,
              serverTimestamp: nowIso,
            });
          }
        }
      });
    } catch (txError) {
      this.log("error", {
        msg: "Transaction failed entirely",
        error: txError instanceof Error ? txError.message : String(txError),
      });

      const processedKeys = new Set(results.map((r) => r.idempotencyKey));
      for (const op of sortedOperations) {
        if (!processedKeys.has(op.idempotencyKey)) {
          results.push({
            idempotencyKey: op.idempotencyKey,
            success: false,
            error:
              txError instanceof Error
                ? txError.message
                : "Transaction failed",
            serverTimestamp: nowIso,
          });
        }
      }
    }

    const succeeded = results.filter((item) => item.success && !item.conflict)
      .length;
    const conflicts = results.filter((item) => item.conflict !== undefined)
      .length;
    const failed = results.length - succeeded - conflicts;

    this.log("info", {
      msg: "📤 Sync batch completed",
      summary: { total: results.length, succeeded, failed, conflicts },
    });

    // Emit push:complete event
    this.eventEmitter.emit("push:complete", {
      operationsProcessed: results.length,
      succeeded,
      failed,
      conflicts,
      timestamp: nowIso,
      batchCorrelationId,
    });

    return {
      results,
      summary: {
        total: results.length,
        succeeded,
        failed,
        conflicts,
      },
    };
  }

  /**
   * Process a single operation
   */
  protected async processOperation(
    ctx: TRequestContext,
    operation: SyncOperationInput,
    correlationId: string,
    batchCorrelationId: string,
    tx: TTransaction,
    nowIso: string,
    registry: EntityRegistry
  ): Promise<SyncOperationResult> {
    const existingOp = await this.syncOpRepo.findByIdempotencyKey(
      ctx,
      operation.idempotencyKey,
      tx
    );

    if (existingOp?.status === "processed") {
      return {
        idempotencyKey: operation.idempotencyKey,
        success: true,
        serverTimestamp: existingOp.processedAt?.toISOString() ?? nowIso,
      };
    }

    if (existingOp?.status === "pending" || existingOp?.status === "failed") {
      this.log("info", {
        msg: "🔄 Retrying existing pending/failed operation",
        idempotencyKey: operation.idempotencyKey,
        existingStatus: existingOp.status,
      });
    }

    const conflictResolver = this.conflictResolverRegistry.getResolver(
      operation.entityType
    );
    const conflict = await conflictResolver.checkConflict(ctx, operation, tx);

    if (conflict.hasConflict) {
      this.log("info", {
        msg: "⚠️ Conflict detected, persisting for admin resolution",
        correlationId,
        entityType: operation.entityType,
        entityId: operation.entityId,
        serverVersion: conflict.serverVersion,
        localVersion: operation.localVersion,
      });

      // Emit conflict:detected event
      this.eventEmitter.emit("conflict:detected", {
        entityType: operation.entityType,
        entityId: operation.entityId,
        clientVersion: operation.localVersion,
        serverVersion: conflict.serverVersion!,
        timestamp: nowIso,
        correlationId,
      });

      try {
        await this.syncConflictRepo.create(
          ctx,
          {
            operationId: operation.idempotencyKey,
            entityType: operation.entityType,
            entityId: operation.entityId,
            localData: operation.payload,
            serverData: conflict.serverData!,
            localVersion: operation.localVersion,
            serverVersion: conflict.serverVersion!,
            sourceDeviceId: operation.deviceId,
            sourceFingerprint: operation.sourceFingerprint,
          },
          tx
        );
      } catch (persistError) {
        this.log("error", {
          msg: "Failed to persist conflict",
          correlationId,
          error:
            persistError instanceof Error
              ? persistError.message
              : String(persistError),
        });
      }

      return {
        idempotencyKey: operation.idempotencyKey,
        success: false,
        conflict: {
          serverVersion: conflict.serverVersion!,
          serverData: conflict.serverData!,
        },
        serverTimestamp: nowIso,
      };
    }

    const persistResult = await this.syncOpRepo.insertOrUpdate(
      ctx,
      operation,
      tx
    );

    if (persistResult === "already-processed") {
      return {
        idempotencyKey: operation.idempotencyKey,
        success: true,
        serverTimestamp: nowIso,
      };
    }

    const handler = HandlerRegistry.getHandler(operation.entityType, this.deps);

    // Pass registry to handler if it supports it
    if (handler.setRegistry) {
      handler.setRegistry(registry);
    }

    this.log("debug", {
      msg: "⚡ Executing handler",
      entityType: operation.entityType,
      operation: operation.operation,
      entityId: operation.entityId,
    });

    let result: SyncHandlerResult | undefined;
    const middleware = this.config.middleware;

    // Call middleware beforeExecute hook
    if (middleware?.beforeExecute) {
      const beforeResult = await middleware.beforeExecute(ctx, operation, handler, tx);
      if (beforeResult != null) {
        // Middleware returned a result - short-circuit handler execution
        result = beforeResult;
      }
    }

    // If beforeExecute didn't return a result, execute handler normally
    if (result === undefined) {
      try {
        result = await handler.execute(ctx, operation, tx);

        // Call middleware afterExecute hook on success
        if (middleware?.afterExecute) {
          result = await middleware.afterExecute(ctx, operation, result, handler, tx);
        }
      } catch (error) {
        // Call middleware onError hook when handler throws
        if (middleware?.onError) {
          result = await middleware.onError(
            ctx,
            operation,
            error instanceof Error ? error : new Error(String(error)),
            handler,
            tx
          );
        } else {
          // Re-throw if no onError middleware to handle it
          throw error;
        }
      }
    }

    // At this point result must be defined
    const handlerResult = result!;

    // Inject syncStatus: 'synced' into payload before saving
    const enrichedPayload = {
      ...operation.payload,
      syncStatus: "synced",
      syncAttempts: 0,
    };

    await this.syncOpRepo.updateStatus(
      ctx,
      operation.idempotencyKey,
      handlerResult.success ? "processed" : "failed",
      handlerResult.error ?? null,
      tx,
      enrichedPayload
    );

    return {
      idempotencyKey: operation.idempotencyKey,
      success: handlerResult.success,
      error: handlerResult.error,
      serverTimestamp: nowIso,
    };
  }

  /**
   * Rollback a savepoint
   */
  protected async rollbackSavepoint(savepointName: string): Promise<void> {
    try {
      await this.config.db.execute(
        this.config.rollbackSavepointSql(savepointName)
      );
    } catch (rollbackError) {
      this.log("error", {
        msg: "Failed to rollback savepoint",
        savepointName,
        error: rollbackError,
      });
    }
  }

  /**
   * Log a message
   */
  protected log(level: "info" | "error" | "warn" | "debug", data: unknown): void {
    const logger = this.config.logger;
    if (!logger) {
      if (level === "info") console.log(data);
      else if (level === "error") console.error(data);
      else if (level === "warn") console.warn(data);
      else if (level === "debug") console.debug?.(data);
      return;
    }
    
    if (level === "info") logger.info(data);
    else if (level === "error") logger.error(data);
    else if (level === "warn") logger.warn(data);
    else if (level === "debug") logger.debug?.(data);
  }

  /**
   * Create a default conflict repository (no-op implementation)
   */
  protected createDefaultConflictRepo(): ISyncConflictRepository<TRequestContext, TTransaction> {
    const self = this;
    return {
      async create(ctx, data, tx) {
        self.log("warn", {
          msg: "No conflict repository configured, conflict not persisted",
          operationId: data.operationId,
        });
        return {
          id: "noop",
          businessId: ctx.businessId,
          operationId: data.operationId,
          entityType: data.entityType,
          entityId: data.entityId,
          localData: data.localData,
          serverData: data.serverData,
          localVersion: data.localVersion,
          serverVersion: data.serverVersion,
          status: "pending",
          resolution: null,
          resolvedBy: null,
          resolvedAt: null,
          createdAt: new Date(),
        };
      },
      async findById() {
        return undefined;
      },
      async findByOperationId() {
        return undefined;
      },
      async findPendingByBusiness() {
        return [];
      },
      async findByBusiness() {
        return [];
      },
      async countPending() {
        return 0;
      },
      async resolve() {
        return undefined;
      },
      async delete() {
        return false;
      },
      async deleteByOperationId() {
        return false;
      },
    };
  }
}
