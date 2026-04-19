# T-002: Refactorizar tipos genéricos en `core/`

## Requirement IDs
- FR-009, FR-010, FR-012
- NFR-001

## Objective
Refactorizar el módulo `core` de `drizzle-sync` para eliminar dependencias de tipos específicos de Avileo (`SyncEntity` como union type) y reemplazarlos con genéricos `TEntity extends string`.

## Files to Modify

1. `packages/drizzle-sync/src/core/types.ts` - Eliminar exports específicos, mantener genéricos
2. `packages/drizzle-sync/src/core/interfaces.ts` - Convertir interfaces a genéricos
3. `packages/drizzle-sync/src/core/priority.ts` - Usar `EntityConfig[]` en lugar de constantes hardcodeadas
4. `packages/drizzle-sync/src/core/index.ts` - Actualizar exports

## Implementation

### 1. `packages/drizzle-sync/src/core/types.ts`

**ANTES (hardcodeado):**
```typescript
// Re-export entity tracking sets (from @avileo/shared)
export {
  SYNC_STATUS_TRACKED,
  SELF_HEAL_INSERTABLE,
  SYNC_STATUS_ENTITY_TABLES,
  SELF_HEAL_INSERTABLE_ENTITIES,
} from "./types"; // Estos vienen de @avileo/shared
```

**DESPUÉS (genérico):**

```typescript
/**
 * Core Sync Types - Generic Version
 * 
 * Runtime-agnostic types for sync operations.
 * These types use generics instead of hardcoded entity names.
 */

// ============================================================================
// Basic Types
// ============================================================================

export type SyncOperationType = "create" | "update" | "delete";

export type SyncStatus = 
  | "pending" 
  | "processing" 
  | "syncing" 
  | "completed" 
  | "failed" 
  | "conflict" 
  | "dead_letter";

// ============================================================================
// Entity Tracking (Generic)
// ============================================================================

/**
 * Get entities that should track sync status
 * Based on configuration, not hardcoded list
 */
export function getSyncStatusTrackedEntities<TEntity extends string>(
  entities: Record<TEntity, { syncStatusField?: string }>
): TEntity[] {
  return (Object.entries(entities) as [TEntity, { syncStatusField?: string }][])
    .filter(([, config]) => config.syncStatusField !== undefined)
    .map(([entity]) => entity);
}

/**
 * Get entities that support self-healing
 * Based on configuration, not hardcoded list
 */
export function getSelfHealEntities<TEntity extends string>(
  entities: Record<TEntity, { selfHeal: boolean }>
): TEntity[] {
  return (Object.entries(entities) as [TEntity, { selfHeal: boolean }][])
    .filter(([, config]) => config.selfHeal)
    .map(([entity]) => entity);
}

/**
 * Check if entity tracks sync status
 */
export function entityTracksSyncStatus<TEntity extends string>(
  entity: TEntity,
  entities: Record<TEntity, { syncStatusField?: string }>
): boolean {
  return entities[entity]?.syncStatusField !== undefined;
}

/**
 * Check if entity supports self-heal
 */
export function entitySupportsSelfHeal<TEntity extends string>(
  entity: TEntity,
  entities: Record<TEntity, { selfHeal: boolean }>
): boolean {
  return entities[entity]?.selfHeal === true;
}

// ============================================================================
// Operation Types
// ============================================================================

export interface SyncOperationRecord<TEntity extends string = string> {
  id: string;
  entityType: TEntity;
  entityId: string;
  operation: SyncOperationType;
  payload: Record<string, unknown>;
  status: SyncStatus;
  attempts: number;
  error?: string;
  syncGroupId?: string;
  correlationId?: string;
  deviceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnqueueParams<TEntity extends string = string> {
  entityType: TEntity;
  entityId: string;
  operation: SyncOperationType;
  payload: Record<string, unknown>;
  syncGroupId?: string;
  correlationId?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface ClassifiedError {
  category: 
    | "VALIDATION_ERROR" 
    | "NOT_FOUND" 
    | "CONFLICT" 
    | "DATABASE_ERROR" 
    | "NETWORK_ERROR" 
    | "UNKNOWN_ERROR";
  retryable: boolean;
  message: string;
}

export const SyncErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  DATABASE_ERROR: "DATABASE_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

// ============================================================================
// Conflict Types
// ============================================================================

export interface BackendConflict<TEntity extends string = string> {
  id: string;
  businessId: string;
  operationId: string;
  entityType: TEntity;
  entityId: string;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  localVersion: number;
  serverVersion: number;
  status: "pending" | "resolved" | "rejected";
  resolution?: "server" | "local" | "merge";
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

export interface ConflictResolution {
  strategy: "server" | "local" | "merge" | "manual";
  data?: Record<string, unknown>;
}

// ============================================================================
// Batch Types
// ============================================================================

export interface BatchSyncResponse<TEntity extends string = string> {
  results: Array<{
    idempotencyKey: string;
    success: boolean;
    error?: string;
    conflict?: {
      serverVersion: number;
      serverData: Record<string, unknown>;
    };
    serverTimestamp: string;
  }>;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    conflicts: number;
  };
}

export interface SyncApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Dead Letter Types
// ============================================================================

export interface DeadLetterOperationRecord<TEntity extends string = string> {
  id: string;
  originalId: string;
  entityType: TEntity;
  entityId: string;
  operation: SyncOperationType;
  payload: Record<string, unknown>;
  error: string;
  attempts: number;
  createdAt: Date;
  movedAt: Date;
}

// ============================================================================
// Utility Types
// ============================================================================

export type SyncOperation<TEntity extends string = string> = SyncOperationRecord<TEntity>;
export type DeadLetterOperation<TEntity extends string = string> = DeadLetterOperationRecord<TEntity>;

/**
 * Utility functions (runtime)
 */

export function normalizeDatesToISO(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (typeof value === "object" && value !== null) {
      result[key] = normalizeDatesToISO(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function buildPlaceholders(count: number, startAt = 1): string {
  return Array.from({ length: count }, (_, i) => `$${startAt + i}`).join(", ");
}

export function parsePayload(payload: unknown): Record<string, unknown> {
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return {};
    }
  }
  if (typeof payload === "object" && payload !== null) {
    return payload as Record<string, unknown>;
  }
  return {};
}

export function validateEntityTableName(
  entityType: string,
  validEntities: string[]
): boolean {
  return validEntities.includes(entityType);
}

export function classifyError(error: string): ClassifiedError {
  const message = error.toLowerCase();
  
  if (message.includes("validation") || message.includes("invalid")) {
    return { category: "VALIDATION_ERROR", retryable: false, message: error };
  }
  if (message.includes("not found") || message.includes("no existe")) {
    return { category: "NOT_FOUND", retryable: false, message: error };
  }
  if (message.includes("conflict") || message.includes("version")) {
    return { category: "CONFLICT", retryable: false, message: error };
  }
  if (message.includes("database") || message.includes("sql") || message.includes("unique")) {
    return { category: "DATABASE_ERROR", retryable: true, message: error };
  }
  if (message.includes("timeout") || message.includes("connection")) {
    return { category: "NETWORK_ERROR", retryable: true, message: error };
  }
  
  return { category: "UNKNOWN_ERROR", retryable: false, message: error };
}
```

### 2. `packages/drizzle-sync/src/core/interfaces.ts`

**ANTES:**
```typescript
export interface ISyncHandler {
  readonly entityType: string; // Genérico pero no usa TEntity
  // ...
}
```

**DESPUÉS:**

```typescript
/**
 * Core Sync Interfaces - Generic Version
 * 
 * Runtime-agnostic interfaces using generics for type safety.
 */

import type {
  SyncOperationRecord,
  SyncStatus,
  EnqueueParams,
  DeadLetterOperationRecord,
  ClassifiedError,
} from "./types";

// ============================================================================
// Queue Interface
// ============================================================================

export interface QueueOptions<TEntity extends string = string> {
  includePriority?: boolean;
  groupBySyncGroupId?: boolean;
  filterByEntity?: TEntity[];
}

/**
 * Generic sync queue interface
 */
export interface ISyncQueue<TEntity extends string = string> {
  enqueue(params: EnqueueParams<TEntity>): Promise<string>;
  getPending(limit: number, options?: QueueOptions<TEntity>): Promise<SyncOperationRecord<TEntity>[]>;
  getById(id: string): Promise<SyncOperationRecord<TEntity> | null>;
  getByEntityType(
    entityType: TEntity,
    entityId: string,
    statuses: string[]
  ): Promise<SyncOperationRecord<TEntity>[]>;
  markProcessing(id: string): Promise<void>;
  markCompleted(id: string): Promise<void>;
  markFailed(id: string, error: string, attempts: number): Promise<void>;
  markConflict(id: string, conflictData: unknown): Promise<void>;
  moveToDeadLetter(operation: SyncOperationRecord<TEntity>, error: string): Promise<void>;
  getStatus(): Promise<SyncStatus<TEntity>>;
  deleteOperation(id: string): Promise<boolean>;
  cleanupCompleted(olderThanDays: number): Promise<number>;
  retryOperation(id: string): Promise<boolean>;
  getFailedOperations(limit: number): Promise<SyncOperationRecord<TEntity>[]>;
  getDeadLetterOperations(limit: number): Promise<DeadLetterOperationRecord<TEntity>[]>;
}

// ============================================================================
// Handler Interface
// ============================================================================

/**
 * Result from a sync handler execution
 */
export interface HandlerResult {
  success: boolean;
  idempotencyKey: string;
  error?: string;
  conflict?: {
    entityType: string;
    entityId: string;
    clientVersion: number;
    serverVersion: number;
    serverData: Record<string, unknown>;
  };
  serverTimestamp: string;
}

/**
 * Generic sync handler interface
 * 
 * @template TEntity - Entity type identifier (e.g., 'customers', 'sales')
 * @template TContext - Request context type
 * @template TTransaction - Database transaction type
 */
export interface ISyncHandler<
  TEntity extends string = string,
  TContext = unknown,
  TTransaction = unknown
> {
  /** Entity type this handler processes */
  readonly entityType: TEntity;

  /**
   * Execute a sync operation
   */
  execute(
    ctx: TContext,
    operation: SyncOperationRecord<TEntity>,
    tx?: TTransaction
  ): Promise<HandlerResult>;

  /**
   * Validate business rules before execution (optional)
   */
  validateBusinessRules?(
    ctx: TContext,
    payload: Record<string, unknown>
  ): Promise<void>;

  /**
   * Check if entity supports self-healing
   */
  supportsSelfHeal?(): boolean;
}

// ============================================================================
// Sync Context
// ============================================================================

/**
 * Generic sync execution context
 */
export interface SyncContext<TEntity extends string = string> {
  businessId: string;
  userId: string;
  correlationId?: string;
  deviceId?: string;
  entityTypes?: TEntity[];
}

// ============================================================================
// Logger Interface
// ============================================================================

export type SyncLogLevel = "info" | "warn" | "error" | "debug";

export interface SyncLogEntry {
  id: string;
  timestamp: Date;
  level: SyncLogLevel;
  prefix: string;
  message: string;
  data?: unknown;
}

/**
 * Generic sync logger interface
 */
export interface ISyncLogger {
  info(prefix: string, message: string, data?: unknown): void;
  warn(prefix: string, message: string, data?: unknown): void;
  error(prefix: string, message: string, data?: unknown): void;
  debug?(prefix: string, message: string, data?: unknown): void;
  getEntries?(): SyncLogEntry[];
  clear?(): void;
}

// ============================================================================
// HTTP Client Interface
// ============================================================================

/**
 * Generic sync HTTP client interface
 */
export interface ISyncHttpClient<TEntity extends string = string> {
  sendBatch(operations: SyncOperationRecord<TEntity>[]): Promise<HandlerResult[]>;
  fetchChanges(
    cursor?: string,
    limit?: number
  ): Promise<{
    changes: Array<{
      idempotencyKey: string;
      entityType: TEntity;
      operation: string;
      entityId: string;
      payload: Record<string, unknown>;
      localTimestamp: string;
      processedAt: string;
    }>;
    cursor: string;
    hasMore: boolean;
  }>;
}

// ============================================================================
// Conflict Resolver Interface
// ============================================================================

/**
 * Generic conflict resolver interface
 */
export interface IConflictResolver<
  TEntity extends string = string,
  TContext = unknown,
  TTransaction = unknown
> {
  /**
   * Check if an operation has a conflict with server data
   */
  checkConflict(
    ctx: TContext,
    operation: SyncOperationRecord<TEntity>,
    tx: TTransaction
  ): Promise<{
    hasConflict: boolean;
    serverVersion?: number;
    serverData?: Record<string, unknown>;
  }>;

  /**
   * Resolve a conflict
   */
  resolve(
    ctx: TContext,
    conflict: {
      entityType: TEntity;
      localData: Record<string, unknown>;
      serverData: Record<string, unknown>;
      localVersion: number;
      serverVersion: number;
    },
    resolution: "server" | "local" | "merge"
  ): Promise<Record<string, unknown>>;
}

// ============================================================================
// Error Classifier Interface
// ============================================================================

/**
 * Generic error classifier interface
 */
export interface IErrorClassifier {
  classify(error: string): ClassifiedError;
}
```

### 3. `packages/drizzle-sync/src/core/priority.ts`

**ANTES:**
```typescript
import {
  ENTITY_PRIORITIES,
  getEntityPriority as sharedGetEntityPriority,
  type SyncEntity, // ← Import específico de Avileo
} from "@avileo/shared";

export const DEFAULT_ENTITY_PRIORITIES: EntityPriorityConfig = ENTITY_PRIORITIES as EntityPriorityConfig;

export function getEntityPriority(entityType: string): number {
  return sharedGetEntityPriority(entityType as SyncEntity); // ← Depende de Avileo
}
```

**DESPUÉS:**

```typescript
/**
 * Entity Priority - Generic Version
 * 
 * Priority configuration using EntityConfig instead of hardcoded constants.
 */

import type { EntityConfig } from "../config/types";

/**
 * Entity priority configuration type
 */
export interface EntityPriorityConfig {
  [entityType: string]: number;
}

/**
 * Build priority config from entity configurations
 */
export function buildPriorityConfig<TEntity extends string>(
  entities: Record<TEntity, EntityConfig<TEntity>>
): EntityPriorityConfig {
  const config: EntityPriorityConfig = {};
  
  for (const [entityType, entityConfig] of Object.entries(entities) as [
    TEntity,
    EntityConfig<TEntity>
  ][]) {
    config[entityType] = entityConfig.priority;
  }
  
  return config;
}

/**
 * Default priority (fallback)
 */
export const DEFAULT_PRIORITY = 99;

/**
 * Get priority for an entity type from configuration
 * 
 * @param entityType Entity type name
 * @param entities Entity configuration map
 * @returns Priority number (lower = processed first)
 */
export function getEntityPriority<TEntity extends string>(
  entityType: TEntity,
  entities: Record<TEntity, EntityConfig<TEntity>>
): number {
  return entities[entityType]?.priority ?? DEFAULT_PRIORITY;
}

/**
 * Sort entity types by priority (ascending)
 * 
 * @param entityTypes Array of entity types
 * @param entities Entity configuration map
 * @returns Sorted array of entity types
 */
export function sortEntitiesByPriority<TEntity extends string>(
  entityTypes: TEntity[],
  entities: Record<TEntity, EntityConfig<TEntity>>
): TEntity[] {
  return [...entityTypes].sort((a, b) => {
    const priorityA = getEntityPriority(a, entities);
    const priorityB = getEntityPriority(b, entities);
    return priorityA - priorityB;
  });
}

/**
 * Group entity types by priority tier
 * 
 * @param entityTypes Array of entity types
 * @param entities Entity configuration map
 * @returns Map of priority to entity types
 */
export function groupEntitiesByPriority<TEntity extends string>(
  entityTypes: TEntity[],
  entities: Record<TEntity, EntityConfig<TEntity>>
): Map<number, TEntity[]> {
  const groups = new Map<number, TEntity[]>();

  for (const entityType of entityTypes) {
    const priority = getEntityPriority(entityType, entities);
    const existing = groups.get(priority) ?? [];
    existing.push(entityType);
    groups.set(priority, existing);
  }

  return groups;
}

/**
 * Check if an entity is a parent entity (priority 1 or has children)
 * 
 * @param entityType Entity type name
 * @param entities Entity configuration map
 * @returns True if parent entity
 */
export function isParentEntity<TEntity extends string>(
  entityType: TEntity,
  entities: Record<TEntity, EntityConfig<TEntity>>
): boolean {
  const config = entities[entityType];
  if (!config) return false;
  
  // Parent if priority is 1 or has declared children
  return config.priority === 1 || (config.childEntities && config.childEntities.length > 0);
}

/**
 * Check if an entity is a child entity (priority > 1)
 * 
 * @param entityType Entity type name
 * @param entities Entity configuration map
 * @returns True if child entity
 */
export function isChildEntity<TEntity extends string>(
  entityType: TEntity,
  entities: Record<TEntity, EntityConfig<TEntity>>
): boolean {
  const priority = getEntityPriority(entityType, entities);
  return priority > 1 && priority < DEFAULT_PRIORITY;
}

/**
 * Get child entities for a parent
 * 
 * @param entityType Parent entity type
 * @param entities Entity configuration map
 * @returns Array of child entity types
 */
export function getChildEntities<TEntity extends string>(
  entityType: TEntity,
  entities: Record<TEntity, EntityConfig<TEntity>>
): TEntity[] {
  const config = entities[entityType];
  if (!config?.childEntities) return [];
  
  return config.childEntities.filter(
    (child): child is TEntity => child in entities
  );
}

/**
 * Get parent entity for a child (based on parentFields)
 * 
 * @param entityType Child entity type
 * @param entities Entity configuration map
 * @returns Parent entity type or undefined
 */
export function getParentEntity<TEntity extends string>(
  entityType: TEntity,
  entities: Record<TEntity, EntityConfig<TEntity>>
): TEntity | undefined {
  const config = entities[entityType];
  if (!config?.parentFields) return undefined;
  
  // Find entity that is referenced in parentFields
  for (const [otherEntity, otherConfig] of Object.entries(entities) as [
    TEntity,
    EntityConfig<TEntity>
  ][]) {
    if (otherEntity === entityType) continue;
    
    // Check if this entity is a parent (has this entity in childEntities)
    if (otherConfig.childEntities?.includes(entityType)) {
      return otherEntity;
    }
  }
  
  return undefined;
}

/**
 * Build a topological sort order for entities based on dependencies
 * 
 * @param entities Entity configuration map
 * @returns Sorted array of entity types (parents before children)
 */
export function buildEntityProcessingOrder<TEntity extends string>(
  entities: Record<TEntity, EntityConfig<TEntity>>
): TEntity[] {
  const sorted: TEntity[] = [];
  const visited = new Set<TEntity>();
  const visiting = new Set<TEntity>(); // For cycle detection
  
  function visit(entityType: TEntity) {
    if (visited.has(entityType)) return;
    if (visiting.has(entityType)) {
      throw new Error(`Circular dependency detected involving ${entityType}`);
    }
    
    visiting.add(entityType);
    
    // Visit children first (they have higher priority)
    const config = entities[entityType];
    if (config?.childEntities) {
      for (const child of config.childEntities) {
        if (child in entities) {
          visit(child as TEntity);
        }
      }
    }
    
    visiting.delete(entityType);
    visited.add(entityType);
    sorted.push(entityType);
  }
  
  // Get all entities sorted by priority first
  const allEntities = Object.keys(entities) as TEntity[];
  const byPriority = sortEntitiesByPriority(allEntities, entities);
  
  // Visit in priority order
  for (const entity of byPriority) {
    visit(entity);
  }
  
  return sorted;
}
```

### 4. `packages/drizzle-sync/src/core/index.ts`

Actualizar exports para reflejar cambios:

```typescript
/**
 * Core Module Entrypoint - Generic Version
 * 
 * Exports runtime-agnostic core types, interfaces, and utilities.
 */

// ============================================================================
// Types
// ============================================================================

export type {
  SyncOperationType,
  SyncStatus as SyncStatusType,
} from "./types";

export type {
  SyncOperationRecord,
  SyncOperation,
  EnqueueParams,
  SyncStatus,
  BatchSyncResponse,
} from "./types";

export type {
  BackendConflict,
  ConflictResolution,
  SyncApiResult,
} from "./types";

export type {
  ClassifiedError,
} from "./types";

export { SyncErrorCode } from "./types";

export type {
  DeadLetterOperationRecord,
  DeadLetterOperation,
} from "./types";

// ============================================================================
// Entity Tracking Utilities (Generic)
// ============================================================================

export {
  getSyncStatusTrackedEntities,
  getSelfHealEntities,
  entityTracksSyncStatus,
  entitySupportsSelfHeal,
} from "./types";

// ============================================================================
// Runtime Utilities
// ============================================================================

export {
  normalizeDatesToISO,
  buildPlaceholders,
  parsePayload,
  validateEntityTableName,
  classifyError,
} from "./types";

// ============================================================================
// Interfaces
// ============================================================================

export type {
  QueueOptions,
  SyncContext,
  ISyncQueue,
  HandlerResult,
  ISyncHandler,
  SyncLogLevel,
  SyncLogEntry,
  ISyncLogger,
  ISyncHttpClient,
  IConflictResolver,
  IErrorClassifier,
} from "./interfaces";

// ============================================================================
// Priority (Generic)
// ============================================================================

export type { EntityPriorityConfig } from "./priority";

export {
  buildPriorityConfig,
  DEFAULT_PRIORITY,
  getEntityPriority,
  sortEntitiesByPriority,
  groupEntitiesByPriority,
  isParentEntity,
  isChildEntity,
  getChildEntities,
  getParentEntity,
  buildEntityProcessingOrder,
} from "./priority";

// ============================================================================
// Coalesce
// ============================================================================

export type {
  CoalescePlanType,
  CoalescePlan,
} from "./coalesce";

export {
  mergeArrayById,
  deepMerge,
  parsePayload as parsePayloadCoalesce,
  getCoalescePlan,
  canCoalesce,
} from "./coalesce";

// ============================================================================
// Backoff
// ============================================================================

export type {
  BackoffOptions,
  IBackoffStrategy,
  RetryOptions,
} from "./backoff";

export {
  DEFAULT_BACKOFF_CONFIG,
  calculateBackoffDelay,
  ExponentialBackoff,
  isTransientError,
  sleep,
  withRetry,
  createRetryWrapper,
} from "./backoff";

// ============================================================================
// Sync Events
// ============================================================================

export type {
  SyncEventType,
  PullCompleteEvent,
  PullStaleEvent,
  PullErrorEvent,
  PushCompleteEvent,
  PushErrorEvent,
  ConflictDetectedEvent,
  SyncEventTypeMap,
} from "./sync-events";

export type {
  SyncEventHandler,
  Unsubscribe,
} from "./sync-events";

export type { ISyncEventEmitter } from "./sync-events";

export {
  SyncEventEmitter,
  NoOpSyncEventEmitter,
  noOpSyncEventEmitter,
  createSyncEventEmitter,
} from "./sync-events";

// ============================================================================
// Backwards Compatibility (deprecated)
// ============================================================================

/**
 * @deprecated Import from @avileo/shared instead
 */
export const SYNC_STATUS_TRACKED: string[] = [];

/**
 * @deprecated Import from @avileo/shared instead
 */
export const SELF_HEAL_INSERTABLE: string[] = [];

/**
 * @deprecated Import from @avileo/shared instead  
 */
export const SYNC_STATUS_ENTITY_TABLES: Record<string, string> = {};

/**
 * @deprecated Import from @avileo/shared instead
 */
export const SELF_HEAL_INSERTABLE_ENTITIES: string[] = [];
```

## Acceptance Criteria

- [ ] `core/types.ts` usa genéricos `TEntity extends string` en lugar de `SyncEntity`
- [ ] `core/interfaces.ts` tiene todas las interfaces genéricas
- [ ] `core/priority.ts` acepta `EntityConfig[]` en lugar de depender de `@avileo/shared`
- [ ] No hay imports de `@avileo/shared` en `core/` (excepto posibles referencias deprecated)
- [ ] Tests actualizados para usar tipos genéricos
- [ ] Exports de backwards compatibility marcados como deprecated

## Testing

```typescript
// packages/drizzle-sync/src/core/__tests__/generic-types.test.ts
import { describe, it, expect } from 'vitest';
import { 
  getEntityPriority, 
  sortEntitiesByPriority,
  entitySupportsSelfHeal,
  type SyncOperationRecord 
} from '../';
import { defineEntity } from '../../config';

describe('generic core types', () => {
  const mockEntities = {
    customers: defineEntity('customers', {
      tableName: 'customers',
      fields: ['id', 'name'],
      priority: 1,
      selfHeal: true,
    }),
    sales: defineEntity('sales', {
      tableName: 'sales',
      fields: ['id', 'total'],
      priority: 2,
      childEntities: ['sale_items'],
    }),
    sale_items: defineEntity('sale_items', {
      tableName: 'sale_items',
      fields: ['id', 'sale_id'],
      priority: 3,
      parentFields: ['sale_id'],
    }),
  };

  describe('priority functions', () => {
    it('getEntityPriority returns correct priority', () => {
      expect(getEntityPriority('customers', mockEntities)).toBe(1);
      expect(getEntityPriority('sales', mockEntities)).toBe(2);
      expect(getEntityPriority('sale_items', mockEntities)).toBe(3);
    });

    it('sortEntitiesByPriority sorts correctly', () => {
      const sorted = sortEntitiesByPriority(
        ['sale_items', 'customers', 'sales'],
        mockEntities
      );
      expect(sorted).toEqual(['customers', 'sales', 'sale_items']);
    });
  });

  describe('self-heal detection', () => {
    it('detects self-heal support from config', () => {
      expect(entitySupportsSelfHeal('customers', mockEntities)).toBe(true);
      expect(entitySupportsSelfHeal('sales', mockEntities)).toBe(false);
    });
  });

  describe('type inference', () => {
    it('SyncOperationRecord preserves entity type', () => {
      type TestEntity = 'customers' | 'sales';
      const op: SyncOperationRecord<TestEntity> = {
        id: '1',
        entityType: 'customers', // Type-safe
        entityId: 'cust-1',
        operation: 'create',
        payload: {},
        status: 'pending',
        attempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // This should compile
      expect(op.entityType).toBe('customers');
    });
  });
});
```

## Time Estimate

3 horas (incluyendo actualización de tests existentes)
