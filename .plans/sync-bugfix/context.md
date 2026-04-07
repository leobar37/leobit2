# Sync Bugfix Plan — Context

## Overview

Fix 3 critical bugs and 4 moderate issues in the Avileo sync system, plus add missing tests. All changes must be safe, reversible, and tested.

## Why This Matters

1. **Dual PullService** — `_protected.tsx` wraps content in `PullSyncWrapper`, which creates a second `PullService` instance. This runs in parallel with the `SyncCoordinator`'s own `PullService`, causing duplicate `/sync/changes` requests every 10 seconds.

2. **Cursor infinite loop** — `pull-service.ts:350` only advances the cursor when `appliedCount > 0`. If the server returns changes that fail to apply locally (schema mismatch), the cursor never advances, and the next pull fetches the same changes forever.

3. **DELETE without businessId** — `change-applier.ts:215` executes `DELETE FROM "table" WHERE id = $1` without filtering by `business_id`. This is a multi-tenancy security gap.

## What Exists

- **Frontend sync engine**: `packages/app/app/lib/sync/` — SyncService, PullService, SyncCoordinator, ChangeApplier
- **Hooks**: `use-pull-sync.ts`, `use-manual-sync.ts`, `use-sync-status.ts`
- **Backend sync API**: `packages/backend/src/api/sync.ts` — POST /sync/batch, GET /sync/changes
- **Backend handlers**: 15 entity-specific sync handlers
- **Tests**: 13 frontend test files, 2 backend handler tests
- **E2E mocks**: `packages/app/e2e/mocks/handlers.ts` — no sync handlers

## Files That Will Change

| File | Change |
|------|--------|
| `packages/app/app/routes/_protected.tsx` | Remove 3x `<PullSyncWrapper>` |
| `packages/app/app/components/sync/pull-sync-wrapper.tsx` | Delete |
| `packages/app/app/hooks/use-pull-sync.ts` | Delete |
| `packages/app/app/lib/sync/pull-service.ts` | Fix cursor + add AbortController |
| `packages/app/app/lib/sync/sync-service.ts` | Make backoff cancellable |
| `packages/app/app/lib/sync/coordinator.ts` | Debounce forceSync |
| `packages/app/app/lib/sync/staged-pull-coordinator.ts` | Add abort flag |
| `packages/app/app/lib/sync/change-applier.ts` | Add businessId to DELETE |
| `packages/app/e2e/mocks/handlers.ts` | Add MSW sync handlers |
| `packages/backend/src/services/sync/handlers/__tests__/*.test.ts` | Add handler tests |

## Safety Strategy

1. Run existing tests **before** any changes — establish baseline
2. Add new tests **before** fixing (test-driven where possible)
3. Make minimal, targeted changes
4. Run tests **after** each change
5. Verify sync still works end-to-end

## Test Commands

```bash
# Frontend unit tests
cd packages/app && bun test

# Backend handler tests  
cd packages/backend && bun test

# E2E tests (requires backend running)
cd packages/app && bun run test:e2e
```
