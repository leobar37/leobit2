import type {
  EntityConfig,
  SyncEngineConfig,
  HandlerFactory as ConfigHandlerFactory,
} from "./config/types";
import type {
  GenericSyncOperationInput,
  SyncOperationResult,
  SyncBatchResult,
  IGenericSyncHandler,
  IGenericConflictResolver,
  EntityRegistry as IEntityRegistry,
  SyncHandlerResult,
} from "./server/types";
import { GenericHandlerRegistry } from "./server/handler-registry";
import type { GenericHandlerFactory } from "./server/handler-registry";
import { GenericConflictResolverRegistry, NoOpConflictResolver } from "./server/conflict-resolver";
import { EntityRegistry } from "./server/entity-registry";
import { buildEntityProcessingOrder } from "./core/priority";
import { assertValidConfig } from "./config/validator";
import { createSyncEventEmitter } from "./core/sync-events";
import type { ISyncEventEmitter } from "./core/sync-events";

interface SyncEngineInstanceDeps<TEntity extends string> {
  config: SyncEngineConfig<TEntity>;
  handlerRegistry: GenericHandlerRegistry<TEntity>;
  conflictResolverRegistry: GenericConflictResolverRegistry<TEntity>;
  eventEmitter: ISyncEventEmitter;
}

export class SyncEngineInstance<
  TEntity extends string = string,
  TContext = unknown,
  TTransaction = unknown
> {
  private config: SyncEngineConfig<TEntity>;
  private handlerRegistry: GenericHandlerRegistry<TEntity>;
  private conflictResolverRegistry: GenericConflictResolverRegistry<TEntity>;
  private eventEmitter: ISyncEventEmitter;

  constructor(deps: SyncEngineInstanceDeps<TEntity>) {
    this.config = deps.config as SyncEngineConfig<TEntity>;
    this.handlerRegistry = deps.handlerRegistry;
    this.conflictResolverRegistry = deps.conflictResolverRegistry as GenericConflictResolverRegistry<TEntity>;
    this.eventEmitter = deps.eventEmitter;
  }

  async processBatch(
    ctx: TContext,
    operations: GenericSyncOperationInput<TEntity>[]
  ): Promise<SyncBatchResult> {
    const correlationId = this.generateCorrelationId();
    const nowIso = new Date().toISOString();

    this.log("info", "Sync batch received", {
      correlationId,
      operations: operations.length,
    });

    const sortedOps = this.sortOperations(operations);

    this.log("info", "Sync batch sorted", {
      correlationId,
      totalOperations: sortedOps.length,
    });

    const results: SyncOperationResult[] = [];
    const entityRegistry = new EntityRegistry();

    try {
      for (let i = 0; i < sortedOps.length; i++) {
        const operation = sortedOps[i];
        const opCorrelationId = operation.correlationId || this.generateCorrelationId();

        try {
          const result = await this.processOperation(
            ctx,
            operation,
            opCorrelationId,
            correlationId,
            nowIso,
            entityRegistry
          );
          results.push(result);

          if (result.success) {
            entityRegistry.register(operation.operation, operation.entityId);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.log("error", "Operation failed", {
            correlationId: opCorrelationId,
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
    } catch (error) {
      this.log("error", "Batch processing failed", { error });
      throw error;
    }

    const succeeded = results.filter((r) => r.success && !r.conflict).length;
    const conflicts = results.filter((r) => r.conflict).length;
    const failed = results.length - succeeded - conflicts;

    const summary = {
      total: results.length,
      succeeded,
      failed,
      conflicts,
    };

    this.log("info", "Sync batch completed", { summary });

    this.eventEmitter.emit("push:complete", {
      operationsProcessed: results.length,
      succeeded,
      failed,
      conflicts,
      timestamp: nowIso,
      batchCorrelationId: correlationId,
    });

    if (this.config.hooks?.onPushComplete) {
      await this.config.hooks.onPushComplete({ results, summary });
    }

    return { results, summary };
  }

  getEntityConfig(entityType: TEntity): EntityConfig<TEntity> | undefined {
    return this.config.entities[entityType];
  }

  getEntities(): TEntity[] {
    return Object.keys(this.config.entities) as TEntity[];
  }

  getConfig(): SyncEngineConfig<TEntity> {
    return this.config;
  }

  hasEntity(entityType: TEntity): boolean {
    return entityType in this.config.entities;
  }

  getEventEmitter(): ISyncEventEmitter {
    return this.eventEmitter;
  }

  registerHandler(
    entityType: TEntity,
    factory: GenericHandlerFactory<TEntity>
  ): void {
    this.handlerRegistry.register(entityType, factory);
  }

  registerConflictResolver(
    key: TEntity | string,
    resolver: IGenericConflictResolver<TContext, TTransaction, TEntity>
  ): void {
    this.conflictResolverRegistry.register(key, resolver);
  }

  private async processOperation(
    ctx: TContext,
    operation: GenericSyncOperationInput<TEntity>,
    correlationId: string,
    batchCorrelationId: string,
    nowIso: string,
    registry: IEntityRegistry
  ): Promise<SyncOperationResult> {
    const conflictResolver = this.conflictResolverRegistry.getResolver(
      operation.entityType,
      this.config.entities[operation.entityType]?.conflictResolver
    );

    const conflict = await conflictResolver.checkConflict(
      ctx,
      operation,
      undefined as TTransaction
    );

    if (conflict.hasConflict) {
      this.log("info", "Conflict detected", {
        correlationId,
        entityType: operation.entityType,
        entityId: operation.entityId,
      });

      this.eventEmitter.emit("conflict:detected", {
        entityType: operation.entityType,
        entityId: operation.entityId,
        clientVersion: operation.localVersion,
        serverVersion: conflict.serverVersion!,
        timestamp: nowIso,
        correlationId,
      });

      if (this.config.hooks?.onConflictDetected) {
        await this.config.hooks.onConflictDetected({
          operation,
          serverData: conflict.serverData,
          serverVersion: conflict.serverVersion,
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

    const handler = this.handlerRegistry.getHandler(operation.entityType);

    if (handler.setRegistry) {
      handler.setRegistry(registry);
    }

    const result = await handler.execute(ctx, operation, undefined as TTransaction);

    return {
      idempotencyKey: operation.idempotencyKey,
      success: result.success,
      error: result.error,
      conflict: result.conflict,
      serverTimestamp: nowIso,
    };
  }

  private sortOperations(
    operations: GenericSyncOperationInput<TEntity>[]
  ): GenericSyncOperationInput<TEntity>[] {
    const order = buildEntityProcessingOrder(this.config.entities);
    const priorityMap = new Map(order.map((e, i) => [e, i]));

    return [...operations].sort((a, b) => {
      const priorityA = priorityMap.get(a.entityType) ?? 999;
      const priorityB = priorityMap.get(b.entityType) ?? 999;
      return priorityA - priorityB;
    });
  }

  private generateCorrelationId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    data?: unknown
  ): void {
    const logger = this.config.logger;
    if (!logger) {
      return;
    }

    switch (level) {
      case "debug":
        logger.debug?.(message, data);
        break;
      case "info":
        logger.info(message, data);
        break;
      case "warn":
        logger.warn(message, data);
        break;
      case "error":
        logger.error(message, data);
        break;
    }
  }
}
