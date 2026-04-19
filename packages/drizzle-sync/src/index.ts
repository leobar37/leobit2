/**
 * @avileo/drizzle-sync
 *
 * Drizzle-based offline-first sync library for PostgreSQL and PGlite.
 *
 * ## Subpath Exports
 *
 * - `@avileo/drizzle-sync` - Main entrypoint (re-exports core + shared + new API)
 * - `@avileo/drizzle-sync/core` - Runtime-agnostic core types and interfaces
 * - `@avileo/drizzle-sync/shared` - Shared constants and utilities
 * - `@avileo/drizzle-sync/pglite` - PGlite adapters (frontend)
 * - `@avileo/drizzle-sync/server` - PostgreSQL adapters (backend)
 * - `@avileo/drizzle-sync/config` - Configuration types and helpers
 * - `@avileo/drizzle-sync/presets` - Pre-configured presets (e.g., Avileo)
 * - `@avileo/drizzle-sync/react` - React integration
 */

// ============================================================================
// Main API (NEW - RECOMMENDED)
// ============================================================================

export { createSyncEngine } from './create-sync-engine';
export { SyncEngineInstance } from './sync-engine-instance';
export type { SyncEngineInstance as SyncEngine } from './sync-engine-instance';

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
  type HandlerFactory as ConfigHandlerFactory,
} from './config';

// ============================================================================
// Re-export core module
// ============================================================================

export * from "./core/index";

// ============================================================================
// Re-export shared module
// ============================================================================

export * from "./shared/index";
