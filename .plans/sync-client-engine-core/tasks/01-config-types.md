# T-001 Define Engine Config Types

## Objective

Create the TypeScript configuration interfaces that define the engine's constructor contract: `SyncClientEngineConfig`, `EntityServiceDefinition`, `SyncClientEngineCallbacks`, and related types.

## Requirements Covered

- `FR-001`
- `NFR-003`

## Dependencies

- none

## Files or Areas Involved

- `packages/drizzle-sync/src/client/types.ts` — **Create** — All config interfaces and types
- `packages/drizzle-sync/src/core/types.ts` — **Review** — Existing core types to reference
- `packages/drizzle-sync/src/pglite/types.ts` — **Review** — PGlite-specific types (PullChange, PullResponse)
- `packages/drizzle-sync/src/core/sync-events.ts` — **Review** — SyncEventType and ISyncEventEmitter for event bridge types

## Actions

1. Create `packages/drizzle-sync/src/client/types.ts` with the following interfaces:
   - `SyncClientEngineConfig` — Main config: `pg`, `db`, `businessId`, `businessUserId`, `authToken`, `entities`, `sync?`, `stages?`, `callbacks?`
   - `EntityServiceDefinition` — Per-entity registration: `name`, `entityType`, `factory` (function receiving engine context), `options?`
   - `SyncClientEngineCallbacks` — Optional lifecycle hooks: `onPullComplete?`, `onPushComplete?`, `onError?`, `onStatusChange?`
   - `SyncClientEngineSyncConfig` — Sync timing: `pushIntervalMs?`, `pullIntervalMs?`, `enableAutoSync?`, `backoffBaseMs?`, `backoffMaxMs?`
   - `SyncClientEngineStagedConfig` — Staged pull: `stages` array, `onProgress?` callback
   - `SyncClientEngineContext` — The context object passed to entity service factories: `{ pg, db, syncService, businessId, businessUserId }`
2. Import and reuse existing types from `@avileo/drizzle-sync/core` (SyncEventType, ISyncEventEmitter) rather than duplicating.
3. Ensure no React or TanStack types are imported. Callbacks use plain function types.

## Completion Criteria

- `types.ts` compiles without errors when built via tsup
- No imports from `react`, `@tanstack/react-query`, or any React-related package
- All config fields have JSDoc comments
- The `SyncClientEngineConfig` type is complete enough for a consumer to configure the engine without reading implementation code

## Validation

- `cd packages/drizzle-sync && bun run build` succeeds
- `cd packages/drizzle-sync && bunx tsc --noEmit` passes
- Manual review: verify no React/TanStack types leak into the public interface

## Risks or Notes

- The `EntityServiceDefinition.factory` type must be flexible enough for both generated services (F-002) and manual BaseService subclasses. Use a generic function signature: `(ctx: SyncClientEngineContext) => T`.
- The `db` type must be compatible with Drizzle's `PgDatabase` return type from `drizzle-orm/pglite`. Verify the exact type at implementation time.
