# T-003 Complete PushSyncService Implementation

## Objective

Replace all stub methods in `PushSyncService` with real implementations that delegate to the infrastructure services migrated in T-001 and T-002, making the framework's push sync service production-ready.

## Requirements Covered

- `FR-006` - Zero stubs in PushSyncService
- `FR-001` - Backoff integration
- `FR-004` - Dead letter retry integration
- `NFR-002` - Unit tests
- `NFR-003` - Type checking

## Dependencies

- `T-001` (Extract Generic Sync Infrastructure) - Needs SyncAutoRunner, SyncMutex
- `T-002` (Migrate Operation Lifecycle Service) - Needs OperationLifecycleService for dead letter and state management

## Files or Areas Involved

- `packages/drizzle-sync/src/pglite/push-service.ts` - Modify | Replace all stubs
- `packages/drizzle-sync/src/pglite/push-types.ts` - Review | May need new types
- `packages/drizzle-sync/src/pglite/auto-runner.ts` - Use | SyncAutoRunner
- `packages/drizzle-sync/src/pglite/operation-lifecycle.ts` - Use | OperationLifecycleService
- `packages/drizzle-sync/src/pglite/index.ts` - Review | Ensure exports are correct
- `packages/drizzle-sync/src/core/` - Review | ISyncService interface alignment

## Actions

1. **Implement `resetBackoff()`**
   - Delegate to `SyncAutoRunner.resetBackoff()`

2. **Implement `getBackoffAtMax()`**
   - Delegate to `SyncAutoRunner.getBackoffAtMax()`

3. **Implement `retryAllDeadLetterOperations()`**
   - Use `OperationLifecycleService.clearDeadLetterOperations()` or iterate and retry each
   - Return actual count of retried operations

4. **Implement `processGroup(groupId)`**
   - Filter pending operations by `syncGroupId`
   - Process them as a batch using same logic as `processPending()`
   - Return `{ success, errors }` with actual results

5. **Implement `resolveConflict()`**
   - Integrate with conflict resolution flow
   - Update operation status and optionally re-enqueue
   - Return boolean success

6. **Implement `startAutoSync()`**
   - Use `SyncAutoRunner.start(task, intervalMs)` with real interval
   - Task should call `processPending()`
   - Stop previous timer if any

7. **Implement `getBackendConflicts()`**
   - Call HTTP client to fetch `/sync/conflicts`
   - Return real response instead of fake data

8. **Implement `getBackendConflict(id)`**
   - Call HTTP client to fetch `/sync/conflicts/${id}`
   - Return real response

9. **Implement `resolveBackendConflict()`**
   - Call HTTP client POST `/sync/conflicts/${id}/resolve`
   - Return real response

10. **Implement dead letter operations**
    - `getDeadLetterOperations()` - delegate to queue
    - `retryDeadLetterOperation()` - delegate to OperationLifecycleService
    - `deleteDeadLetterOperation()` - delegate to OperationLifecycleService
    - `clearDeadLetterOperations()` - delegate to OperationLifecycleService

11. **Implement `logDetailedStatus()`**
    - Output current queue status, backoff state, mutex state to logger

12. **Update constructor**
    - Accept `autoRunner` and `lifecycleService` as optional dependencies
    - Create defaults if not provided (same pattern as queue/mutex)

13. **Unit tests**
    - Create `packages/drizzle-sync/src/pglite/__tests__/push-service.test.ts`
    - Test each newly implemented method
    - Test integration: startAutoSync → processPending → backoff → retry
    - Mock HTTP client and queue for isolated testing

## Completion Criteria

- `push-service.ts` has zero stub methods
- All methods have real implementations delegating to services
- Unit tests cover all methods and integration scenarios
- `bun test` passes in `packages/drizzle-sync`

## Validation

- Run `cd packages/drizzle-sync && bun test` - push service tests pass
- Code review: verify no `// STUB` or empty method bodies remain

## Risks or Notes

- **Risk**: `processGroup` is not currently used by Avileo but must work correctly for framework completeness.
- **Risk**: Backend conflict endpoints may have specific response shapes. Ensure HTTP client interface supports them.
- **Note**: This is the most critical task - it makes the framework implementation authoritative.
