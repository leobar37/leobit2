# T-007: Actualizar exports en `index.ts`

## Requirement IDs
- FR-019, FR-020

## Objective
Actualizar los entry points del paquete para exponer la nueva API mientras mantenemos retrocompatibilidad.

## Files to Modify

1. `packages/drizzle-sync/src/index.ts`
2. `packages/drizzle-sync/src/server/index.ts`
3. `packages/drizzle-sync/src/pglite/index.ts`
4. `packages/drizzle-sync/src/react/index.ts`

## Implementation

### `packages/drizzle-sync/src/index.ts`

```typescript
/**
 * @avileo/drizzle-sync - Configurable Sync Engine
 * 
 * Generic offline-first sync engine with declarative entity configuration.
 * 
 * @example Basic Usage
 * ```typescript
 * import { createSyncEngine, defineEntity } from '@avileo/drizzle-sync';
 * 
 * const sync = createSyncEngine({
 *   entities: {
 *     customers: defineEntity('customers', {
 *       tableName: 'customers',
 *       fields: ['id', 'name', 'email'],
 *       priority: 1,
 *     }),
 *   },
 * });
 * ```
 * 
 * @example With Preset
 * ```typescript
 * import { createSyncEngine } from '@avileo/drizzle-sync';
 * import { avileoConfig } from '@avileo/drizzle-sync/presets';
 * 
 * const sync = createSyncEngine(avileoConfig);
 * ```
 */

// ============================================================================
// Main API (NEW - RECOMMENDED)
// ============================================================================

export { createSyncEngine } from './create-sync-engine';
export { SyncEngineInstance, type SyncEngineInstance as SyncEngine } from './sync-engine-instance';

// Configuration
export {
  defineEntity,
  entityBuilder,
  EntityBuilder,
  validateConfig,
  assertValidConfig,
  type EntityConfig,
  type SyncEngineConfig,
  type EntityHooks,
  type ConflictResolutionStrategy,
  type HandlerFactory,
} from './config';

// ============================================================================
// Sub-module Exports
// ============================================================================

// Core (runtime-agnostic)
export * from './core';

// Server (backend)
export * from './server';

// PGlite (frontend)
export * from './pglite';

// React (frontend hooks)
export * from './react';

// Presets
export * from './presets';

// ============================================================================
// Backwards Compatibility (DEPRECATED)
// ============================================================================

/**
 * @deprecated Import from '@avileo/drizzle-sync/presets' instead
 */
export { SYNCABLE_ENTITIES, SYNC_EVENTS, OPERATION_STATUS } from './shared/constants';

/**
 * @deprecated Import from '@avileo/drizzle-sync/presets' instead
 */
export { CONFLICT_STRATEGY, DEFAULT_SYNC_CONFIG } from './shared/constants';

/**
 * @deprecated Import from '@avileo/shared' instead
 */
export type { SyncEntity } from './server/types';

// ============================================================================
// Version
// ============================================================================

export const VERSION = '2.0.0';
```

## Acceptance Criteria

- [ ] `createSyncEngine` exportado desde root
- [ ] `defineEntity` exportado desde root
- [ ] Config types exportados
- [ ] Sub-módulos exportados
- [ ] Exports antiguos marcados como deprecated
- [ ] No breaking changes en imports existentes

## Time Estimate

2 horas
