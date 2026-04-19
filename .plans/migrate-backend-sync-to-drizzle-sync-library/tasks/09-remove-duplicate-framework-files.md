# T-009 — Remove Duplicate Framework Files from Backend

## Objective

Delete the backend sync framework files that have been replaced by imports from `@avileo/drizzle-sync/server`. This is a post-validation cleanup step — only executed after T-007 (validation) passes completely. This reduces code duplication and ensures the backend evolves consistently with the library going forward.

## Requirements Covered

- `FR-008` — Old sync framework files in `packages/backend/src/services/sync/framework/` are removed after migration validation

## Dependencies

- T-007 (validation must pass completely before removing files — this is irreversible)

## Files or Areas Involved

**Files to DELETE** (after confirming all imports are redirected):

- `packages/backend/src/services/sync/framework/SyncEngine.ts` — Replaced by library import
- `packages/backend/src/services/sync/framework/HandlerRegistry.ts` — Replaced by library import
- `packages/backend/src/services/sync/framework/OperationSorter.ts` — Duplicate of library's (confirm behavioral equivalence first)
- `packages/backend/src/services/sync/framework/EntityRegistry.ts` — Duplicate of library's (confirm behavioral equivalence first)
- `packages/backend/src/services/sync/framework/SyncOperationRepository.ts` — Replaced by Drizzle implementation of library interface (keep if interface requires Drizzle-specific methods not in library interface)
- `packages/backend/src/services/sync/framework/SyncConflictRepository.ts` — Same as above
- `packages/backend/src/services/sync/framework/SyncDeadLetterRepository.ts` — Same as above
- `packages/backend/src/services/sync/handlers/BaseSyncHandler.ts` — Replaced by library re-export or deletion (concrete handlers extend library directly)
- `packages/backend/src/services/sync/framework/types.ts` — May have app-specific types; keep if still needed, otherwise delete
- `packages/backend/src/services/sync/framework/SyncPipeline.ts` — KEEP if Option B (pipeline as wrapper) was chosen in T-003; otherwise evaluate

**Files to KEEP** (not duplicates):

- `packages/backend/src/services/sync/sync.service.ts` — Thin composition layer (imports from library, wires app-specific deps)
- `packages/backend/src/services/sync/sync-logger.ts` — Backend-specific logger (SyncLogger singleton with backend-specific integration); evaluate if library's `SyncLoggerAdapter` replaces it
- `packages/backend/src/services/sync/types.ts` — Backend-specific types (SyncEntity, SyncOperationInput, etc.)
- `packages/backend/src/services/sync/schemas/index.ts` — Zod validation schemas (app-specific)
- `packages/backend/src/services/sync/handlers/SaleSyncHandler.ts` — Concrete handler
- `packages/backend/src/services/sync/handlers/PurchaseSyncHandler.ts` — Concrete handler
- `packages/backend/src/services/sync/handlers/DistribucionSyncHandler.ts` — Concrete handler
- `packages/backend/src/services/sync/handlers/registry.ts` — Handler registration
- `packages/backend/src/services/sync/handlers/core/` — Builder-generated handler utilities

**Files to REVIEW** (evaluate individually):

- `packages/backend/src/services/sync/framework/SyncMetricsService.ts` — Metrics collection; if library's `SyncLogger` exposes metrics, consolidate; otherwise keep
- `packages/backend/src/services/sync/framework/SyncPipeline.ts` — Only keep if Option B (pipeline as wrapper); delete if Option A (middleware in library)

## Actions

1. **Before deleting anything**: Run a global grep to confirm no remaining imports from deleted files:
   ```bash
   grep -r "from.*framework/SyncEngine" packages/backend/src/
   grep -r "from.*framework/HandlerRegistry" packages/backend/src/
   grep -r "from.*handlers/BaseSyncHandler" packages/backend/src/
   grep -r "from.*framework/OperationSorter" packages/backend/src/
   grep -r "from.*framework/EntityRegistry" packages/backend/src/
   ```
   If any imports remain: investigate and redirect them before deletion.

2. **Confirm T-007 validation passed** — do not proceed if any tests failed or if E2E is not green.

3. **Delete files in order** (start with the most independent):
   - Delete `framework/OperationSorter.ts` (no dependencies on other framework files)
   - Delete `framework/EntityRegistry.ts`
   - Delete `framework/HandlerRegistry.ts`
   - Delete `handlers/BaseSyncHandler.ts` (concrete handlers now import from library)
   - Delete `framework/SyncEngine.ts`
   - Evaluate `framework/SyncOperationRepository.ts` — keep if it has methods beyond the library interface; otherwise delete
   - Evaluate `framework/SyncConflictRepository.ts` — same
   - Evaluate `framework/SyncDeadLetterRepository.ts` — same
   - Evaluate `SyncPipeline.ts` — delete if Option A; keep if Option B

4. **Update imports** in files that still reference deleted modules:
   - `packages/backend/src/services/sync/sync.service.ts` → should already import from library (T-005)
   - Any remaining imports to deleted files must be fixed before proceeding

5. **Run typecheck and tests again** after deletion:
   ```bash
   cd packages/backend && bun run typecheck
   cd packages/backend && bun test
   ```
   All must pass.

6. **Verify git status** shows deleted files as removed (not just missing from disk).

## Completion Criteria

- All duplicate framework files are deleted from `packages/backend/src/services/sync/framework/`
- `BaseSyncHandler.ts` in handlers directory is deleted
- All imports in the backend point to `@avileo/drizzle-sync/server` or to remaining app-specific files
- Backend typecheck passes
- Backend tests pass
- Git status shows no unexpected changes

## Validation

- `cd packages/backend && bun run typecheck` — zero errors
- `cd packages/backend && bun test` — all pass
- `git status` — only expected files deleted

## Risks or Notes

- **This is a destructive, irreversible operation.** The validation gate (T-007) must be completely green. Do not skip any validation step.
- If any import is missed, typecheck will fail. This is actually a safety mechanism — don't bypass it.
- Keep `SyncPipeline.ts` only if Option B was chosen. Document the decision explicitly.
- Repository files (SyncOperationRepository, etc.) may need to stay in the backend if they implement interface methods beyond what the library declares. Document why any kept repository file is necessary.
