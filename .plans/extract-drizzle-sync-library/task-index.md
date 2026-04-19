# Task Index: Extract Drizzle-Based Custom Sync Library

## Overview

This plan extracts Avileo's offline-first sync engine into a reusable library package (`@avileo/drizzle-sync`) with 6 sequential tasks. Each task builds on the previous, establishing contracts first, then extracting adapters, and finally migrating the application.

## Task Summary

| ID | Title | Dependencies | Validation Focus | Estimated Effort |
|----|-------|--------------|-------------------|------------------|
| T-001 | Establish Library Boundaries and Contracts | None | Types compile, interfaces match existing code | Medium |
| T-002 | Extract Frontend PGlite Adapters | T-001 | Frontend builds, queue tests pass | High |
| T-003 | Extract Backend Server Engine Adapters | T-001 | Backend builds, engine tests pass | High |
| T-004 | Unify Observability and Sync Lifecycle | T-002, T-003 | Logs flow correctly, events emit | Medium |
| T-005 | Compose Avileo Apps on Top of the Library | T-002, T-003 | Avileo builds, sync works end-to-end | High |
| T-006 | Validate, Migrate, and Rollout | T-005 | E2E tests pass, performance benchmarks | Medium |

## Execution Order

```
T-001 ──┬── T-002 ──┬── T-004 ──┬── T-005 ── T-006
        │           │           │
        └── T-003 ─┴───────────┘
```

**Parallelization:**
- T-002 and T-003 can run in parallel after T-001 completes
- T-004 requires both T-002 and T-003
- T-005 requires T-004
- T-006 requires T-005

## Task Details

### T-001: Establish Library Boundaries and Contracts

**Objective:** Create the library package structure and define core types/interfaces that both frontend and backend will depend on.

**Key Deliverables:**
- `packages/drizzle-sync/` workspace package initialized
- `src/core/types.ts` with `SyncOperation`, `SyncStatus`, `SyncResult`, `DeadLetterOperation`
- `src/core/interfaces.ts` with `ISyncQueue`, `ISyncHandler`, `ISyncLogger`
- `src/core/priority.ts` with entity priority configuration
- `src/core/coalesce.ts` with operation coalescing logic (extracted from `queue/coalesce.ts`)
- `src/core/backoff.ts` with exponential backoff (extracted from `backoff.ts`)
- `package.json` with subpath exports
- `tsup.config.ts` for multi-entrypoint build

**Validation:**
- `bun run build` succeeds for library
- Types importable from `@avileo/drizzle-sync/core`
- No runtime dependencies in `core` entrypoint
- TypeScript strict mode passes

**Risks:**
- Interface mismatches with existing implementations (mitigate: copy types exactly first)

---

### T-002: Extract Frontend PGlite Adapters

**Objective:** Extract PGlite-specific sync components into library entrypoint, preserving raw SQL patterns for change application.

**Key Deliverables:**
- `src/pglite/change-applier.ts` — raw SQL UPSERT (from `packages/app/app/lib/sync/change-applier.ts`)
- `src/pglite/schema-mapper.ts` — table/column validation (from `packages/app/app/lib/sync/schema-mapper.ts`)
- `src/pglite/sync-queue.ts` — `PgSyncQueue` implementation (from `packages/app/app/lib/sync/queue/pg-sync-queue.ts`)
- `src/pglite/sync-logger.ts` — `RingBufferLogger` (from `packages/app/app/lib/sync/sync-logger.ts`)
- `src/pglite/pull-service.ts` — cursor-based pull (from `packages/app/app/lib/sync/pull-service.ts`)
- `src/pglite/index.ts` — entrypoint exports

**Migration Path:**
1. Copy files to library with minimal modifications
2. Update imports to use `@avileo/drizzle-sync/core` for types
3. Add deprecation re-exports in original locations
4. Run frontend tests against library imports

**Validation:**
- Frontend builds with library imports
- `PgSyncQueue` tests pass (from `__tests__/sync-service.test.ts`)
- `change-applier` tests pass (from `__tests__/change-applier.test.ts`)
- `pull-service` tests pass (from `__tests__/pull-service.test.ts`)

**Risks:**
- Raw SQL patterns may need adjustment for library context (mitigate: keep SQL strings identical initially)
- PGlite version compatibility (mitigate: pin `@electric-sql/pglite` version)

---

### T-003: Extract Backend Server Engine Adapters

**Objective:** Extract PostgreSQL backend sync components into library entrypoint, preserving Drizzle-based patterns.

**Key Deliverables:**
- `src/server/sync-engine.ts` — batch processing with savepoints (from `packages/backend/src/services/sync/framework/SyncEngine.ts`)
- `src/server/conflict-resolver.ts` — version-based detection (from `packages/backend/src/services/sync/framework/ConflictResolver.ts`)
- `src/server/base-handler.ts` — `BaseSyncHandler` (from `packages/backend/src/services/sync/handlers/BaseSyncHandler.ts`)
- `src/server/handler-registry.ts` — handler registration (from `packages/backend/src/services/sync/framework/HandlerRegistry.ts`)
- `src/server/operation-sorter.ts` — priority sorting (from `packages/backend/src/services/sync/framework/OperationSorter.ts`)
- `src/server/entity-registry.ts` — track created entities (from `packages/backend/src/services/sync/framework/EntityRegistry.ts`)
- `src/server/operation-repository.ts` — Drizzle-based persistence (from `packages/backend/src/services/sync/framework/SyncOperationRepository.ts`)
- `src/server/conflict-repository.ts` — conflict persistence (from `packages/backend/src/services/sync/framework/SyncConflictRepository.ts`)
- `src/server/dead-letter-repository.ts` — DLQ persistence (from `packages/backend/src/services/sync/framework/SyncDeadLetterRepository.ts`)
- `src/server/sync-logger.ts` — `PinoSyncLogger` (from `packages/backend/src/services/sync/sync-logger.ts`)
- `src/server/index.ts` — entrypoint exports

**Migration Path:**
1. Copy files to library with minimal modifications
2. Update imports to use `@avileo/drizzle-sync/core` for types
3. Accept Drizzle db instance via constructor
4. Add deprecation re-exports in original locations
5. Run backend tests against library imports

**Validation:**
- Backend builds with library imports
- `SyncEngine` tests pass (from `framework/__tests__/`)
- `ConflictResolver` tests pass
- `BaseSyncHandler` pattern works for concrete handlers

**Risks:**
- Drizzle transaction type compatibility (mitigate: use `DbTransaction` type from existing code)
- RequestContext coupling (mitigate: define minimal context interface in library)

---

### T-004: Unify Observability and Sync Lifecycle

**Objective:** Establish unified logging interface and event emission patterns across library components.

**Key Deliverables:**
- `src/core/interfaces.ts` — `ISyncLogger` interface with `info`, `warn`, `error` methods
- `src/pglite/sync-logger.ts` — `RingBufferLogger` implementing `ISyncLogger`
- `src/server/sync-logger.ts` — `PinoSyncLogger` implementing `ISyncLogger`
- `src/core/sync-events.ts` — event types (`pull:stale`, `push:failed`, `sync:complete`)
- Update all library components to accept logger via options/constructor
- Add event emitter pattern for lifecycle events

**Migration Path:**
1. Define `ISyncLogger` interface in core
2. Refactor existing loggers to implement interface
3. Add logger parameter to `PgSyncQueue`, `SyncEngine`, `PullService` constructors
4. Default to appropriate logger if not provided

**Validation:**
- Logs flow through unified interface
- Events emit on stale pull, failed push, etc.
- Frontend ring-buffer accessible via `logger.getEntries()`
- Backend logs structured with pino

**Risks:**
- Performance overhead from abstraction (mitigate: benchmark critical paths)
- Event timing consistency (mitigate: emit events after state changes)

---

### T-005: Compose Avileo Apps on Top of the Library

**Objective:** Migrate Avileo frontend and backend to import from library, removing duplicate code.

**Key Deliverables:**
- `packages/app/app/lib/sync/` — re-export from `@avileo/drizzle-sync/pglite` with deprecation warnings
- `packages/backend/src/services/sync/framework/` — re-export from `@avileo/drizzle-sync/server` with deprecation warnings
- Application-specific handlers import `BaseSyncHandler` from library
- `SyncCoordinator` uses library `PullService` and `PgSyncQueue`
- Backend `SyncService` uses library `SyncEngine`

**Migration Path:**
1. Update imports in application code to use library
2. Add deprecation warnings to original files
3. Run full test suite
4. Remove duplicate code after validation

**Validation:**
- Avileo builds successfully
- All existing tests pass
- E2E sync flow works (offline → online)
- Performance metrics match baseline

**Risks:**
- Circular dependencies during migration (mitigate: use re-exports temporarily)
- Subtle behavior differences (mitigate: run full test suite after each change)

---

### T-006: Validate, Migrate, and Rollout

**Objective:** Final validation, documentation, and rollout of library for production use.

**Key Deliverables:**
- `packages/drizzle-sync/README.md` — usage documentation
- `packages/drizzle-sync/CHANGELOG.md` — version history
- Performance benchmarks (enqueue latency, batch throughput, pull latency)
- E2E tests for sync flow (offline → online → conflict)
- Remove deprecation re-exports from application
- Update `AGENTS.md` with library references

**Validation:**
- All E2E tests pass
- Performance benchmarks within 5% of baseline
- Documentation complete
- No deprecation warnings in production build

**Risks:**
- Production issues after removal (mitigate: feature flag for library usage)
- Documentation drift (mitigate: generate API docs from TypeScript)

---

## Cross-Cutting Concerns

### Testing Strategy
- Unit tests follow files during extraction
- Integration tests remain in application
- Add library-specific unit tests for core utilities
- E2E tests validate full sync flow

### Performance Monitoring
- Add performance timing logs in critical paths
- Benchmark enqueue latency before/after extraction
- Monitor batch processing throughput
- Track pull service latency

### Documentation
- README with quick start and API reference
- Inline JSDoc for all public APIs
- Migration guide for Avileo developers
- Architecture decision records for key choices
