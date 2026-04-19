# T-006 — Add Unit Tests to drizzle-sync Library

## Objective

Add a test suite to `packages/drizzle-sync/` covering core utilities, coalescing, backoff, priority sorting, and repository interfaces. The library currently has zero tests. This is a prerequisite for confident evolution of the library and for validating the migration work done in T-002 through T-005.

## Requirements Covered

- `NFR-003` — Library has its own unit test suite covering core logic, coalescing, backoff, priority, and repository interfaces

## Dependencies

- T-002 (coalescing/backoff/priority are in `core/` which is stable — can start before T-003/T-004)
- T-003 (repository interface tests need final interfaces)
- T-005 (not required for writing tests, but tests validate the migrated code)

## Files or Areas Involved

- `packages/drizzle-sync/src/core/coalesce.ts` — Add tests
- `packages/drizzle-sync/src/core/backoff.ts` — Add tests
- `packages/drizzle-sync/src/core/priority.ts` — Add tests
- `packages/drizzle-sync/src/core/sync-events.ts` — Add tests
- `packages/drizzle-sync/src/server/operation-repository.ts` — Add interface tests
- `packages/drizzle-sync/src/server/conflict-repository.ts` — Add interface tests
- `packages/drizzle-sync/src/server/dead-letter-repository.ts` — Add interface tests
- `packages/drizzle-sync/src/server/operation-sorter.ts` — Add tests
- `packages/drizzle-sync/src/server/entity-registry.ts` — Add tests
- `packages/drizzle-sync/src/server/conflict-resolver.ts` — Add tests
- `packages/drizzle-sync/src/server/base-handler.ts` — Add tests (after T-002)
- `packages/drizzle-sync/src/server/sync-engine.ts` — Add tests (after T-003)
- `packages/drizzle-sync/vitest.config.ts` — Create (if not exists)

## Actions

### 6a. Set Up Test Infrastructure

1. Create `packages/drizzle-sync/vitest.config.ts`:
   ```typescript
   import { defineConfig } from "vitest/config";
   export default defineConfig({
     test: {
       environment: "node",
       include: ["src/**/*.test.ts"],
     },
   });
   ```
2. Add to `packages/drizzle-sync/package.json`:
   ```json
   {
     "scripts": {
       "test": "vitest",
       "test:run": "vitest run"
     },
     "devDependencies": {
       "vitest": "^2.0.0"
     }
   }
   ```

### 6b. Test Coalescing (`core/coalesce.ts`)

Test `getCoalescePlan()` and `canCoalesce()`:
- `create + delete` → returns plan type `cancel`
- `update + update` → returns plan type `merge` with merged payload
- `create + update` → returns plan type `update` with merged payload
- `delete + delete` → returns plan type `merge` (or `cancel` if idempotent)
- `insert + insert` for same entity → returns plan type `merge`
- `canCoalesce` returns `false` for incompatible operation pairs

### 6c. Test Backoff (`core/backoff.ts`)

Test `calculateBackoffDelay()` and `ExponentialBackoff`:
- Correct delay for retry count 0, 1, 2, 3 with default config
- Respects `maxDelay` cap
- `isTransientError` correctly classifies network errors vs. validation errors
- `withRetry` calls function, retries on transient error, returns result on success
- `withRetry` throws after max retries on persistent error

### 6d. Test Priority (`core/priority.ts`)

Test `sortEntitiesByPriority()`, `groupEntitiesByPriority()`, `getEntityPriority()`:
- Parent entities (sales, customers) sort before children (sale_items, customer_tags)
- `getEntityPriority` returns correct numeric priority for each entity type
- `groupEntitiesByPriority` correctly groups into `CRITICAL`, `RECENT_SALES`, `HISTORICAL` tiers
- Unknown entity type defaults to `HISTORICAL` priority

### 6e. Test Operation Sorter (`server/operation-sorter.ts`)

Test `OperationSorter.sort()`:
- Operations within same sync group maintain relative order
- Parent entities appear before children in output
- Unknown entities sorted to end
- Returns correct `groupCount`

### 6f. Test Entity Registry (`server/entity-registry.ts`)

Test `EntityRegistry`:
- `wasCreated()` returns `false` for unknown ID
- `wasCreated()` returns `true` after `register("create", id)`
- `register` with `"update"` or `"delete"` does NOT mark as created
- Multiple registrations don't throw

### 6g. Test Sync Events (`core/sync-events.ts`)

Test `SyncEventEmitter`:
- Emitting an event calls registered handler
- Multiple handlers all called
- `unsubscribe` removes handler
- `NoOpSyncEventEmitter` does nothing (no-op)
- Event type map is correct: `push:complete`, `conflict:detected`, etc.

### 6h. Test Conflict Resolver (`server/conflict-resolver.ts`)

Test `BaseVersionConflictResolver` abstract behavior:
- Concrete subclass correctly detects version conflict (server version > client version)
- `checkConflict` returns `hasConflict: false` when server version <= client version
- Conflict entity is persisted via `ISyncConflictRepository`

### 6i. Test BaseSyncHandler (`server/base-handler.ts`) — after T-002

Test the updated `BaseSyncHandler`:
- `logStart`, `logSuccess`, `logError` delegate to injected logger
- `executeOperation` calls correct handler branch (create/update/delete)
- `extractPostgresError` correctly walks error cause chain
- `ensureParentExists` skips DB query when registry says parent was created in batch
- `validatePayload` calls Zod schema parse

### 6j. Test SyncEngine (`server/sync-engine.ts`) — after T-003

Test `SyncEngine` with mocks:
- `processBatch` sorts operations by priority before processing
- Per-operation savepoints are created and released on success
- Per-operation savepoints are rolled back on error
- Idempotent operations (same `idempotencyKey` twice) return success without reprocessing
- Conflict detection is called and conflicts are persisted
- Event emitter is called with `push:complete` and `conflict:detected`
- `processBatch` returns correct `SyncBatchResult` summary

### 6k. Run tests

1. `cd packages/drizzle-sync && bun test`
2. All tests pass with zero failures

## Completion Criteria

- `packages/drizzle-sync` has a working test suite
- All tests in `src/**/*.test.ts` pass
- Core utilities (coalescing, backoff, priority) have >80% coverage
- Library CI (if any) passes

## Validation

- `cd packages/drizzle-sync && bun test` — all pass
- `cd packages/drizzle-sync && bun test --coverage` — coverage report generated

## Risks or Notes

- Repository interface tests (6f, 6g) need mock implementations of `ISyncOperationRepository`, etc. Create test doubles that implement the interfaces.
- SyncEngine tests (6j) are the most complex. Use a mock `ISyncOperationRepository` that stores operations in memory, and a mock logger.
- Do not test concrete Drizzle implementations in the library — those tests live in the backend package.
