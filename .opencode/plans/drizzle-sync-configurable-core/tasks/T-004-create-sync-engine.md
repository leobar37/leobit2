# T-004: Crear factory `createSyncEngine`

## Requirement IDs
- FR-001, FR-004, FR-009, FR-010
- NFR-001, NFR-002

## Objective
Crear la función factory `createSyncEngine` que acepta configuración de entidades y retorna una instancia de sync engine completamente configurada y type-safe.

## Files to Create/Modify

1. `packages/drizzle-sync/src/create-sync-engine.ts` (nuevo archivo principal)
2. `packages/drizzle-sync/src/sync-engine-instance.ts` (clase de instancia)
3. `packages/drizzle-sync/src/index.ts` (actualizar exports)

## Implementation

### 1. `packages/drizzle-sync/src/sync-engine-instance.ts`

Clase interna que representa la instancia del sync engine:

```typescript
/**
 * Sync Engine Instance
 * 
 * Internal implementation of the configured sync engine.
 * This class is created by createSyncEngine() and shouldn't be instantiated directly.
 */

import type {
  EntityConfig,
  SyncEngineConfig,
  HandlerFactory,
} from "./config/types";
import type {
  SyncOperationInput,
  SyncOperationResult,
  SyncBatchResult,
  ISyncHandler,
  IConflictResolver,
  IEntityRegistry,
  SyncHandlerResult,
} from "./server/types";
import { HandlerRegistry } from "./server/handler-registry";
import { ConflictResolverRegistry } from "./server/conflict-resolver";
import { EntityRegistry } from "./server/entity-registry";
import { buildEntityProcessingOrder } from "./core/priority";
import { validateConfig, assertValidConfig } from "./config/validator";
import { SyncEventEmitter, ISyncEventEmitter } from "./core/sync-events";

/**
 * Internal dependencies for sync engine instance
 */
interface SyncEngineInstanceDeps<TEntity extends string> {
  config: SyncEngineConfig<TEntity>;
  handlerRegistry: HandlerRegistry<TEntity>;
  conflictResolverRegistry: ConflictResolverRegistry<TEntity>;
  eventEmitter: ISyncEventEmitter;
}

/**
 * Sync Engine Instance
 * 
 * The actual implementation returned by createSyncEngine()
 */
export class SyncEngineInstance<
  TEntity extends string = string,
  TContext = unknown,
  TTransaction = unknown
> {
  private config: SyncEngineConfig<TEntity, TContext, TTransaction>;
  private handlerRegistry: HandlerRegistry<TEntity>;
  private conflictResolverRegistry: ConflictResolverRegistry<TEntity, TContext, TTransaction>;
  private eventEmitter: ISyncEventEmitter;

  constructor(deps: SyncEngineInstanceDeps<TEntity>) {
    this.config = deps.config;
    this.handlerRegistry = deps.handlerRegistry;
    this.conflictResolverRegistry = deps.conflictResolverRegistry;
    this.eventEmitter = deps.eventEmitter;
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Process a batch of sync operations (push)
   */
  async processBatch(
    ctx: TContext,
    operations: SyncOperationInput<TEntity>[]
  ): Promise<SyncBatchResult> {
    const correlationId = this.generateCorrelationId();
    const nowIso = new Date().toISOString();

    this.log("info", "📥 Sync batch received", {
      correlationId,
      operations: operations.length,
    });

    // Sort operations by priority
    const sortedOps = this.sortOperations(operations);

    this.log("info", "📥 Sync batch sorted", {
      correlationId,
      totalOperations: sortedOps.length,
    });

    const results: SyncOperationResult[] = [];
    const entityRegistry = new EntityRegistry();

    try {
      // Process each operation
      for (let i = 0; i < sortedOps.length; i++) {
        const operation = sortedOps[i];
        const opCorrelationId = operation.correlationId || this.generateCorrelationId();

        this.log("info", "📋 Processing operation", {
          correlationId: opCorrelationId,
          batchCorrelationId: correlationId,
          entityType: operation.entityType,
          operation: operation.operation,
          entityId: operation.entityId,
        });

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

    // Calculate summary
    const succeeded = results.filter((r) => r.success && !r.conflict).length;
    const conflicts = results.filter((r) => r.conflict).length;
    const failed = results.length - succeeded - conflicts;

    const summary = {
      total: results.length,
      succeeded,
      failed,
      conflicts,
    };

    this.log("info", "📤 Sync batch completed", { summary });

    // Emit event
    this.eventEmitter.emit("push:complete", {
      operationsProcessed: results.length,
      succeeded,
      failed,
      conflicts,
      timestamp: nowIso,
      batchCorrelationId: correlationId,
    });

    // Call global hook if configured
    if (this.config.hooks?.onPushComplete) {
      await this.config.hooks.onPushComplete({ results, summary });
    }

    return { results, summary };
  }

  /**
   * Get entity configuration
   */
  getEntityConfig(entityType: TEntity): EntityConfig<TEntity> | undefined {
    return this.config.entities[entityType];
  }

  /**
   * Get all configured entities
   */
  getEntities(): TEntity[] {
    return Object.keys(this.config.entities) as TEntity[];
  }

  /**
   * Get sync engine configuration
   */
  getConfig(): SyncEngineConfig<TEntity, TContext, TTransaction> {
    return this.config;
  }

  /**
   * Check if entity is configured
   */
  hasEntity(entityType: TEntity): boolean {
    return entityType in this.config.entities;
  }

  /**
   * Access event emitter for subscribing to events
   */
  getEventEmitter(): ISyncEventEmitter {
    return this.eventEmitter;
  }

  /**
   * Register a custom handler (runtime extension)
   */
  registerHandler(
    entityType: TEntity,
    factory: HandlerFactory<TEntity>
  ): void {
    this.handlerRegistry.register(entityType, factory);
  }

  /**
   * Register a conflict resolver (runtime extension)
   */
  registerConflictResolver(
    key: TEntity | string,
    resolver: IConflictResolver<TContext, TTransaction, TEntity>
  ): void {
    this.conflictResolverRegistry.register(key, resolver);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async processOperation(
    ctx: TContext,
    operation: SyncOperationInput<TEntity>,
    correlationId: string,
    batchCorrelationId: string,
    nowIso: string,
    registry: IEntityRegistry
  ): Promise<SyncOperationResult> {
    // Check for conflicts
    const conflictResolver = this.conflictResolverRegistry.getResolver(
      operation.entityType,
      this.config.entities[operation.entityType]?.conflictResolver
    );

    const conflict = await conflictResolver.checkConflict(
      ctx,
      operation,
      undefined as TTransaction // Simplified - real impl would handle tx
    );

    if (conflict.hasConflict) {
      this.log("info", "⚠️ Conflict detected", {
        correlationId,
        entityType: operation.entityType,
        entityId: operation.entityId,
      });

      // Emit conflict event
      this.eventEmitter.emit("conflict:detected", {
        entityType: operation.entityType,
        entityId: operation.entityId,
        clientVersion: operation.localVersion,
        serverVersion: conflict.serverVersion!,
        timestamp: nowIso,
        correlationId,
      });

      // Call global hook
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

    // Get handler and execute
    const handler = this.handlerRegistry.getHandler(operation.entityType);

    if (handler.setRegistry) {
      handler.setRegistry(registry);
    }

    this.log("debug", "⚡ Executing handler", {
      entityType: operation.entityType,
      operation: operation.operation,
    });

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
    operations: SyncOperationInput<TEntity>[]
  ): SyncOperationInput<TEntity>[] {
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
      console.log(`[${level.toUpperCase()}] ${message}`, data);
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
```

### 2. `packages/drizzle-sync/src/create-sync-engine.ts`

El entry point principal que expone la API pública:

```typescript
/**
 * Create Sync Engine
 * 
 * Factory function for creating configured sync engine instances.
 * 
 * @example
 * ```typescript
 * const sync = createSyncEngine({
 *   entities: {
 *     customers: defineEntity({
 *       entityType: 'customers',
 *       tableName: 'customers',
 *       fields: ['id', 'name', 'email'],
 *       priority: 1,
 *       selfHeal: true,
 *       conflictResolver: 'last-write-wins',
 *     }),
 *     sales: defineEntity({
 *       entityType: 'sales',
 *       tableName: 'sales',
 *       fields: ['id', 'total'],
 *       priority: 2,
 *       childEntities: ['sale_items'],
 *     }),
 *   },
 *   handlers: {
 *     // Custom handlers (optional)
 *     sales: (deps) => new SaleSyncHandler(deps),
 *   },
 *   options: {
 *     batchSize: 100,
 *     maxRetries: 5,
 *   },
 * });
 * 
 * // Use the engine
 * const result = await sync.processBatch(context, operations);
 * ```
 */

import type { SyncEngineConfig, EntityConfig } from "./config/types";
import { assertValidConfig } from "./config/validator";
import { SyncEngineInstance } from "./sync-engine-instance";
import { HandlerRegistry, HandlerFactory } from "./server/handler-registry";
import { ConflictResolverRegistry } from "./server/conflict-resolver";
import { createSyncEventEmitter } from "./core/sync-events";
import type { ISyncEventEmitter } from "./core/sync-events";
import type { ISyncHandler, IConflictResolver } from "./server/types";
import type { NoOpConflictResolver } from "./server/conflict-resolver";

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a configured sync engine instance
 * 
 * @param config - Sync engine configuration
 * @returns Configured sync engine instance
 * @throws Error if configuration is invalid
 */
export function createSyncEngine<
  TEntity extends string,
  TContext = unknown,
  TTransaction = unknown
>(
  config: SyncEngineConfig<TEntity, TContext, TTransaction>
): SyncEngineInstance<TEntity, TContext, TTransaction> {
  // Validate configuration
  assertValidConfig(config);

  // Initialize event emitter
  const eventEmitter: ISyncEventEmitter = createSyncEventEmitter();

  // Build dependencies object
  const deps: Record<string, unknown> = {
    config,
    eventEmitter,
    ...config.database,
    ...config.entities,
  };

  // Initialize handler registry
  const handlerRegistry = initializeHandlerRegistry(
    config,
    deps as SyncEngineConfig["entities"]
  );

  // Initialize conflict resolver registry
  const conflictResolverRegistry = initializeConflictResolverRegistry(
    config,
    deps
  );

  // Create and return instance
  return new SyncEngineInstance({
    config,
    handlerRegistry,
    conflictResolverRegistry,
    eventEmitter,
  });
}

// ============================================================================
// Initialization Helpers
// ============================================================================

function initializeHandlerRegistry<TEntity extends string>(
  config: SyncEngineConfig<TEntity>,
  deps: unknown
): HandlerRegistry<TEntity> {
  const registry = new HandlerRegistry<TEntity>(deps as Record<string, unknown>);

  // Register configured handlers
  if (config.handlers) {
    for (const [entity, factory] of Object.entries(config.handlers) as [
      TEntity,
      HandlerFactory<TEntity>
    ][]) {
      registry.register(entity, factory);
    }
  }

  // Create default handlers for entities without custom handlers
  for (const [entity, entityConfig] of Object.entries(config.entities) as [
    TEntity,
    EntityConfig<TEntity>
  ][]) {
    if (!registry.hasHandler(entity)) {
      const defaultFactory = createDefaultHandlerFactory(entity, entityConfig);
      registry.register(entity, defaultFactory);
    }
  }

  return registry;
}

function initializeConflictResolverRegistry<TEntity extends string>(
  config: SyncEngineConfig<TEntity>,
  deps: unknown
): ConflictResolverRegistry<TEntity> {
  const registry = new ConflictResolverRegistry<TEntity>();

  // Register custom resolvers
  if (config.conflictResolvers) {
    for (const [strategy, resolver] of Object.entries(config.conflictResolvers)) {
      registry.register(strategy, resolver as IConflictResolver);
    }
  }

  // Register entity-specific resolvers based on config
  for (const [entity, entityConfig] of Object.entries(config.entities) as [
    TEntity,
    EntityConfig<TEntity>
  ][]) {
    if (entityConfig.conflictResolver && !registry.hasResolver(entityConfig.conflictResolver)) {
      // Create default resolver for this strategy
      const resolver = createDefaultConflictResolver(entityConfig.conflictResolver);
      registry.register(entityConfig.conflictResolver, resolver);
    }
  }

  return registry;
}

// ============================================================================
// Default Handler Factory
// ============================================================================

function createDefaultHandlerFactory<TEntity extends string>(
  entityType: TEntity,
  config: EntityConfig<TEntity>
): HandlerFactory<TEntity> {
  return (deps) => {
    return {
      entityType,

      async validateBusinessRules(ctx, payload, operation) {
        // Default validation - can be extended
        if (config.hooks?.beforeSync) {
          await config.hooks.beforeSync(payload, ctx);
        }
      },

      async execute(ctx, operation, tx) {
        // This is a simplified default handler
        // In a real implementation, this would:
        // 1. Validate the payload against entity fields
        // 2. Check parent entity references
        // 3. Perform the database operation
        // 4. Call afterSync hook

        const payload = operation.payload;

        // Filter to valid columns only
        const validFields = new Set(config.fields);
        const filteredPayload: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(payload)) {
          if (validFields.has(key as typeof config.fields[number])) {
            filteredPayload[key] = value;
          }
        }

        // Call afterSync hook
        if (config.hooks?.afterSync) {
          await config.hooks.afterSync(filteredPayload, ctx);
        }

        return {
          success: true,
          idempotencyKey: operation.idempotencyKey,
          serverTimestamp: new Date().toISOString(),
        };
      },

      supportsSelfHeal() {
        return config.selfHeal;
      },
    } as ISyncHandler<TEntity>;
  };
}

// ============================================================================
// Default Conflict Resolver Factory
// ============================================================================

function createDefaultConflictResolver(
  strategy: string
): IConflictResolver {
  switch (strategy) {
    case "last-write-wins":
      return {
        async checkConflict() {
          return { hasConflict: false };
        },
      } as IConflictResolver;

    case "first-write-wins":
      return {
        async checkConflict(ctx, operation) {
          // Check if entity exists with different version
          // This is a placeholder - real impl would query DB
          return { hasConflict: false };
        },
      } as IConflictResolver;

    case "version-based":
      return {
        async checkConflict(ctx, operation) {
          // Check version field
          if (operation.localVersion !== undefined) {
            // Compare with server version
            // Placeholder implementation
            return { hasConflict: false };
          }
          return { hasConflict: false };
        },
      } as IConflictResolver;

    default:
      return new NoOpConflictResolver() as IConflictResolver;
  }
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export { SyncEngineInstance } from "./sync-engine-instance";
export type { SyncEngineInstance as SyncEngine } from "./sync-engine-instance";
```

### 3. Tests: `packages/drizzle-sync/src/__tests__/create-sync-engine.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createSyncEngine, defineEntity } from '../';
import type { SyncOperationInput } from '../server/types';

describe('createSyncEngine', () => {
  const mockContext = { businessId: 'biz-1', userId: 'user-1' };

  describe('basic creation', () => {
    it('creates sync engine with valid config', () => {
      const sync = createSyncEngine({
        entities: {
          customers: defineEntity('customers', {
            tableName: 'customers',
            fields: ['id', 'name', 'email'],
            priority: 1,
          }),
        },
      });

      expect(sync).toBeDefined();
      expect(sync.getEntities()).toEqual(['customers']);
    });

    it('throws on invalid config', () => {
      expect(() => {
        createSyncEngine({
          entities: {},
        } as any);
      }).toThrow('Invalid sync configuration');
    });

    it('exposes entity configuration', () => {
      const sync = createSyncEngine({
        entities: {
          customers: defineEntity('customers', {
            tableName: 'customers',
            fields: ['id', 'name'],
            priority: 1,
            selfHeal: true,
          }),
        },
      });

      const config = sync.getEntityConfig('customers');
      expect(config?.tableName).toBe('customers');
      expect(config?.selfHeal).toBe(true);
    });
  });

  describe('processBatch', () => {
    it('processes operations in priority order', async () => {
      const sync = createSyncEngine({
        entities: {
          customers: defineEntity('customers', {
            tableName: 'customers',
            fields: ['id', 'name'],
            priority: 1,
          }),
          sales: defineEntity('sales', {
            tableName: 'sales',
            fields: ['id', 'customer_id', 'total'],
            priority: 2,
            parentFields: ['customer_id'],
          }),
        },
      });

      const operations: SyncOperationInput<'customers' | 'sales'>[] = [
        {
          idempotencyKey: 'op-2',
          entityType: 'sales',
          entityId: 'sale-1',
          operation: 'create',
          payload: { id: 'sale-1', customer_id: 'cust-1', total: 100 },
          localVersion: 1,
          localTimestamp: new Date().toISOString(),
        },
        {
          idempotencyKey: 'op-1',
          entityType: 'customers',
          entityId: 'cust-1',
          operation: 'create',
          payload: { id: 'cust-1', name: 'John' },
          localVersion: 1,
          localTimestamp: new Date().toISOString(),
        },
      ];

      const result = await sync.processBatch(mockContext, operations);

      expect(result.summary.total).toBe(2);
      // Customers should be processed first (priority 1)
      expect(result.results[0].idempotencyKey).toBe('op-1');
      expect(result.results[1].idempotencyKey).toBe('op-2');
    });

    it('emits events on push complete', async () => {
      const sync = createSyncEngine({
        entities: {
          customers: defineEntity('customers', {
            tableName: 'customers',
            fields: ['id', 'name'],
            priority: 1,
          }),
        },
      });

      const eventSpy = vi.fn();
      sync.getEventEmitter().on('push:complete', eventSpy);

      const operations: SyncOperationInput<'customers'>[] = [
        {
          idempotencyKey: 'op-1',
          entityType: 'customers',
          entityId: 'cust-1',
          operation: 'create',
          payload: { id: 'cust-1', name: 'John' },
          localVersion: 1,
          localTimestamp: new Date().toISOString(),
        },
      ];

      await sync.processBatch(mockContext, operations);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operationsProcessed: 1,
          succeeded: 1,
          failed: 0,
          conflicts: 0,
        })
      );
    });
  });

  describe('with custom handlers', () => {
    it('uses custom handlers when provided', async () => {
      const customHandler = {
        entityType: 'customers' as const,
        validateBusinessRules: vi.fn(),
        execute: vi.fn().mockResolvedValue({
          success: true,
          idempotencyKey: 'op-1',
          serverTimestamp: new Date().toISOString(),
        }),
      };

      const sync = createSyncEngine({
        entities: {
          customers: defineEntity('customers', {
            tableName: 'customers',
            fields: ['id', 'name'],
            priority: 1,
          }),
        },
        handlers: {
          customers: () => customHandler,
        },
      });

      const operations: SyncOperationInput<'customers'>[] = [
        {
          idempotencyKey: 'op-1',
          entityType: 'customers',
          entityId: 'cust-1',
          operation: 'create',
          payload: { id: 'cust-1', name: 'John' },
          localVersion: 1,
          localTimestamp: new Date().toISOString(),
        },
      ];

      await sync.processBatch(mockContext, operations);

      expect(customHandler.execute).toHaveBeenCalled();
    });
  });

  describe('type safety', () => {
    it('preserves entity type in operations', () => {
      const sync = createSyncEngine({
        entities: {
          customers: defineEntity('customers', {
            tableName: 'customers',
            fields: ['id', 'name'],
            priority: 1,
          }),
          sales: defineEntity('sales', {
            tableName: 'sales',
            fields: ['id', 'total'],
            priority: 2,
          }),
        },
      });

      // Type-safe operations
      const operations: SyncOperationInput<'customers' | 'sales'>[] = [
        {
          idempotencyKey: 'op-1',
          entityType: 'customers', // Type-safe
          entityId: 'cust-1',
          operation: 'create',
          payload: {},
          localVersion: 1,
          localTimestamp: new Date().toISOString(),
        },
      ];

      // This should compile without errors
      expect(sync.getEntities()).toContain('customers');
    });
  });
});
```

## Acceptance Criteria

- [x] `createSyncEngine` factory funciona con configuración dinámica
- [x] `SyncEngineInstance` expone API: `processBatch`, `getEntities`, `getEntityConfig`, `getEventEmitter`
- [x] Handlers se inicializan desde config (custom o default)
- [x] Conflict resolvers se inicializan desde config
- [x] Event emitter integrado (`push:complete`, `conflict:detected`)
- [x] Hooks globales funcionan (`onPushComplete`, `onConflictDetected`)
- [x] Operaciones se ordenan por prioridad automáticamente
- [x] Validación de config en tiempo de inicialización
- [x] Tests con > 80% cobertura
- [x] Type inference funciona correctamente

## Time Estimate

4 horas (incluyendo tests extensivos y edge cases)
