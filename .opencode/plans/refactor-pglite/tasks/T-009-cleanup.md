# T-009: Delete Old Files

## Objective
Delete all old pglite/ files that have been refactored into domain/ structure.

## Requirements Addressed
- Cleanup after refactor

## Files to Delete

### Root level files in pglite/:
- [ ] `change-applier.ts` → Replaced by domain/change/
- [ ] `pull-service.ts` → Replaced by domain/pull/
- [ ] `sync-service.ts` → Replaced by domain/push/
- [ ] `pg-sync-queue.ts` → Replaced by domain/queue/
- [ ] `coordinator.ts` → Logic moved to domain/coordination/ or integrated
- [ ] `staged-pull-coordinator.ts` → Replaced by domain/pull/
- [ ] `sync-batch-processor.ts` → Replaced by domain/push/
- [ ] `sync-operation-lifecycle-service.ts` → Integrated into domain/push/
- [ ] `sync-entity-status-updater.ts` → Integrated into domain/push/
- [ ] `sync-initialization-service.ts` → Move to infra/ or delete if merged
- [ ] `sync-auto-runner.ts` → Move to infra/ or delete if merged
- [ ] `sync-mutex.ts` → Move to infra/
- [ ] `schema-mapper.ts` → Move to config/ or domain/change/
- [ ] `sync-logger.ts` → Replaced by ISyncLogger interface usage
- [ ] `types.ts` → Consolidated into new types.ts
- [ ] `sync-queue.ts` → Stub, delete

## Pre-Deletion Checklist

Before deleting each file, verify:
1. ✅ All exports are available in new location
2. ✅ No imports reference the old file
3. ✅ SyncClientEngine updated (T-007 complete)
4. ✅ Public API updated (T-008 complete)

## Verification Steps
```bash
# Check for any remaining imports of old files
cd packages/drizzle-sync
grep -r "from.*change-applier" src/ || echo "No imports found"
grep -r "from.*sync-service" src/ || echo "No imports found"
grep -r "from.*pull-service" src/ || echo "No imports found"

# Build to verify no broken imports
cd packages/drizzle-sync && bun run build

# Type check
cd packages/drizzle-sync && bun run typecheck
```

## Dependencies
- **T-007**: Engine must be updated to not use old files
- **T-008**: Public API must not export old files

## Order of Deletion
1. First delete obvious stubs: `sync-queue.ts`
2. Delete utility files: `sync-logger.ts`, `sync-mutex.ts` (check if moved first)
3. Delete service files: `change-applier.ts`, `pg-sync-queue.ts`
4. Delete complex services: `sync-service.ts`, `pull-service.ts`, etc.
5. Delete supporting files: `sync-batch-processor.ts`, etc.
6. Last: `types.ts` (ensure new types.ts exists and works)

## Rollback Plan
If issues found after deletion:
1. Files are in git - can be restored with `git checkout <file>`
2. Keep backup branch until T-010 passes

## Deliverables
1. All 15 old files deleted
2. Clean pglite/ directory with only new structure
3. No build errors
4. No broken imports

## Acceptance Criteria
- [ ] All old files deleted
- [ ] New domain/ structure intact
- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] No broken imports remaining
