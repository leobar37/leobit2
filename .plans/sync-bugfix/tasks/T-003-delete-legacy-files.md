# T-003: Delete use-pull-sync.ts and pull-sync-wrapper.tsx

**Requirement**: FR-001

## Action

After T-002 is verified working, delete the legacy files:

```bash
rm packages/app/app/hooks/use-pull-sync.ts
rm packages/app/app/components/sync/pull-sync-wrapper.tsx
```

Also remove the component directory if empty:
```bash
rmdir packages/app/app/components/sync 2>/dev/null || true
```

## Verification

```bash
# These should return no results
grep -r "use-pull-sync" packages/app/
grep -r "PullSyncWrapper" packages/app/
```

## Files Deleted
- `packages/app/app/hooks/use-pull-sync.ts`
- `packages/app/app/components/sync/pull-sync-wrapper.tsx`

## Notes

This step is safe because:
1. The file is no longer imported anywhere (after T-002 removes the import from `_protected.tsx`)
2. The functionality is covered by the SyncCoordinator's PullService
