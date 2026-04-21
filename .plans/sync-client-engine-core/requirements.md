# SyncClientEngine Core Requirements

## Objective

Provide a single, framework-agnostic class that encapsulates the entire client-side sync runtime for local-first applications using PGlite, allowing consumers to configure and control all sync behavior through one entry point.

## Scope

- In scope:
  - Engine class with lifecycle management
  - Configuration schema for all sync parameters
  - Composition of existing library runtime classes
  - Service registry for domain services
  - Event bridge for external observability
  - Package export configuration
- Out of scope:
  - React integration (F-003)
  - Code generation (F-002)
  - Cache invalidation rules (F-005)
  - Provider migration (F-004)

## Functional Requirements

- `FR-001` — Engine accepts a `SyncClientEngineConfig` object containing PGlite instance, Drizzle db instance, business context (businessId, businessUserId, authToken), entity definitions, optional sync intervals, and optional lifecycle callbacks.
- `FR-002` — Engine internally creates and owns `PgSyncQueue`, `SyncService`, `PullService`, `SyncCoordinator`, and optionally `StagedPullCoordinator`, wiring them together based on config.
- `FR-003` — Engine exposes `initialize()` that sets up the sync infrastructure (queue tables, cursors) and prepares all services for operation.
- `FR-004` — Engine exposes `start()` that starts auto-sync (push interval + pull interval) and optionally begins staged pull if configured.
- `FR-005` — Engine exposes `stop()` that halts all auto-sync, cancels pending operations gracefully, and cleans up resources.
- `FR-006` — Engine exposes a service registry via `getService<T>(name: string): T` that returns instantiated domain services. Services are registered via config's `entities` map.
- `FR-007` — Engine exposes `getEventEmitter(): ISyncEventEmitter` that returns the shared event emitter used by all internal components, allowing external listeners to subscribe to sync events.
- `FR-008` — Engine exposes a factory function `createSyncClientEngine(config)` that constructs and returns a ready-to-initialize engine instance (following TanStack Query's `createSyncEngine` naming convention).
- `FR-009` — Engine exposes `getStatus()` returning combined sync status (pending count, failed count, last sync timestamp, online state).
- `FR-010` — Engine exposes `triggerSync()` for manual push+pull cycle and `triggerPull()` for manual pull-only cycle.
- `FR-011` — Package exports a new `@avileo/drizzle-sync/client` entry point that exposes the engine class, factory function, and config types without pulling in server-side or React code.
- `FR-012` — Domain services receive their dependencies (pg, db, syncService, businessId, businessUserId) from the engine during registration, matching the existing `BaseService` constructor contract.

## Non-Functional Requirements

- `NFR-001` — Zero React imports in the engine module. The `client` entry point must be importable in non-React environments (e.g., service workers, test runners).
- `NFR-002` — Existing library classes (`SyncService`, `PullService`, `SyncCoordinator`, `PgSyncQueue`, `StagedPullCoordinator`) must not be modified. The engine composes them as-is.
- `NFR-003` — The engine must not hold references to `QueryClient` or any TanStack types. Cache integration happens exclusively via callback functions passed in config.
- `NFR-004` — All public methods must be safe to call from a single JavaScript thread (no concurrent access concerns).
- `NFR-005` — Memory overhead of the engine (holding service instances + internal state) should be bounded and not grow unboundedly with entity count.

## Acceptance Criteria

- `createSyncClientEngine(config)` returns a `SyncClientEngine` instance without errors
- Calling `await engine.initialize()` then `await engine.start()` results in a running sync loop
- `engine.getService('customers')` returns a valid domain service instance
- `engine.getEventEmitter().on('pull:complete', callback)` receives events when pull completes
- `await engine.stop()` cleanly shuts down all intervals and timers
- `import { createSyncClientEngine } from '@avileo/drizzle-sync/client'` works without importing React or server code
- All existing tests in `packages/drizzle-sync` continue to pass

## Constraints

- Must work with the existing `SyncService` and `PullService` constructor signatures from `@avileo/drizzle-sync/pglite`
- Must work with the existing `SyncCoordinator` constructor and `SyncCoordinatorOptions`
- Entity service definitions must be flexible enough to support both generated services (F-002) and manual `BaseService` subclasses
- The `client` entry point must be added to the existing tsup build configuration

## Open Questions

- Whether the frontend's `SyncCoordinator` (`packages/app/app/lib/sync/coordinator.ts`) has stuck-detection or online/offline features not present in the library's version that need to be ported first
- Whether domain services need a generic `BaseService` interface in the library (currently `BaseService` lives in `packages/app`) or if the engine should accept factory functions only
- Exact memory impact of holding all 12+ service instances in a single engine (should be measured after implementation)
