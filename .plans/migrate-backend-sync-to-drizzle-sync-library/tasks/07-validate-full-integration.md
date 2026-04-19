# T-007 — Validate Full Integration: Test Suite, E2E, and Performance

## Objective

Run the complete validation checklist to confirm the backend migration is production-ready. This includes the full backend test suite, E2E sync flow tests, and a performance sanity check. This is the go/no-go gate for removing the duplicate framework files.

## Requirements Covered

- `NFR-001` — Zero regression: all existing sync tests must pass after migration
- `NFR-004` — Backend sync batch processing latency within 5% of pre-migration baseline

## Dependencies

- T-005 (backend SyncService migration must be complete)
- T-006 (library tests must be passing)

## Files or Areas Involved

- `packages/backend/` — Full test run
- `packages/app/` — E2E sync tests
- `packages/backend/src/services/sync/` — Integration test targets
- `packages/backend/src/services/sync/handlers/__tests__/` — Existing handler tests
- `packages/app/e2e/` — E2E tests

## Actions

### 7a. Backend Typecheck and Unit Tests

1. `cd packages/backend && bun run typecheck` — zero errors
2. `cd packages/backend && bun test` — all tests pass, especially:
   - `packages/backend/src/services/sync/framework/__tests__/OperationSorter.test.ts`
   - `packages/backend/src/services/sync/handlers/__tests__/*.test.ts`
   - Any other sync-related tests

### 7b. Library Tests

1. `cd packages/drizzle-sync && bun test` — all pass
2. `cd packages/drizzle-sync && bun run typecheck` — zero errors

### 7c. E2E Sync Flow Tests

1. `cd packages/app && bun run test:e2e` (or the relevant E2E sync tests)
2. Specific scenarios to validate:
   - Offline → Online: vendor creates sale offline, comes online, sync batch sent to backend, pull delivers changes to other devices
   - Conflict: same entity modified on two devices, conflict detected and persisted
   - Parent-child ordering: sale with items, sale syncs before sale_items
   - Dead letter: operation exceeds retry limit, moves to dead letter queue

### 7d. Performance Baseline Check

1. Capture pre-migration batch processing latency (if benchmarks exist)
2. Run a representative sync batch through the migrated backend
3. Compare latency: should be within 5% of pre-migration baseline
4. If regression > 5%: investigate, don't proceed to T-008

### 7e. Manual Smoke Test

1. Start backend server
2. Start frontend app
3. Create a sale offline (disable network)
4. Re-enable network
5. Verify sale syncs to server
6. Verify pull delivers the sale to another simulated device
7. Verify no errors in backend logs

## Completion Criteria

- `packages/backend` typecheck: zero errors
- `packages/backend` unit tests: all pass
- `packages/drizzle-sync` tests: all pass
- E2E sync tests: all pass (or specific failing tests are documented as pre-existing)
- Performance: batch processing latency within 5% of baseline
- Manual smoke test: offline → online sync works end-to-end

## Validation

- All CI checks pass (or equivalent manual validation)
- Migration is considered stable for T-008 (file removal) only if all above pass

## Risks or Notes

- If E2E tests fail, distinguish between pre-existing failures (unrelated to migration) and new failures introduced by migration. Investigate new failures before proceeding.
- Performance regression > 5% requires investigation before T-008. Common causes: synchronous logger calls, excessive type narrowing, unnecessary async wrapping.
