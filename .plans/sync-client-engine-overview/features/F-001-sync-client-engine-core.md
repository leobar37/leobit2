# F-001 SyncClientEngine Core Class

## Objective

Create the `SyncClientEngine` class inside `@avileo/drizzle-sync` that encapsulates the entire client-side sync runtime. The engine exposes a single, unified API for all local-first data operations and manages the lifecycle of PGlite, sync queue, push/pull coordination, and staged loading. It must be framework-agnostic (no React dependency) and accept a `QueryClient` instance for cache integration.

## Scope Boundaries

- In scope:
  - `SyncClientEngine` class with constructor accepting `SyncClientEngineConfig`
  - Integration of existing `SyncCoordinator`, `SyncService`, `PullService`, `PgSyncQueue`, `StagedPullCoordinator`
  - Lifecycle methods: `initialize()`, `start()`, `stop()`
  - Service registry for domain services (`getService(name)`)
  - Event emitter bridge for external listeners
  - Factory function `createSyncEngine(config)` (following TanStack Query pattern)
- Out of scope:
  - React-specific code (hooks, providers, context)
  - Code generation of entity APIs
  - Cache invalidation rules engine (F-005)
  - Frontend provider migration (F-004)

## Verified Context

- `@avileo/drizzle-sync/pglite` exports: `SyncCoordinator`, `SyncService`, `PullService`, `PgSyncQueue`, `StagedPullCoordinator`, `SyncMutex`, `SyncAutoRunner`
- The library already has `createSyncEngine()` in main entry, but it's **backend-only** (`SyncEngineInstance` for server handlers)
- Frontend services extend `BaseService` which receives `pg`, `db`, `syncQueue` in constructor
- `BaseService` has `queueSync(operation, id, data)` method that enqueues sync operations
- The library uses peer dependencies: `@electric-sql/pglite`, `drizzle-orm`, `react` (optional)

## Assumptions

- The existing PGlite runtime classes can be composed inside `SyncClientEngine` without modification
- Domain services (`CustomerService`, `SaleService`, etc.) can be instantiated by the engine given entity config
- The engine does not need to know about TanStack Query internals — it only needs to call `queryClient.invalidateQueries()` via callbacks

## Unknowns

- Whether `SyncCoordinator` in the library has the same feature parity as the frontend's custom `coordinator.ts` (stuck detection, online/offline handling)
- Exact memory/performance overhead of holding all service instances in a single engine

## Likely Files or Areas Involved

- `packages/drizzle-sync/src/client/` — **Create** — New module for client-side engine
- `packages/drizzle-sync/src/client/sync-client-engine.ts` — **Create** — Main engine class
- `packages/drizzle-sync/src/client/types.ts` — **Create** — Config interfaces
- `packages/drizzle-sync/src/pglite/index.ts` — **Review** — Ensure all needed classes are exported
- `packages/drizzle-sync/src/pglite/coordinator.ts` — **Review** — Compare with frontend coordinator
- `packages/drizzle-sync/src/index.ts` — **Modify** — Export `createSyncEngine` for client
- `packages/drizzle-sync/package.json` — **Modify** — Add `/client` entry point

## Feature Dependencies

- Depends on: none (foundation)
- Blocks: F-002, F-003, F-005

## Human-Owned Tracking Fields

- Status: planned
- Owner: backend team
- Decision Notes: Engine must remain framework-agnostic; React integration is F-003
- Manual Overrides: none

## Parallelization Notes

- Parallelizable: no
- Reason: Defines the core interface that all other features depend on

## Worktree Recommendation

- Recommended: no
- Suggested branch: `feature/sync-engine-core`
- Suggested worktree path: n/a
- Rationale: Foundation feature; requires running build and tests across library boundary frequently

## Suggested `/plan` Mode

- Mode: `structured`
- Rationale: Multiple implementation units (class, types, lifecycle, service registry, exports)

## Suggested Next Command

- `/plan .plans/sync-client-engine-overview/features/F-001-sync-client-engine-core.md`
