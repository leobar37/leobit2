# T-001 Extract Generic Sync Infrastructure to Framework

## Objective

Move generic sync infrastructure services (SyncAutoRunner, SyncMutex, SyncEntityStatusUpdater) from `packages/app/app/lib/sync/` into `@avileo/drizzle-sync/pglite/` so the framework owns timer/backoff, concurrency control, and entity status management.

## Requirements Covered

- `FR-001` - SyncAutoRunner backoff behavior
- `FR-002` - SyncMutex concurrency control
- `FR-003` - SyncEntityStatusUpdater post-sync marking
- `FR-007` - Configurable tenantColumn
- `NFR-002` - Unit tests
- `NFR-003` - Type checking

## Dependencies

- none

## Files or Areas Involved

- `packages/app/app/lib/sync/sync-auto-runner.ts` - Read | Migrate logic
- `packages/app/app/lib/sync/sync-mutex.ts` - Read | Compare with framework version
- `packages/app/app/lib/sync/sync-entity-status-updater.ts` - Read | Migrate logic
- `packages/drizzle-sync/src/pglite/sync-mutex.ts` - Review | Enrich if needed
- `packages/drizzle-sync/src/pglite/` - Create new files:
  - `auto-runner.ts`
  - `entity-status-updater.ts`
- `packages/drizzle-sync/src/pglite/index.ts` - Modify | Export new services
- `packages/drizzle-sync/src/core/` - Potentially add shared types

## Actions

1. **Migrate SyncAutoRunner**
   - Copy `sync-auto-runner.ts` logic to `pglite/auto-runner.ts`
   - Keep same API: `start(task, intervalMs)`, `stop()`, `recordSuccess()`, `recordFailure()`, `resetBackoff()`, `waitForBackoff()`, `getBackoffAtMax()`
   - Use constants from `drizzle-sync/shared` (BACKOFF_BASE_MS, BACKOFF_MAX_MS)
   - Add unit tests in `packages/drizzle-sync/src/pglite/__tests__/auto-runner.test.ts`

2. **Compare and enrich SyncMutex**
   - Compare app's `sync-mutex.ts` (104 lines) with framework's `sync-mutex.ts` (157 lines)
   - If app version has features framework lacks (e.g., queue length tracking, reset capability), port them
   - Ensure framework version is the superset
   - Add/update unit tests in framework

3. **Migrate SyncEntityStatusUpdater**
   - Copy `sync-entity-status-updater.ts` to `pglite/entity-status-updater.ts`
   - Make `tenantColumn` configurable via constructor (default: `tenant_id`)
   - Make tracked tables configurable via constructor (default: all sync-tracked tables)
   - Add unit tests in framework

4. **Export from framework**
   - Add exports to `pglite/index.ts`: `SyncAutoRunner`, `SyncEntityStatusUpdater`
   - Ensure `SyncMutex` is already exported or add it

5. **Update app imports**
   - Change app files that import these services to use `@avileo/drizzle-sync/pglite`
   - Files to update:
     - `sync-service.ts`
     - `sync-batch-processor.ts`
     - `coordinator.ts`
     - Any test files

## Completion Criteria

- `pglite/auto-runner.ts` exists with full implementation and unit tests
- `pglite/entity-status-updater.ts` exists with configurable tenantColumn and unit tests
- `pglite/sync-mutex.ts` is the authoritative implementation (no missing features from app)
- App imports these from framework instead of local files
- `bun test` passes in `packages/drizzle-sync`
- `bun run typecheck` passes in both packages

## Validation

- Run `cd packages/drizzle-sync && bun test` - all new tests pass
- Run `cd packages/app && bun run typecheck` - no type errors
- Run `cd packages/app && bun test` - existing tests still pass

## Risks or Notes

- **Risk**: App's SyncMutex may have behaviors not in framework version (e.g., specific queue management). Must compare carefully.
- **Risk**: EntityStatusUpdater touches entity tables directly - must ensure tenantColumn is correctly parameterized to avoid security issues.
- **Note**: These services are relatively isolated, making this a safe first task to validate the migration pattern.
