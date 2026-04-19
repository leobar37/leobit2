# T-003 — Reconcile SyncEngine Architecture: Pipeline, DbTransaction, and Repository Interfaces

## Objective

Resolve the architectural differences between the library's `SyncEngine` and the backend's concrete implementation. Specifically: the `SyncPipeline` middleware pattern, the `DbTransaction` generic type, and the repository interface alignment. The outcome is a library `SyncEngine` that the backend can use as a drop-in replacement, or a documented adapter strategy that makes the library usable without modifying its core.

## Requirements Covered

- `FR-001` — Backend's `SyncService.processBatch()` calls library's `SyncEngine.processBatch()`
- `FR-004` — `SyncPipeline` middleware layer preserved as a wrapper around library handler execution
- `FR-005` — Backend's repositories implement the library's repository interfaces

## Dependencies

- T-001 (must be complete: OQ-001 and OQ-002 resolutions are prerequisites)
- T-002 (BaseSyncHandler reconciliation must be done before SyncEngine reconciliation, because handlers are called by SyncEngine)

## Files or Areas Involved

- `packages/drizzle-sync/src/server/sync-engine.ts` — Modify or wrapper strategy
- `packages/drizzle-sync/src/server/types.ts` — Modify (DbTransaction, SyncEngineConfig, SyncEngineDeps)
- `packages/drizzle-sync/src/server/operation-repository.ts` — Modify (interface vs. implementation)
- `packages/drizzle-sync/src/server/conflict-repository.ts` — Review/Modify
- `packages/drizzle-sync/src/server/dead-letter-repository.ts` — Review/Modify
- `packages/drizzle-sync/src/server/operation-sorter.ts` — Review (already likely equivalent)
- `packages/backend/src/services/sync/framework/SyncEngine.ts` — Reference (source of concrete behavior)
- `packages/backend/src/services/sync/framework/SyncPipeline.ts` — Reference (pipeline middleware to preserve)
- `packages/backend/src/services/sync/sync.service.ts` — Reference (usage site, composition)
- `packages/backend/src/lib/txid.ts` — Review (DbTransaction type definition)
- `packages/backend/src/services/sync/framework/SyncOperationRepository.ts` — Compare interface

## Actions

### 3a. Resolve OQ-001: SyncPipeline Strategy

**Option A (preferred): Add middleware/hook support to library's `SyncEngine`**

1. Add an optional `beforeOperation?: (op: SyncOperationInput, ctx: SyncContext) => void` and `afterOperation?: (result: SyncHandlerResult, op: SyncOperationInput, ctx: SyncContext) => void` hook interface to `SyncEngineConfig`.
2. The backend's `SyncPipeline` behavior (correlation ID logging, timing, context injection) becomes a middleware instance passed to `SyncEngineConfig`.
3. Library's `processOperation` calls hooks at appropriate points.

**Option B: Keep SyncPipeline as backend-only wrapper**

1. Library's `SyncEngine` remains unchanged (direct handler execution).
2. Backend keeps `SyncPipeline.ts` as a wrapper that pre-processes operations before calling library's engine, and post-processes results.
3. Backend's `SyncService` calls `SyncPipeline.execute()` which internally calls `librarySyncEngine.processBatch()`.

**Decision from T-001 must guide this choice.** Document the chosen path explicitly.

### 3b. Resolve OQ-002: DbTransaction Adapter

1. Library defines a minimal `DbTransaction` interface in `types.ts`:
   ```typescript
   export interface IDbTransaction {
     execute(sql: unknown): Promise<unknown>;
   }
   ```
2. Backend provides a Drizzle-specific transaction adapter that implements this interface, wrapping `db.transaction()`.
3. Alternatively: use the library's existing `DbClient<TTransaction>` pattern — the backend passes its `db` client (which already implements `transaction()` and `execute()`) through the generic.

### 3c. Align Repository Interfaces

1. **Compare** library's `ISyncOperationRepository` with backend's `SyncOperationRepository`:
   - Library interface methods: `findByIdempotencyKey`, `insertOrUpdate`, `updateStatus`, `findPending`, `findByBusiness`
   - Backend implementation: same methods + `findById`, `findProcessedAfter`, `deleteOldProcessed`
   - If library interface is missing methods the backend needs: add them to the interface (FR-005)
   - Backend's concrete `SyncOperationRepository` becomes the Drizzle-based implementation of the library interface

2. **Same for** `ISyncConflictRepository` and `ISyncDeadLetterRepository`: compare and align interface to implementation

3. **Update library interfaces** if gaps exist (this is library feature addition, not backend workaround)

### 3d. Add Savepoint SQL Generators to Config

1. Library's `SyncEngineConfig` already has `savepointSql`, `releaseSavepointSql`, `rollbackSavepointSql` function fields (from T-003 extraction).
2. Confirm these are properly called in the library's `processBatch` loop.
3. Backend provides PostgreSQL-specific implementations when constructing `SyncEngineConfig`:
   ```typescript
   {
     savepointSql: (name: string) => sql`SAVEPOINT ${sql.raw(name)}`,
     releaseSavepointSql: (name: string) => sql`RELEASE SAVEPOINT ${sql.raw(name)}`,
     rollbackSavepointSql: (name: string) => sql`ROLLBACK TO SAVEPOINT ${sql.raw(name)}`,
   }
   ```

### 3e. Align Handler Execution

1. Library's `SyncEngine.processOperation` calls `handler.execute(ctx, operation, tx)` directly (line 394 of library sync-engine.ts).
2. Backend's `SyncPipeline` wraps this with middleware (correlation ID, logging, timing).
3. If Option A (middleware in library): integrate middleware hooks before/after `handler.execute`.
4. If Option B (pipeline as wrapper): no change to library's `processOperation`; backend's `SyncPipeline` wraps at the service layer.

## Completion Criteria

- OQ-001 decision documented and implemented (either library has middleware hooks, or backend SyncPipeline wraps library engine)
- OQ-002 decision documented and implemented (DbTransaction adapter strategy)
- Library's `ISyncOperationRepository`, `ISyncConflictRepository`, `ISyncDeadLetterRepository` interfaces cover all methods that backend's concrete implementations need
- Backend's `SyncOperationRepository` implements `ISyncOperationRepository` from library
- `packages/drizzle-sync` typechecks cleanly
- Backend can construct a library `SyncEngine` with its Drizzle db, repositories, logger, and SQL generators

## Validation

- Library `SyncEngine` unit tests (added in T-006) verify savepoint SQL generation is called correctly
- Backend's `SyncService` can instantiate the library's `SyncEngine` with Drizzle transaction
- Backend's `SyncPipeline` (if kept) correctly intercepts operations before/after library engine

## Risks or Notes

- This is the most complex task. The SyncPipeline vs. direct execution difference is architectural.
- If Option B is chosen (pipeline as wrapper), the library's `SyncEngine` doesn't need to change, but the backend migration in T-005 becomes more complex.
- If Option A is chosen (middleware hooks), the library's `SyncEngine` changes, which must be validated by tests.
