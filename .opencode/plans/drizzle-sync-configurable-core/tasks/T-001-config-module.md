# T-001: Crear módulo `config/` con tipos y `defineEntity`

## Requirement IDs
- FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008
- NFR-001, NFR-005

## Objective
Crear el módulo de configuración que define los tipos base y el helper `defineEntity` para declarar entidades de forma type-safe.

## Files to Create

1. `packages/drizzle-sync/src/config/types.ts`
2. `packages/drizzle-sync/src/config/entity-definition.ts`
3. `packages/drizzle-sync/src/config/validator.ts`
4. `packages/drizzle-sync/src/config/index.ts`

## Implementation

### 1. `packages/drizzle-sync/src/config/types.ts`

```typescript
/**
 * Configuration Types
 * 
 * Core types for the sync engine configuration system.
 * These types are completely generic and don't depend on any specific entities.
 */

import type { z } from 'zod';

// ============================================================================
// Entity Configuration
// ============================================================================

/**
 * Conflict resolution strategy
 */
export type ConflictResolutionStrategy = 
  | 'last-write-wins' 
  | 'first-write-wins' 
  | 'version-based'
  | 'merge'
  | 'manual'
  | string; // Allow custom strategies

/**
 * Hook functions for entity lifecycle
 */
export interface EntityHooks<TEntity = unknown, TContext = unknown> {
  /** Called before processing a sync operation */
  beforeSync?: (data: TEntity, context: TContext) => Promise<void> | void;
  
  /** Called after successful sync */
  afterSync?: (entity: TEntity, context: TContext) => Promise<void> | void;
  
  /** Called when a conflict is detected */
  onConflict?: (
    local: TEntity,
    server: TEntity,
    context: TContext
  ) => Promise<ConflictResolution | void> | ConflictResolution | void;
  
  /** Called when sync fails */
  onError?: (error: Error, data: TEntity, context: TContext) => Promise<void> | void;
}

/**
 * Conflict resolution result
 */
export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  data?: Record<string, unknown>;
}

/**
 * Configuration for a single syncable entity
 */
export interface EntityConfig<
  TName extends string = string,
  TField extends string = string
> {
  /** Database table name */
  tableName: string;
  
  /** 
   * Entity identifier (key in the entities config object)
   * This is what users use to reference the entity in code
   */
  entityType: TName;
  
  /** List of valid fields/columns for this entity */
  fields: readonly TField[];
  
  /** 
   * Processing priority (lower = processed first)
   * Used for parent-before-child ordering
   * @default 99
   */
  priority: number;
  
  /** 
   * Fields that reference parent entities
   * Used for referential integrity validation
   */
  parentFields?: readonly string[];
  
  /** 
   * Child entity types that depend on this entity
   * Used for dependency ordering
   */
  childEntities?: readonly string[];
  
  /** 
   * Whether this entity supports self-healing
   * (converting update to insert if entity not found)
   * @default false
   */
  selfHeal: boolean;
  
  /** 
   * Field name for sync status tracking
   * If provided, this field will be updated during sync
   */
  syncStatusField?: string;
  
  /** 
   * Field name for sync attempts tracking
   * If provided, this field will be incremented on retry
   */
  syncAttemptsField?: string;
  
  /** 
   * Field name for version tracking (for conflict detection)
   */
  versionField?: string;
  
  /** 
   * Default conflict resolution strategy for this entity
   * @default 'last-write-wins'
   */
  conflictResolver: ConflictResolutionStrategy;
  
  /** 
   * Custom hooks for entity lifecycle
   */
  hooks?: EntityHooks;
  
  /** 
   * Additional metadata (can be used by custom handlers)
   */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Sync Engine Configuration
// ============================================================================

/**
 * Database client interface (minimal)
 * Actual implementation will be provided by Drizzle or PGlite
 */
export interface DatabaseConfig {
  /** Execute raw SQL */
  execute: (sql: string) => Promise<unknown>;
  
  /** Run a transaction */
  transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
}

/**
 * Logger interface
 */
export interface LoggerConfig {
  debug: (msg: string, data?: unknown) => void;
  info: (msg: string, data?: unknown) => void;
  warn: (msg: string, data?: unknown) => void;
  error: (msg: string, data?: unknown) => void;
}

/**
 * Handler factory function type
 */
export type HandlerFactory<
  TEntity extends string = string,
  TDeps = unknown
> = (deps: TDeps) => unknown; // Will be refined to ISyncHandler

/**
 * Configuration for the sync engine
 */
export interface SyncEngineConfig<
  TEntity extends string = string,
  TContext = unknown,
  TTransaction = unknown
> {
  /** 
   * Entity configurations
   * Key is the entity type identifier, value is the configuration
   */
  entities: Record<TEntity, EntityConfig<TEntity>>;
  
  /** 
   * Custom handlers for specific entities (optional)
   * If not provided, default handlers will be used
   */
  handlers?: Partial<Record<TEntity, HandlerFactory<TEntity>>>;
  
  /** 
   * Custom conflict resolvers (optional)
   * Key is the strategy name, value is the resolver function
   */
  conflictResolvers?: Record<string, ConflictResolverConfig<TContext, TTransaction>>;
  
  /** 
   * Database client configuration
   */
  database?: DatabaseConfig;
  
  /** 
   * Logger configuration (optional)
   */
  logger?: LoggerConfig;
  
  /** 
   * Global hooks (optional)
   */
  hooks?: {
    onPushComplete?: (result: unknown) => Promise<void> | void;
    onPullComplete?: (changes: unknown[]) => Promise<void> | void;
    onConflictDetected?: (conflict: unknown) => Promise<void> | void;
    onError?: (error: Error) => Promise<void> | void;
  };
  
  /** 
   * Sync options
   */
  options?: {
    /** Batch size for sync operations */
    batchSize?: number;
    /** Maximum retry attempts */
    maxRetries?: number;
    /** Sync interval in milliseconds */
    syncInterval?: number;
    /** Pull interval in milliseconds */
    pullInterval?: number;
    /** Exponential backoff multiplier */
    backoffMultiplier?: number;
    /** Log level */
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  };
}

/**
 * Conflict resolver configuration
 */
export interface ConflictResolverConfig<TContext = unknown, TTransaction = unknown> {
  /**
   * Check if there's a conflict
   */
  checkConflict: (
    ctx: TContext,
    operation: unknown,
    tx: TTransaction
  ) => Promise<{ hasConflict: boolean; serverVersion?: number; serverData?: unknown }>;
  
  /**
   * Resolve a conflict
   */
  resolve: (
    ctx: TContext,
    localData: unknown,
    serverData: unknown,
    strategy: string
  ) => Promise<unknown>;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validation error
 */
export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Extract entity names from config
 */
export type EntityNames<TConfig extends SyncEngineConfig> = 
  TConfig extends SyncEngineConfig<infer TEntity, infer _, infer _> 
    ? TEntity 
    : never;

/**
 * Extract entity config for a specific entity
 */
export type EntityConfigFor<
  TConfig extends SyncEngineConfig,
  TEntity extends string
> = TConfig['entities'][TEntity];

/**
 * Extract fields for a specific entity
 */
export type EntityFields<
  TConfig extends SyncEngineConfig,
  TEntity extends string
> = EntityConfigFor<TConfig, TEntity> extends EntityConfig<string, infer TFields>
  ? TFields
  : never;
```

### 2. `packages/drizzle-sync/src/config/entity-definition.ts`

```typescript
/**
 * Entity Definition Helper
 * 
 * Provides type-safe helper functions for defining entity configurations.
 */

import type { 
  EntityConfig, 
  EntityHooks, 
  ConflictResolutionStrategy,
} from './types';

// ============================================================================
// defineEntity Helper
// ============================================================================

/**
 * Input type for defineEntity (allows omitting defaults)
 */
export interface DefineEntityInput<
  TName extends string = string,
  TField extends string = string
> {
  tableName: string;
  fields: readonly TField[];
  priority?: number;
  parentFields?: readonly string[];
  childEntities?: readonly string[];
  selfHeal?: boolean;
  syncStatusField?: string;
  syncAttemptsField?: string;
  versionField?: string;
  conflictResolver?: ConflictResolutionStrategy;
  hooks?: EntityHooks;
  metadata?: Record<string, unknown>;
}

/**
 * Define an entity configuration with type inference
 * 
 * @example
 * ```typescript
 * const customerEntity = defineEntity({
 *   entityType: 'customers',
 *   tableName: 'customers',
 *   fields: ['id', 'name', 'email', 'business_id'],
 *   priority: 1,
 *   parentFields: ['business_id'],
 *   conflictResolver: 'last-write-wins',
 *   selfHeal: true,
 * });
 * 
 * // Type is inferred as:
 * // EntityConfig<'customers', 'id' | 'name' | 'email' | 'business_id'>
 * ```
 */
export function defineEntity<
  TName extends string,
  const TFields extends readonly string[]
>(
  entityType: TName,
  input: Omit<DefineEntityInput<TName, TFields[number]>, 'entityType'>
): EntityConfig<TName, TFields[number]> {
  return {
    entityType,
    tableName: input.tableName,
    fields: input.fields,
    priority: input.priority ?? 99,
    parentFields: input.parentFields,
    childEntities: input.childEntities,
    selfHeal: input.selfHeal ?? false,
    syncStatusField: input.syncStatusField,
    syncAttemptsField: input.syncAttemptsField,
    versionField: input.versionField,
    conflictResolver: input.conflictResolver ?? 'last-write-wins',
    hooks: input.hooks,
    metadata: input.metadata,
  };
}

// ============================================================================
// Builder Pattern (Alternative)
// ============================================================================

/**
 * Entity builder for fluent API
 * 
 * @example
 * ```typescript
 * const customerEntity = entityBuilder('customers')
 *   .table('customers')
 *   .fields(['id', 'name', 'email'])
 *   .priority(1)
 *   .parentFields(['business_id'])
 *   .selfHeal(true)
 *   .build();
 * ```
 */
export class EntityBuilder<TName extends string> {
  private config: Partial<EntityConfig<TName>> & { entityType: TName };

  constructor(entityType: TName) {
    this.config = { entityType };
  }

  table(name: string): this {
    this.config.tableName = name;
    return this;
  }

  fields<const T extends readonly string[]>(fields: T): EntityBuilderWithFields<TName, T> {
    (this.config as EntityConfig).fields = fields;
    return this as unknown as EntityBuilderWithFields<TName, T>;
  }

  priority(p: number): this {
    this.config.priority = p;
    return this;
  }

  parentFields(fields: readonly string[]): this {
    this.config.parentFields = fields;
    return this;
  }

  childEntities(entities: readonly string[]): this {
    this.config.childEntities = entities;
    return this;
  }

  selfHeal(enabled: boolean): this {
    this.config.selfHeal = enabled;
    return this;
  }

  syncStatusField(field: string): this {
    this.config.syncStatusField = field;
    return this;
  }

  versionField(field: string): this {
    this.config.versionField = field;
    return this;
  }

  conflictResolver(strategy: ConflictResolutionStrategy): this {
    this.config.conflictResolver = strategy;
    return this;
  }

  hooks(h: EntityHooks): this {
    this.config.hooks = h;
    return this;
  }

  build(): EntityConfig<TName> {
    if (!this.config.tableName) {
      throw new Error(`Entity ${this.config.entityType}: tableName is required`);
    }
    if (!this.config.fields || this.config.fields.length === 0) {
      throw new Error(`Entity ${this.config.entityType}: fields are required`);
    }

    return {
      entityType: this.config.entityType,
      tableName: this.config.tableName,
      fields: this.config.fields,
      priority: this.config.priority ?? 99,
      parentFields: this.config.parentFields,
      childEntities: this.config.childEntities,
      selfHeal: this.config.selfHeal ?? false,
      syncStatusField: this.config.syncStatusField,
      syncAttemptsField: this.config.syncAttemptsField,
      versionField: this.config.versionField,
      conflictResolver: this.config.conflictResolver ?? 'last-write-wins',
      hooks: this.config.hooks,
      metadata: this.config.metadata,
    } as EntityConfig<TName>;
  }
}

// Helper type to enforce fields before build
interface EntityBuilderWithFields<TName extends string, TFields extends readonly string[]> {
  priority(p: number): this;
  parentFields(fields: readonly string[]): this;
  childEntities(entities: readonly string[]): this;
  selfHeal(enabled: boolean): this;
  syncStatusField(field: string): this;
  versionField(field: string): this;
  conflictResolver(strategy: ConflictResolutionStrategy): this;
  hooks(h: EntityHooks): this;
  build(): EntityConfig<TName, TFields[number]>;
}

/**
 * Create an entity builder
 */
export function entityBuilder<TName extends string>(entityType: TName): EntityBuilder<TName> {
  return new EntityBuilder(entityType);
}
```

### 3. `packages/drizzle-sync/src/config/validator.ts`

```typescript
/**
 * Configuration Validator
 * 
 * Validates sync engine configuration for consistency and correctness.
 */

import type { 
  SyncEngineConfig, 
  EntityConfig, 
  ValidationResult, 
  ValidationError 
} from './types';

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a complete sync engine configuration
 */
export function validateConfig<
  TEntity extends string
>(config: SyncEngineConfig<TEntity>): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate entities exist
  if (!config.entities || Object.keys(config.entities).length === 0) {
    errors.push({
      path: 'entities',
      message: 'At least one entity must be configured',
      code: 'MISSING_ENTITIES',
    });
    return { valid: false, errors };
  }

  // Validate each entity
  const entityEntries = Object.entries(config.entities) as [TEntity, EntityConfig<TEntity>][];
  
  for (const [entityType, entityConfig] of entityEntries) {
    const entityErrors = validateEntity(entityConfig, entityType, config.entities);
    errors.push(...entityErrors.map(e => ({ ...e, path: `entities.${entityType}.${e.path}` })));
  }

  // Check for circular dependencies
  const cycleErrors = checkCircularDependencies(config.entities);
  errors.push(...cycleErrors);

  // Validate priority consistency
  const priorityErrors = validatePriorityConsistency(config.entities);
  errors.push(...priorityErrors);

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single entity configuration
 */
function validateEntity<
  TEntity extends string,
  TField extends string
>(
  entity: EntityConfig<TEntity, TField>,
  entityType: TEntity,
  allEntities: Record<TEntity, EntityConfig<TEntity>>
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields
  if (!entity.tableName || entity.tableName.trim() === '') {
    errors.push({
      path: 'tableName',
      message: 'Table name is required',
      code: 'MISSING_TABLE_NAME',
    });
  }

  if (!entity.fields || entity.fields.length === 0) {
    errors.push({
      path: 'fields',
      message: 'At least one field is required',
      code: 'MISSING_FIELDS',
    });
  }

  // Check for duplicate fields
  const fieldSet = new Set(entity.fields);
  if (fieldSet.size !== entity.fields.length) {
    errors.push({
      path: 'fields',
      message: 'Duplicate fields detected',
      code: 'DUPLICATE_FIELDS',
    });
  }

  // Validate parent fields exist in fields list
  if (entity.parentFields) {
    for (const parentField of entity.parentFields) {
      if (!entity.fields.includes(parentField as TField)) {
        errors.push({
          path: 'parentFields',
          message: `Parent field "${parentField}" must be in fields list`,
          code: 'INVALID_PARENT_FIELD',
        });
      }
    }
  }

  // Validate child entities exist
  if (entity.childEntities) {
    for (const childEntity of entity.childEntities) {
      if (!allEntities[childEntity as TEntity]) {
        errors.push({
          path: 'childEntities',
          message: `Child entity "${childEntity}" is not defined`,
          code: 'MISSING_CHILD_ENTITY',
        });
      }
    }
  }

  // Validate sync status field exists in fields
  if (entity.syncStatusField && !entity.fields.includes(entity.syncStatusField as TField)) {
    errors.push({
      path: 'syncStatusField',
      message: `Sync status field "${entity.syncStatusField}" must be in fields list`,
      code: 'INVALID_SYNC_STATUS_FIELD',
    });
  }

  // Validate entityType matches key
  if (entity.entityType !== entityType) {
    errors.push({
      path: 'entityType',
      message: `Entity type "${entity.entityType}" does not match key "${entityType}"`,
      code: 'MISMATCHED_ENTITY_TYPE',
    });
  }

  return errors;
}

/**
 * Check for circular dependencies in entity graph
 */
function checkCircularDependencies<TEntity extends string>(
  entities: Record<TEntity, EntityConfig<TEntity>>
): ValidationError[] {
  const errors: ValidationError[] = [];
  const visited = new Set<TEntity>();
  const recursionStack = new Set<TEntity>();

  function visit(entityType: TEntity, path: TEntity[]): boolean {
    if (recursionStack.has(entityType)) {
      // Found cycle
      const cycle = path.slice(path.indexOf(entityType)).concat(entityType);
      errors.push({
        path: 'childEntities',
        message: `Circular dependency detected: ${cycle.join(' -> ')}`,
        code: 'CIRCULAR_DEPENDENCY',
      });
      return true;
    }

    if (visited.has(entityType)) {
      return false;
    }

    visited.add(entityType);
    recursionStack.add(entityType);

    const entity = entities[entityType];
    if (entity?.childEntities) {
      for (const child of entity.childEntities) {
        if (visit(child as TEntity, [...path, entityType])) {
          return true;
        }
      }
    }

    recursionStack.delete(entityType);
    return false;
  }

  for (const entityType of Object.keys(entities) as TEntity[]) {
    if (!visited.has(entityType)) {
      visit(entityType, []);
    }
  }

  return errors;
}

/**
 * Validate priority consistency (parents should have lower priority than children)
 */
function validatePriorityConsistency<TEntity extends string>(
  entities: Record<TEntity, EntityConfig<TEntity>>
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [entityType, entity] of Object.entries(entities) as [TEntity, EntityConfig<TEntity>][]) {
    if (entity.childEntities) {
      for (const childType of entity.childEntities) {
        const child = entities[childType as TEntity];
        if (child && child.priority <= entity.priority) {
          errors.push({
            path: 'priority',
            message: 
              `Child entity "${childType}" (priority ${child.priority}) ` +
              `should have higher priority than parent "${entityType}" (priority ${entity.priority})`,
            code: 'INVALID_PRIORITY_HIERARCHY',
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Assert that configuration is valid, throw if not
 */
export function assertValidConfig<TEntity extends string>(
  config: SyncEngineConfig<TEntity>
): asserts config is SyncEngineConfig<TEntity> {
  const result = validateConfig(config);
  if (!result.valid) {
    const messages = result.errors.map(e => `[${e.code}] ${e.path}: ${e.message}`);
    throw new Error(`Invalid sync configuration:\n${messages.join('\n')}`);
  }
}
```

### 4. `packages/drizzle-sync/src/config/index.ts`

```typescript
/**
 * Config Module Entry Point
 * 
 * Exports configuration types, helpers, and validators.
 */

// Types
export type {
  EntityConfig,
  EntityHooks,
  EntityNames,
  EntityConfigFor,
  EntityFields,
  SyncEngineConfig,
  DatabaseConfig,
  LoggerConfig,
  HandlerFactory,
  ConflictResolutionStrategy,
  ConflictResolution,
  ConflictResolverConfig,
  ValidationResult,
  ValidationError,
} from './types';

// Entity definition helpers
export { 
  defineEntity, 
  entityBuilder, 
  EntityBuilder,
  type DefineEntityInput,
} from './entity-definition';

// Validators
export { 
  validateConfig, 
  assertValidConfig,
} from './validator';
```

## Testing

### Test File: `packages/drizzle-sync/src/config/__tests__/config.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { defineEntity, entityBuilder, validateConfig, assertValidConfig } from '../';
import type { SyncEngineConfig } from '../types';

describe('config module', () => {
  describe('defineEntity', () => {
    it('creates entity config with defaults', () => {
      const entity = defineEntity('customers', {
        tableName: 'customers',
        fields: ['id', 'name'],
      });

      expect(entity.entityType).toBe('customers');
      expect(entity.tableName).toBe('customers');
      expect(entity.fields).toEqual(['id', 'name']);
      expect(entity.priority).toBe(99);
      expect(entity.selfHeal).toBe(false);
      expect(entity.conflictResolver).toBe('last-write-wins');
    });

    it('accepts custom values', () => {
      const entity = defineEntity('sales', {
        tableName: 'sales',
        fields: ['id', 'total'],
        priority: 1,
        selfHeal: true,
        conflictResolver: 'version-based',
        parentFields: ['customer_id'],
      });

      expect(entity.priority).toBe(1);
      expect(entity.selfHeal).toBe(true);
      expect(entity.conflictResolver).toBe('version-based');
      expect(entity.parentFields).toEqual(['customer_id']);
    });
  });

  describe('entityBuilder', () => {
    it('builds entity with fluent API', () => {
      const entity = entityBuilder('products')
        .table('products')
        .fields(['id', 'name', 'price'])
        .priority(1)
        .selfHeal(true)
        .build();

      expect(entity.entityType).toBe('products');
      expect(entity.fields).toEqual(['id', 'name', 'price']);
      expect(entity.priority).toBe(1);
    });

    it('throws if table not set', () => {
      expect(() => {
        entityBuilder('test')
          .fields(['id'])
          .build();
      }).toThrow('tableName is required');
    });
  });

  describe('validateConfig', () => {
    it('validates valid config', () => {
      const config: SyncEngineConfig = {
        entities: {
          customers: defineEntity('customers', {
            tableName: 'customers',
            fields: ['id', 'name'],
            priority: 1,
          }),
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects missing entities', () => {
      const config = { entities: {} } as SyncEngineConfig;
      const result = validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('MISSING_ENTITIES');
    });

    it('detects circular dependencies', () => {
      const config: SyncEngineConfig = {
        entities: {
          a: defineEntity('a', {
            tableName: 'a',
            fields: ['id'],
            priority: 1,
            childEntities: ['b'],
          }),
          b: defineEntity('b', {
            tableName: 'b',
            fields: ['id'],
            priority: 2,
            childEntities: ['a'], // Circular!
          }),
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
    });

    it('detects priority hierarchy violations', () => {
      const config: SyncEngineConfig = {
        entities: {
          parent: defineEntity('parent', {
            tableName: 'parent',
            fields: ['id'],
            priority: 2, // Higher than child
            childEntities: ['child'],
          }),
          child: defineEntity('child', {
            tableName: 'child',
            fields: ['id'],
            priority: 1, // Lower than parent (wrong!)
          }),
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_PRIORITY_HIERARCHY')).toBe(true);
    });
  });

  describe('assertValidConfig', () => {
    it('throws on invalid config', () => {
      expect(() => {
        assertValidConfig({ entities: {} } as SyncEngineConfig);
      }).toThrow('Invalid sync configuration');
    });

    it('does not throw on valid config', () => {
      const config: SyncEngineConfig = {
        entities: {
          test: defineEntity('test', {
            tableName: 'test',
            fields: ['id'],
          }),
        },
      };

      expect(() => assertValidConfig(config)).not.toThrow();
    });
  });
});
```

## Acceptance Criteria

- [x] Types creados: `EntityConfig`, `SyncEngineConfig`, `EntityHooks`, etc.
- [x] Helper `defineEntity()` implementado con type inference
- [x] Helper `entityBuilder()` implementado con fluent API
- [x] Validador implementado con checks de: entidades requeridas, campos requeridos, dependencias circulares, jerarquía de prioridades
- [x] Tests unitarios con > 80% cobertura
- [x] Todos los exports disponibles desde `config/index.ts`

## Time Estimate

4 horas (incluyendo tests y refinamiento de tipos)
