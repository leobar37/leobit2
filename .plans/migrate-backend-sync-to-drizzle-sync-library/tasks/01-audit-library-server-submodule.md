# T-001 — Audit Library server/ Submodule vs. Backend Framework

## Objective

Conduct a line-by-line behavioral audit comparing `packages/drizzle-sync/src/server/` against `packages/backend/src/services/sync/framework/` and `handlers/BaseSyncHandler.ts`. Identify every concrete difference in behavior (not just structure) between the library's components and the backend's running implementations. Resolve Open Questions OQ-001 and OQ-002 from requirements.md.

## Requirements Covered

- `FR-001`, `FR-002`, `FR-003`, `FR-004`, `FR-005`, `FR-006`, `FR-007`

## Dependencies

None (foundation task)

## Files or Areas Involved

- `packages/drizzle-sync/src/server/sync-engine.ts` — Review
- `packages/drizzle-sync/src/server/base-handler.ts` — Review
- `packages/drizzle-sync/src/server/handler-registry.ts` — Review
- `packages/drizzle-sync/src/server/operation-repository.ts` — Review
- `packages/drizzle-sync/src/server/conflict-resolver.ts` — Review
- `packages/drizzle-sync/src/server/conflict-repository.ts` — Review
- `packages/drizzle-sync/src/server/dead-letter-repository.ts` — Review
- `packages/drizzle-sync/src/server/entity-registry.ts` — Review
- `packages/drizzle-sync/src/server/operation-sorter.ts` — Review
- `packages/drizzle-sync/src/server/sync-logger.ts` — Review
- `packages/drizzle-sync/src/server/types.ts` — Review
- `packages/backend/src/services/sync/framework/SyncEngine.ts` — Compare
- `packages/backend/src/services/sync/handlers/BaseSyncHandler.ts` — Compare
- `packages/backend/src/services/sync/framework/HandlerRegistry.ts` — Compare
- `packages/backend/src/services/sync/framework/SyncOperationRepository.ts` — Compare
- `packages/backend/src/services/sync/framework/SyncConflictRepository.ts` — Compare
- `packages/backend/src/services/sync/framework/SyncDeadLetterRepository.ts` — Compare
- `packages/backend/src/services/sync/framework/EntityRegistry.ts` — Compare
- `packages/backend/src/services/sync/framework/OperationSorter.ts` — Compare
- `packages/backend/src/services/sync/framework/SyncPipeline.ts` — Compare (library has no equivalent)
- `packages/backend/src/services/sync/sync-logger.ts` — Compare
- `packages/backend/src/services/sync/sync.service.ts` — Compare (usage site)
- `packages/backend/src/services/sync/types.ts` — Compare
- `packages/backend/src/services/sync/framework/types.ts` — Compare

## Actions

1. **Compare `SyncEngine`**:
   - Library: generic `SyncEngine<TRequestContext, TTransaction, TDeps>`, DI via constructor config object, direct `handler.execute()` call, configurable SQL generators for savepoints, `ISyncEventEmitter` support
   - Backend: concrete class, instantiates `SyncOperationRepository` internally, uses `SyncPipeline` wrapper, `db.transaction()` called directly, correlation ID generated via local `syncLogger`
   - Document every behavioral delta: how operations are sorted, how savepoints are named/managed, how errors are caught, what the return shape is

2. **Compare `BaseSyncHandler`**:
   - Library: `console.log` for all logging, no `ISyncLogger`, no PostgreSQL error extraction, generic `logStart/logSuccess/logError`
   - Backend: uses injected `logger` (app logger), extracts `pgErrorCode`, `pgErrorDetail`, `pgErrorRoutine` from error cause chain
   - Document every method that behaves differently: `logStart`, `logSuccess`, `logError`, `executeOperation`, `ensureParentExists`

3. **Compare `HandlerRegistry`**:
   - Library: static map, `register(entityType, factory)` pattern, `getHandler(entityType, deps)`, `hasHandler`, `getRegisteredEntities`, `clear`
   - Backend: identical pattern but imports `SyncEngineDeps` from backend's types (not library's)
   - Check if handler factory signature is compatible

4. **Compare repositories**:
   - Library: `ISyncOperationRepository`, `ISyncConflictRepository`, `ISyncDeadLetterRepository` interfaces; concrete implementations in library are minimal/no-op or absent
   - Backend: Drizzle-based implementations with full SQL, business ID filtering, transaction support
   - Determine: does the library's interface match what the backend's implementations do?

5. **Compare `EntityRegistry`**:
   - Both: `wasCreated(id)` method, `register(operation, entityId)` method
   - Check if behavior is identical

6. **Compare `OperationSorter`**:
   - Both: `sort(operations)` returning `{ operations, groupCount }`, `getPriorityMap()`
   - Check if priority logic is identical

7. **Compare `SyncLogger`**:
   - Library: singleton with `generateCorrelationId`, `getMetrics()`, `getRecentErrors()`, `classifyError()` (Spanish strings: "requiere", "no encontrado"), `SyncLoggerAdapter` for `ISyncLogger`
   - Backend: `syncLogger` singleton, similar `generateCorrelationId`, `getMetrics()`, `getRecentErrors()`, error classification with same Spanish strings
   - Are they behaviorally the same? Does the adapter bridge correctly?

8. **Compare `SyncPipeline`**:
   - Backend has `SyncPipeline.ts` (81 lines) — middleware wrapper around handler execution
   - Library has no equivalent
   - Document: what does SyncPipeline add? (logging, correlation ID context, timing)

9. **Resolve OQ-001** (SyncPipeline/middleware):
   - Decide: should the library's `SyncEngine` accept a middleware stack, or should the backend keep `SyncPipeline` as a backend-only wrapper?

10. **Resolve OQ-002** (DbTransaction type):
    - Library uses generic `TTransaction` with `DbClient<TTransaction>` interface
    - Backend uses `DbTransaction` from `packages/backend/src/lib/txid.ts`
    - Decide: does the library need a Drizzle-specific transaction adapter, or can the backend pass its `DbTransaction` through the generic?

## Completion Criteria

- All 9 comparison tasks above are documented with concrete behavioral differences
- OQ-001 resolved: documented decision on SyncPipeline/middleware approach
- OQ-002 resolved: documented decision on DbTransaction adapter strategy
- A "diff report" exists as a comment block at the top of `context.md` or a separate `audit-findings.md` in the plan directory
- T-002 and T-003 can start immediately after this task completes

## Validation

- No code changes. Output is a written audit report (markdown in plan dir or inline in context.md).
- The audit findings must be specific enough that T-002 implementers know exactly what to change in the library's `BaseSyncHandler`.

## Risks or Notes

- This task produces no code but determines the entire migration approach. Do not rush it.
- The `SyncPipeline` difference is the most architecturally significant — the library's `SyncEngine` assumes direct handler execution; the backend assumes middleware interception.
