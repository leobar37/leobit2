# T-003: Genericizar `HandlerRegistry` en `server/`

## Requirement IDs
- FR-009, FR-011
- NFR-001

## Objective
Convertir `HandlerRegistry` de usar `SyncEntity` (union type específico) a usar `string` genérico con type safety mediante generics.

## Files to Modify

1. `packages/drizzle-sync/src/server/handler-registry.ts`
2. `packages/drizzle-sync/src/server/types.ts`
3. `packages/drizzle-sync/src/server/conflict-resolver.ts` (también usa SyncEntity)
4. `packages/drizzle-sync/src/server/entity-registry.ts` (si aplica)

## Implementation

### 1. `packages/drizzle-sync/src/server/types.ts`

**ANTES:**
```typescript
import type { SyncEntity } from "@avileo/shared";

export interface ISyncHandler {
  readonly entityType: SyncEntity;
  // ...
}
```

**DESPUÉS:**

```typescript
/**
 * Server Sync Types - Generic Version
 * 
 * Types for server-side sync processing using generics.
 */

// ============================================================================
// Basic Operation Types
// ============================================================================

export type SyncOperationType = "create" | "update" | "delete";

/**
 * Generic sync operation input (from client)
 */
export interface SyncOperationInput<TEntity extends string = string> {
  idempotencyKey: string;
  entityType: TEntity;
  entityId: string;
  operation: SyncOperationType;
  payload: Record<string, unknown>;
  localVersion: number;
  localTimestamp: string;
  syncGroupId?: string;
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

// ============================================================================
// Sync Context
// ============================================================================

/**
 * Generic sync execution context
 */
export interface SyncContext<TRequestContext = unknown> {
  ctx: TRequestContext;
  correlationId: string;
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

// ============================================================================
// Handler Dependencies
// ============================================================================

/**
 * Generic handler dependencies
 * Applications should extend this interface
 */
export interface SyncHandlerDeps {
  [key: string]: unknown;
}

/**
 * Generic sync engine dependencies
 */
export interface SyncEngineDeps extends SyncHandlerDeps {
  // Base dependencies - extend in application
}

// ============================================================================
// Handler Interface
// ============================================================================

/**
 * Generic sync handler interface
 * 
 * @template TEntity - Entity type identifier
 * @template TRequestContext - Request context type
 * @template TTransaction - Database transaction type
 */
export interface ISyncHandler<
  TEntity extends string = string,
  TRequestContext = unknown,
  TTransaction = unknown
> {
  /** Entity type this handler processes */
  readonly entityType: TEntity;

  /**
   * Validate business rules before execution
   */
  validateBusinessRules(
    ctx: TRequestContext,
    payload: Record<string, unknown>,
    operation?: string,
    tx?: TTransaction
  ): Promise<void>;

  /**
   * Execute the sync operation
   */
  execute(
    ctx: TRequestContext,
    operation: SyncOperationInput<TEntity>,
    tx?: TTransaction
  ): Promise<SyncHandlerResult>;

  /**
   * Set entity registry for batch operation tracking (optional)
   */
  setRegistry?(registry: IEntityRegistry): void;
}

// ============================================================================
// Entity Registry Interface
// ============================================================================

/**
 * Generic entity registry for tracking batch operations
 */
export interface IEntityRegistry {
  register(operation: "create" | "update" | "delete", entityId: string): void;
  wasCreated(entityId: string): boolean;
  wasModified(entityId: string): boolean;
  wasDeleted(entityId: string): boolean;
  clear(): void;
  getStats(): { created: number; updated: number; deleted: number };
}

// ============================================================================
// Pipeline Interface
// ============================================================================

/**
 * Generic pipeline stage interface
 */
export interface IPipelineStage<
  TRequestContext = unknown,
  TTransaction = unknown,
  TEntity extends string = string
> {
  name: string;
  execute(
    context: SyncContext<TRequestContext>,
    operation: SyncOperationInput<TEntity>,
    handler: ISyncHandler<TEntity, TRequestContext, TTransaction>,
    tx?: TTransaction,
    registry?: IEntityRegistry
  ): Promise<SyncHandlerResult>;
}

/**
 * Generic pipeline configuration
 */
export interface SyncPipelineConfig<
  TRequestContext = unknown,
  TTransaction = unknown,
  TEntity extends string = string
> {
  stages: IPipelineStage<TRequestContext, TTransaction, TEntity>[];
  onBeforeExecute?: (
    context: SyncContext<TRequestContext>,
    operation: SyncOperationInput<TEntity>
  ) => void;
  onAfterExecute?: (
    context: SyncContext<TRequestContext>,
    operation: SyncOperationInput<TEntity>,
    result: SyncHandlerResult
  ) => void;
  onError?: (
    context: SyncContext<TRequestContext>,
    operation: SyncOperationInput<TEntity>,
    error: Error
  ) => void;
}

// ============================================================================
// Conflict Resolver Types
// ============================================================================

export interface ConflictCheckResult {
  hasConflict: boolean;
  serverVersion?: number;
  serverData?: Record<string, unknown>;
}

/**
 * Generic conflict resolver interface
 */
export interface IConflictResolver<
  TRequestContext = unknown,
  TTransaction = unknown,
  TEntity extends string = string
> {
  checkConflict(
    ctx: TRequestContext,
    operation: SyncOperationInput<TEntity>,
    tx: TTransaction
  ): Promise<ConflictCheckResult>;
}

// ============================================================================
// Backwards Compatibility
// ============================================================================

/**
 * @deprecated Use SyncOperationInput<string> instead
 * Import SyncEntity from @avileo/shared if you need the union type
 */
export type SyncEntity = string;
```

### 2. `packages/drizzle-sync/src/server/handler-registry.ts`

**ANTES:**
```typescript
import type { SyncEntity } from "@avileo/shared";

export class HandlerRegistry {
  private static handlers: Map<SyncEntity, HandlerFactory> = new Map();
  
  static register(entityType: SyncEntity, factory: HandlerFactory): void {
    HandlerRegistry.handlers.set(entityType, factory);
  }
  
  static getHandler(entityType: SyncEntity, deps: SyncEngineDeps): ISyncHandler {
    // ...
  }
}
```

**DESPUÉS:**

```typescript
/**
 * Handler Registry - Generic Version
 * 
 * Registry for sync handlers by entity type.
 * Uses string keys for generic entity support.
 */

import type {
  ISyncHandler,
  SyncHandlerDeps,
  SyncEngineDeps,
} from "./types";

/**
 * Factory function type for creating handlers
 */
export type HandlerFactory<
  TEntity extends string = string,
  TDeps extends SyncHandlerDeps = SyncEngineDeps
> = (deps: TDeps) => ISyncHandler<TEntity>;

/**
 * Generic handler registry
 * 
 * Can be used statically or as an instance for scoping
 */
export class HandlerRegistry<
  TEntity extends string = string,
  TDeps extends SyncHandlerDeps = SyncEngineDeps
> {
  private handlers: Map<TEntity, HandlerFactory<TEntity, TDeps>>;
  private deps: TDeps;

  /**
   * Global static registry (for backwards compatibility)
   */
  private static globalHandlers: Map<string, HandlerFactory> = new Map();

  constructor(deps: TDeps, initialHandlers?: Map<TEntity, HandlerFactory<TEntity, TDeps>>) {
    this.deps = deps;
    this.handlers = initialHandlers ?? new Map();
  }

  /**
   * Register a handler factory for an entity type
   */
  register(entityType: TEntity, factory: HandlerFactory<TEntity, TDeps>): void {
    this.handlers.set(entityType, factory);
  }

  /**
   * Get a handler for an entity type
   * @throws Error if no handler registered
   */
  getHandler(entityType: TEntity): ISyncHandler<TEntity> {
    const factory = this.handlers.get(entityType);
    if (!factory) {
      throw new Error(`No handler registered for entity: ${entityType}`);
    }
    return factory(this.deps) as ISyncHandler<TEntity>;
  }

  /**
   * Check if a handler is registered
   */
  hasHandler(entityType: TEntity): boolean {
    return this.handlers.has(entityType);
  }

  /**
   * Get all registered entity types
   */
  getRegisteredEntities(): TEntity[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Remove a handler
   */
  unregister(entityType: TEntity): boolean {
    return this.handlers.delete(entityType);
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Create handlers for all registered entities
   */
  createHandlers(): Map<TEntity, ISyncHandler<TEntity>> {
    const handlers = new Map<TEntity, ISyncHandler<TEntity>>();
    for (const [entityType, factory] of this.handlers) {
      handlers.set(entityType, factory(this.deps) as ISyncHandler<TEntity>);
    }
    return handlers;
  }

  /**
   * Initialize registry from configuration
   * Creates default handlers for entities without custom handlers
   */
  static fromConfig<TEntity extends string>(
    config: {
      entities: TEntity[];
      handlers?: Partial<Record<TEntity, HandlerFactory<TEntity>>>;
      defaultHandler?: HandlerFactory<TEntity>;
    },
    deps: SyncEngineDeps
  ): HandlerRegistry<TEntity> {
    const registry = new HandlerRegistry<TEntity>(deps as SyncHandlerDeps);

    for (const entity of config.entities) {
      const factory = config.handlers?.[entity] ?? config.defaultHandler;
      if (factory) {
        registry.register(entity, factory as HandlerFactory<TEntity>);
      }
    }

    return registry;
  }

  // ============================================================================
  // Static Methods (Backwards Compatibility)
  // ============================================================================

  /**
   * @deprecated Use instance methods instead
   * Register a handler in the global registry
   */
  static register<T extends string>(entityType: T, factory: HandlerFactory<T>): void {
    HandlerRegistry.globalHandlers.set(entityType, factory as HandlerFactory);
  }

  /**
   * @deprecated Use instance methods instead
   * Get a handler from the global registry
   */
  static getHandler<T extends string>(entityType: T, deps: SyncEngineDeps): ISyncHandler<T> {
    const factory = HandlerRegistry.globalHandlers.get(entityType);
    if (!factory) {
      throw new Error(`No handler registered for entity: ${entityType}`);
    }
    return factory(deps) as ISyncHandler<T>;
  }

  /**
   * @deprecated Use instance methods instead
   * Check if handler exists in global registry
   */
  static hasHandler<T extends string>(entityType: T): boolean {
    return HandlerRegistry.globalHandlers.has(entityType);
  }

  /**
   * @deprecated Use instance methods instead
   * Get all registered entities from global registry
   */
  static getRegisteredEntities(): string[] {
    return Array.from(HandlerRegistry.globalHandlers.keys());
  }

  /**
   * @deprecated Use instance methods instead
   * Clear global registry
   */
  static clear(): void {
    HandlerRegistry.globalHandlers.clear();
  }
}

/**
 * Create a typed handler registry
 * Helper function for better type inference
 */
export function createHandlerRegistry<TEntity extends string>(
  deps: SyncEngineDeps,
  handlers?: Partial<Record<TEntity, HandlerFactory<TEntity>>>
): HandlerRegistry<TEntity> {
  const registry = new HandlerRegistry<TEntity>(deps);
  
  if (handlers) {
    for (const [entity, factory] of Object.entries(handlers) as [TEntity, HandlerFactory<TEntity>][]) {
      registry.register(entity, factory);
    }
  }
  
  return registry;
}
```

### 3. `packages/drizzle-sync/src/server/conflict-resolver.ts`

**ANTES:**
```typescript
import type { SyncEntity } from "@avileo/shared";

export class ConflictResolverRegistry {
  static getResolver(entityType: SyncEntity): IConflictResolver {
    // ...
  }
}
```

**DESPUÉS:**

```typescript
/**
 * Conflict Resolver Registry - Generic Version
 * 
 * Registry for conflict resolvers by entity type or strategy name.
 */

import type {
  IConflictResolver,
  ConflictCheckResult,
  SyncOperationInput,
} from "./types";

/**
 * No-op conflict resolver (default)
 */
export class NoOpConflictResolver<
  TRequestContext = unknown,
  TTransaction = unknown,
  TEntity extends string = string
> implements IConflictResolver<TRequestContext, TTransaction, TEntity> {
  async checkConflict(
    _ctx: TRequestContext,
    _operation: SyncOperationInput<TEntity>,
    _tx: TTransaction
  ): Promise<ConflictCheckResult> {
    return { hasConflict: false };
  }
}

/**
 * Generic conflict resolver registry
 */
export class ConflictResolverRegistry<
  TEntity extends string = string,
  TRequestContext = unknown,
  TTransaction = unknown
> {
  private resolvers: Map<TEntity | string, IConflictResolver<TRequestContext, TTransaction, TEntity>>;
  private defaultResolver: IConflictResolver<TRequestContext, TTransaction, TEntity>;

  /**
   * Global static registry
   */
  private static globalResolvers: Map<
    string,
    IConflictResolver<unknown, unknown, string>
  > = new Map();
  private static globalDefault = new NoOpConflictResolver();

  constructor(
    options?: {
      resolvers?: Map<TEntity | string, IConflictResolver<TRequestContext, TTransaction, TEntity>>;
      defaultResolver?: IConflictResolver<TRequestContext, TTransaction, TEntity>;
    }
  ) {
    this.resolvers = options?.resolvers ?? new Map();
    this.defaultResolver = options?.defaultResolver ?? new NoOpConflictResolver();
  }

  /**
   * Register a conflict resolver for an entity type or strategy name
   */
  register(
    key: TEntity | string,
    resolver: IConflictResolver<TRequestContext, TTransaction, TEntity>
  ): void {
    this.resolvers.set(key, resolver);
  }

  /**
   * Get a conflict resolver
   * Falls back to default if not found
   */
  getResolver(
    entityType: TEntity,
    strategy?: string
  ): IConflictResolver<TRequestContext, TTransaction, TEntity> {
    // Try strategy-specific resolver first
    if (strategy && this.resolvers.has(strategy)) {
      return this.resolvers.get(strategy)!;
    }
    
    // Try entity-specific resolver
    if (this.resolvers.has(entityType)) {
      return this.resolvers.get(entityType)!;
    }
    
    // Fall back to default
    return this.defaultResolver;
  }

  /**
   * Check if a resolver is registered
   */
  hasResolver(key: TEntity | string): boolean {
    return this.resolvers.has(key);
  }

  /**
   * Set the default resolver
   */
  setDefaultResolver(
    resolver: IConflictResolver<TRequestContext, TTransaction, TEntity>
  ): void {
    this.defaultResolver = resolver;
  }

  /**
   * Create resolver from configuration
   */
  static fromConfig<TEntity extends string>(
    config: {
      entities: TEntity[];
      strategies?: Record<string, IConflictResolver>;
      entityResolvers?: Partial<Record<TEntity, IConflictResolver>>;
      defaultResolver?: IConflictResolver;
    }
  ): ConflictResolverRegistry<TEntity> {
    const registry = new ConflictResolverRegistry<TEntity>();

    // Register strategy resolvers
    if (config.strategies) {
      for (const [strategy, resolver] of Object.entries(config.strategies)) {
        registry.register(strategy, resolver as IConflictResolver);
      }
    }

    // Register entity-specific resolvers
    if (config.entityResolvers) {
      for (const [entity, resolver] of Object.entries(config.entityResolvers) as [
        TEntity,
        IConflictResolver
      ][]) {
        registry.register(entity, resolver);
      }
    }

    if (config.defaultResolver) {
      registry.setDefaultResolver(config.defaultResolver as IConflictResolver);
    }

    return registry;
  }

  // ============================================================================
  // Static Methods (Backwards Compatibility)
  // ============================================================================

  /**
   * @deprecated Use instance methods instead
   */
  static registerResolver<T extends string>(
    entityType: T,
    resolver: IConflictResolver
  ): void {
    ConflictResolverRegistry.globalResolvers.set(entityType, resolver as IConflictResolver);
  }

  /**
   * @deprecated Use instance methods instead
   */
  static getResolver<T extends string>(entityType: T): IConflictResolver {
    return ConflictResolverRegistry.globalResolvers.get(entityType) ?? 
           ConflictResolverRegistry.globalDefault;
  }

  /**
   * @deprecated Use instance methods instead
   */
  static clear(): void {
    ConflictResolverRegistry.globalResolvers.clear();
    ConflictResolverRegistry.globalDefault = new NoOpConflictResolver();
  }
}
```

### 4. `packages/drizzle-sync/src/server/entity-registry.ts`

Ya está genérico en su mayoría, pero actualizar el import:

```typescript
/**
 * Entity Registry - Instance-based tracking
 * 
 * Tracks entity state changes within a sync batch.
 */

import type { IEntityRegistry } from "./types";

export { type IEntityRegistry } from "./types";

export class EntityRegistry implements IEntityRegistry {
  private createdIds = new Set<string>();
  private updatedIds = new Set<string>();
  private deletedIds = new Set<string>();

  register(operation: "create" | "update" | "delete", entityId: string): void {
    switch (operation) {
      case "create":
        this.createdIds.add(entityId);
        break;
      case "update":
        this.updatedIds.add(entityId);
        break;
      case "delete":
        this.deletedIds.add(entityId);
        break;
    }
  }

  wasCreated(entityId: string): boolean {
    return this.createdIds.has(entityId);
  }

  wasModified(entityId: string): boolean {
    return this.updatedIds.has(entityId) || this.createdIds.has(entityId);
  }

  wasDeleted(entityId: string): boolean {
    return this.deletedIds.has(entityId);
  }

  clear(): void {
    this.createdIds.clear();
    this.updatedIds.clear();
    this.deletedIds.clear();
  }

  getStats(): { created: number; updated: number; deleted: number } {
    return {
      created: this.createdIds.size,
      updated: this.updatedIds.size,
      deleted: this.deletedIds.size,
    };
  }
}
```

### 5. Actualizar exports en `src/server/index.ts`

```typescript
/**
 * Server Module Entrypoint - Generic Version
 */

// Types
export type {
  SyncOperationType,
  SyncOperationInput,
  SyncOperationResult,
  SyncBatchResult,
  SyncContext,
  SyncHandlerResult,
  SyncHandlerDeps,
  SyncEngineDeps,
  ISyncHandler,
  IEntityRegistry,
  IPipelineStage,
  SyncPipelineConfig,
  ConflictCheckResult,
  IConflictResolver,
} from "./types";

// Backwards compatibility
export type { SyncEntity } from "./types";

// Entity Registry
export { EntityRegistry } from "./entity-registry";
export type { IEntityRegistry } from "./types";

// Handler Registry
export {
  HandlerRegistry,
  createHandlerRegistry,
  type HandlerFactory,
} from "./handler-registry";

// Conflict Resolver
export {
  ConflictResolverRegistry,
  NoOpConflictResolver,
} from "./conflict-resolver";

// Other exports (maintained)
export * from "./operation-sorter";
export * from "./sync-engine";
```

## Testing

```typescript
// packages/drizzle-sync/src/server/__tests__/generic-registries.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
  HandlerRegistry,
  ConflictResolverRegistry,
  NoOpConflictResolver,
  EntityRegistry,
  type ISyncHandler,
} from '../';

describe('generic registries', () => {
  describe('HandlerRegistry', () => {
    type TestEntity = 'customers' | 'sales';
    const mockDeps = { db: {}, logger: {} };

    it('registers and retrieves handlers', () => {
      const registry = new HandlerRegistry<TestEntity>(mockDeps);
      const mockHandler: ISyncHandler<'customers'> = {
        entityType: 'customers',
        validateBusinessRules: vi.fn(),
        execute: vi.fn(),
      };

      registry.register('customers', () => mockHandler);
      
      expect(registry.hasHandler('customers')).toBe(true);
      expect(registry.getHandler('customers')).toBe(mockHandler);
    });

    it('throws for unregistered entity', () => {
      const registry = new HandlerRegistry<TestEntity>(mockDeps);
      
      expect(() => registry.getHandler('sales')).toThrow('No handler registered');
    });

    it('creates from config', () => {
      const handlerSpy = vi.fn(() => ({ entityType: 'customers' }));
      
      const registry = HandlerRegistry.fromConfig<TestEntity>(
        {
          entities: ['customers', 'sales'],
          handlers: {
            customers: handlerSpy,
          },
          defaultHandler: () => ({ entityType: 'default' }),
        },
        mockDeps
      );

      expect(registry.hasHandler('customers')).toBe(true);
      expect(registry.hasHandler('sales')).toBe(true);
      expect(handlerSpy).toHaveBeenCalledWith(mockDeps);
    });
  });

  describe('ConflictResolverRegistry', () => {
    type TestEntity = 'customers';
    
    it('registers and retrieves resolvers', () => {
      const registry = new ConflictResolverRegistry<TestEntity>();
      const resolver = new NoOpConflictResolver();

      registry.register('customers', resolver);
      
      expect(registry.getResolver('customers')).toBe(resolver);
    });

    it('falls back to default resolver', () => {
      const registry = new ConflictResolverRegistry<TestEntity>();
      
      const resolver = registry.getResolver('customers');
      expect(resolver).toBeInstanceOf(NoOpConflictResolver);
    });

    it('prioritizes strategy over entity type', () => {
      const registry = new ConflictResolverRegistry<TestEntity>();
      const entityResolver = { checkConflict: vi.fn() };
      const strategyResolver = { checkConflict: vi.fn() };

      registry.register('customers', entityResolver as any);
      registry.register('custom-strategy', strategyResolver as any);

      expect(registry.getResolver('customers', 'custom-strategy')).toBe(strategyResolver);
    });
  });

  describe('EntityRegistry', () => {
    it('tracks entity operations', () => {
      const registry = new EntityRegistry();

      registry.register('create', 'entity-1');
      expect(registry.wasCreated('entity-1')).toBe(true);

      registry.register('update', 'entity-2');
      expect(registry.wasModified('entity-2')).toBe(true);

      registry.register('delete', 'entity-3');
      expect(registry.wasDeleted('entity-3')).toBe(true);
    });

    it('reports stats correctly', () => {
      const registry = new EntityRegistry();

      registry.register('create', 'e1');
      registry.register('create', 'e2');
      registry.register('update', 'e3');
      registry.register('delete', 'e4');

      expect(registry.getStats()).toEqual({
        created: 2,
        updated: 1,
        deleted: 1,
      });
    });
  });
});
```

## Acceptance Criteria

- [ ] `HandlerRegistry` genérico funciona con cualquier `TEntity extends string`
- [ ] `ConflictResolverRegistry` genérico funciona con estrategias y entidades
- [ ] `EntityRegistry` usa `IEntityRegistry` interface
- [ ] Métodos estáticos marcados como `@deprecated` pero siguen funcionando
- [ ] Tests actualizados pasan
- [ ] Tipos genéricos inferidos correctamente en usage

## Breaking Changes

- Ninguno si se mantienen métodos estáticos (deprecated)
- Los imports de `SyncEntity` desde `@avileo/shared` ahora deben hacerse explícitamente

## Time Estimate

3 horas (incluyendo tests)
