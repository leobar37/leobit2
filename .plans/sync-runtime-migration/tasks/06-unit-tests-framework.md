# T-006 Unit Tests for Framework Sync Services

## Objective

Write comprehensive unit tests for all migrated sync services in `@avileo/drizzle-sync/pglite` to ensure correctness and prevent regressions. This task fills the testing gap that currently exists (no dedicated PushSyncService tests).

## Requirements Covered

- `NFR-002` - Unit tests for all framework sync services
- `FR-006` - PushSyncService tested with real implementations

## Dependencies

- `T-001` through `T-005` (all implementation tasks must be complete)

## Files or Areas Involved

- `packages/drizzle-sync/src/pglite/__tests__/` - Create:
  - `auto-runner.test.ts`
  - `entity-status-updater.test.ts`
  - `operation-lifecycle.test.ts`
  - `batch-processor.test.ts`
  - `push-service.test.ts`
  - `sync-mutex.test.ts` (update existing or create)
- `packages/drizzle-sync/src/core/__tests__/` - Potentially add:
  - `error-classifier.test.ts`

## Actions

1. **SyncAutoRunner tests**
   - Test `start()` creates interval timer
   - Test `stop()` clears timer
   - Test `recordFailure()` increases backoff (1s → 2s → 4s...)
   - Test `recordSuccess()` resets backoff
   - Test `getBackoffAtMax()` returns true at 30s
   - Test `waitForBackoff()` waits correct duration

2. **SyncMutex tests**
   - Test `acquire("push")` returns true when free
   - Test concurrent `acquire()` returns false for second caller
   - Test re-entrant: same type can acquire again
   - Test `release()` allows next queued operation
   - Test `isBusy()` and `getQueueLength()`
   - Test `reset()` clears all state

3. **SyncEntityStatusUpdater tests**
   - Test `markSynced()` updates `sync_status` to `synced`
   - Test `markSynced()` uses correct `tenantColumn` in WHERE clause
   - Test `markSynced()` resets `sync_attempts` to 0
   - Test with mock PGlite

4. **OperationLifecycleService tests**
   - Test `markProcessing()` updates status to `processing`
   - Test `markCompleted()` updates to `completed` and calls entity status updater
   - Test `markFailed()` increments attempts, moves to dead letter at max retries
   - Test `markConflict()` stores conflict data
   - Test self-heal: update→create conversion for configured entities
   - Test self-heal: no conversion for non-configured entities
   - Test `retryDeadLetterOperation()` moves back to pending
   - Test `clearDeadLetterOperations()` removes all dead letter records

5. **BatchProcessor tests**
   - Test `fetchPendingOperations()` returns operations sorted by priority
   - Test operations with same priority maintain creation order
   - Test batch chunking: 120 operations → 3 batches of 50, 50, 20
   - Test `processBatch()` sends correct HTTP payload
   - Test success: all operations marked completed
   - Test partial failure: correct split between completed/failed
   - Test conflict: operations marked conflict with data preserved
   - Test network error: all operations marked failed
   - Test backoff recorded on failure
   - Test backoff reset on success

6. **PushSyncService integration tests**
   - Test `initialize()` sets up correctly
   - Test `enqueue()` delegates to queue
   - Test `processPending()` acquires mutex, processes batches, releases mutex
   - Test `startAutoSync()` creates repeating timer
   - Test `stopAutoSync()` aborts HTTP client and clears timer
   - Test backoff increases on failure and resets on success
   - Test `retryAllDeadLetterOperations()` retries and returns count
   - Test `getBackendConflicts()` calls HTTP endpoint
   - Test `resolveConflict()` updates operation and re-enqueues
   - Test `isRunning()` reflects processing state
   - Test `cleanup()` stops timers

7. **Test utilities**
   - Create mock implementations:
     - `MockPgSyncQueue` - in-memory queue for testing
     - `MockSyncHttpClient` - records calls, returns configurable responses
     - `MockPGlite` - for SQL verification
   - Share mocks across test files

## Completion Criteria

- Every migrated service has dedicated unit tests
- Tests cover success paths, failure paths, and edge cases
- Test utilities (mocks) are reusable
- `bun test` in `packages/drizzle-sync` shows 100% test pass rate
- No test file has pre-existing issues (like `vi.stubGlobal` problem)

## Validation

- Run `cd packages/drizzle-sync && bun test` - all tests pass
- Run `cd packages/drizzle-sync && bun test --coverage` - check coverage percentages
- Ensure no flaky tests (run suite multiple times)

## Risks or Notes

- **Risk**: PGlite mocking can be complex. Consider using an in-memory PGlite instance instead of full mocks where possible.
- **Risk**: Timer-based tests can be flaky. Use Vitest's fake timers (`vi.useFakeTimers()`).
- **Note**: These tests become the safety net for future framework changes. Invest in good test quality.
