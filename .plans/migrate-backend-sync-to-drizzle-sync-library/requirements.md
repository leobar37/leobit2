# Migrate Backend Sync to drizzle-sync Library — Requirements

## Objective

Migrate `packages/backend/src/services/sync/` to import all core sync components from `@avileo/drizzle-sync/server`, eliminating the parallel framework duplication. The backend sync service becomes a configuration/composition layer on top of the library. Backend-specific concerns (Drizzle schema bindings, RequestContext concrete types, handler implementations) remain in the app; everything that belongs in the library lives in the library.

## Scope

**In scope:**
- Behavioral audit of library's `server/` submodule vs. backend's current sync framework
- Reconciliation of `BaseSyncHandler` feature gap (PostgreSQL error extraction, logger integration)
- Reconciliation of `SyncEngine` architecture (SyncPipeline middleware difference)
- Migration of backend's `SyncService` to use library's `SyncEngine`
- Migration of concrete sync handlers to extend library's `BaseSyncHandler`
- Migration of repositories to use library interfaces/types
- Adding unit tests to the library package itself
- Validation: full test suite passes, E2E sync flow works
- Documentation: README for library, AGENTS.md update
- Removal of deprecated duplicate files from `packages/backend/src/services/sync/framework/`

**Out of scope:**
- Frontend migration to library (separate track)
- Changes to library's `core/` or `pglite/` submodules (stable)
- New sync features or behavior changes
- Database schema modifications

## Functional Requirements

- `FR-001` — Backend's `SyncService.processBatch()` calls `@avileo/drizzle-sync/server`'s `SyncEngine.processBatch()` with app-specific config
- `FR-002` — All concrete sync handlers (Sale, Customer, Product, etc.) extend `@avileo/drizzle-sync/server`'s `BaseSyncHandler`
- `FR-003` — `BaseSyncHandler` from library supports PostgreSQL error extraction (`pgErrorCode`, `pgErrorDetail`, `pgErrorRoutine`) with configurable error classifier
- `FR-004` — `SyncPipeline` middleware layer is preserved as a wrapper around library handler execution (logging, correlation ID injection)
- `FR-005` — Backend's repositories implement the library's repository interfaces (`ISyncOperationRepository`, `ISyncConflictRepository`, `ISyncDeadLetterRepository`) using Drizzle
- `FR-006` — Library's `ConflictResolverRegistry` is used for conflict detection with all existing entity resolvers registered
- `FR-007` — Library logger adapter bridges backend's `SyncLogger` to library's `ISyncLogger` interface
- `FR-008` — Old sync framework files in `packages/backend/src/services/sync/framework/` are removed after migration validation

## Non-Functional Requirements

- `NFR-001` — Zero regression: all existing sync tests must pass after migration
- `NFR-002` — Backend binary/size: library addition must not significantly increase bundle size (tree-shaking must work)
- `NFR-003` — Library has its own unit test suite covering core logic, coalescing, backoff, priority, and repository interfaces
- `NFR-004` — Backend sync batch processing latency within 5% of pre-migration baseline
- `NFR-005` — Migration is done in parallel-run style: old implementation remains functional until new is validated

## Acceptance Criteria

- `packages/backend/src/services/sync/sync.service.ts` imports `SyncEngine` from `@avileo/drizzle-sync/server`
- All 14 entity sync handlers extend `BaseSyncHandler` from `@avileo/drizzle-sync/server`
- Backend `SyncService` compiles and runs with library's `SyncEngine`; batch sync end-to-end works
- Library's `checklist.json` shows T-003 (backend migration) marked `in_progress` → `completed`
- Full backend test suite passes (`bun test` in `packages/backend`)
- E2E sync tests pass (offline → online flow)
- `packages/drizzle-sync/README.md` exists with usage documentation
- `packages/backend/src/services/sync/framework/` duplicate files are removed

## Constraints

- **Library features added must benefit the library**: If the backend needs PostgreSQL error extraction in `BaseSyncHandler`, that is a library feature, not a backend workaround.
- **No behavior changes during migration**: The sync behavior (conflict detection, parent ordering, savepoint handling) must remain identical to pre-migration. Only the import path changes.
- **SyncPipeline preserved**: The middleware pattern (correlation IDs, logging per operation) is not removed — it is bridged to the library's logging interface.
- **Better Auth and RequestContext remain app-specific**: The library defines `SyncRequestContext`; the backend maps `RequestContext` → `SyncRequestContext` in its composition layer.

## Open Questions

- `OQ-001`: Should the library's `SyncEngine` natively support a middleware/pipeline extension point, or should the backend's `SyncPipeline` be a backend-only wrapper? **Decision needed before T-003.**
- `OQ-002`: The library's `server/` module has `DbClient<TTransaction>` and `DbTransaction` as generic types. The backend uses Drizzle's `DbTransaction` from `txid.ts`. Should the library define its own `DbTransaction` interface and the backend provide a Drizzle-specific adapter, or should the backend accept the library's generic? **Decision needed before T-002.**
