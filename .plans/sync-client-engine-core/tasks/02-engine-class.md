# T-002 Implement SyncClientEngine Class

## Objective

Create the main `SyncClientEngine` class that composes existing library runtime classes (PgSyncQueue, SyncService, PullService, SyncCoordinator, StagedPullCoordinator) and exposes lifecycle methods.

## Requirements Covered

- `FR-002`
- `FR-003`
- `FR-004`
- `FR-005`
- `FR-007`
- `FR-009`
- `FR-010`
- `NFR-002`
- `NFR-004`

## Dependencies

- `T-001` (config types must be defined)

## Files or Areas Involved

- `packages/drizzle-sync/src/client/sync-client-engine.ts` — **Create** — Main engine class
- `packages/drizzle-sync/src/client/types.ts` — **Read** — Config types from T-001
- `packages/drizzle-sync/src/pglite/sync-service.ts` — **Review** — SyncService constructor and options
- `packages/drizzle-sync/src/pglite/pull-service.ts` — **Review** — PullService constructor and options
- `packages/drizzle-sync/src/pglite/coordinator.ts` — **Review** — SyncCoordinator constructor and options
- `packages/drizzle-sync/src/pglite/pg-sync-queue.ts` — **Review** — PgSyncQueue constructor
- `packages/drizzle-sync/src/pglite/staged-pull-coordinator.ts` — **Review** — StagedPullCoordinator constructor
- `packages/drizzle-sync/src/core/sync-events.ts` — **Review** — SyncEventEmitter for event bridge

## Actions

1. Create `sync-client-engine.ts` with the `SyncClientEngine` class.
2. **Constructor**: Accept `SyncClientEngineConfig`. Store config. Create `SyncEventEmitter` instance. Do NOT start any operations.
3. **Private composition** (lazy or eager based on lifecycle):
   - Create `PgSyncQueue` from `config.pg`
   - Create `SyncService` with queue, pg, businessId, authToken, and a configured HTTP client
   - Create `PullService` with pg, db, businessId, authToken, cursor storage, mutex
   - Create `SyncCoordinator` wrapping syncService + pullService with config-derived intervals
   - Optionally create `StagedPullCoordinator` if `config.stages` is provided
4. **`initialize()`** method:
   - Call `syncQueue.initialize()` (create sync infrastructure tables)
   - Call `syncService.initialize()`
   - Call `pullService.initialize()`
   - Wire event emitter: pass the shared emitter to all internal components
   - Return Promise<void>
5. **`start()`** method:
   - Call `coordinator.start()` to begin auto-sync intervals
   - If staged pull configured, call `stagedPullCoordinator.start()`
   - Emit `coordinator:started` event
6. **`stop()`** method:
   - Call `coordinator.stop()`
   - Stop any staged pull in progress
   - Emit `coordinator:stopped` event
   - Return Promise<void>
7. **`getStatus()`** method: Delegate to coordinator or compose from syncService + pullService status.
8. **`triggerSync()`** method: Manually trigger push + pull cycle.
9. **`triggerPull()`** method: Manually trigger pull-only cycle.
10. **`getEventEmitter()`** method: Return the shared ISyncEventEmitter.
11. Wire engine callbacks from config (`onPullComplete`, `onPushComplete`, `onError`) to internal event subscriptions during `initialize()`.

## Completion Criteria

- `SyncClientEngine` class instantiates with valid config without errors
- `initialize()` sets up all internal services without starting sync
- `start()` begins auto-sync; `stop()` halts it cleanly
- `getStatus()` returns a meaningful status object
- `triggerSync()` and `triggerPull()` invoke the expected internal methods
- `getEventEmitter()` returns the same emitter instance used by all internals
- No modifications to any existing library class files

## Validation

- `cd packages/drizzle-sync && bun run build` succeeds
- `cd packages/drizzle-sync && bunx tsc --noEmit` passes
- All existing tests in `packages/drizzle-sync` continue to pass
- Manual: construct engine with mock PGlite and verify lifecycle methods work

## Risks or Notes

- The existing `SyncService` constructor takes `(pg, businessId, authToken)` — verify the exact signature at implementation time. It may also require an `ISyncHttpClient` implementation.
- `PullService` constructor takes `(pg, db, businessId, authToken)` with additional options — verify if cursor storage and mutex are injected via options or constructor params.
- `SyncCoordinator` expects `ISyncService` and `IPullService` interfaces — the library's `SyncService` and `PullService` implement these, so composition should work directly.
- The engine must handle the case where `initialize()` is called multiple times (idempotent) or not called before `start()` (throw error).
