# T-002 Migrate Operation Lifecycle Service to Framework

## Objective

Move `SyncOperationLifecycleService` from the app into `@avileo/drizzle-sync/pglite` with configurable self-heal rules, making the operation state machine a framework-owned service.

## Requirements Covered

- `FR-004` - Operation state machine with configurable self-heal
- `FR-009` - Configurable self-heal rules
- `NFR-002` - Unit tests
- `NFR-003` - Type checking

## Dependencies

- `T-001` (Extract Generic Sync Infrastructure) - Depends on SyncAutoRunner and SyncMutex being available in framework

## Files or Areas Involved

- `packages/app/app/lib/sync/sync-operation-lifecycle-service.ts` - Read | Migrate
- `packages/app/app/lib/sync/types/error.types.ts` - Read | Migrate error classification
- `packages/app/app/lib/sync/types/operations.types.ts` - Read | Reference types
- `packages/drizzle-sync/src/pglite/` - Create:
  - `operation-lifecycle.ts`
- `packages/drizzle-sync/src/core/` - Potentially add:
  - Error classification types/functions
- `packages/drizzle-sync/src/pglite/queue-queue.ts` - Review | Ensure queue supports all needed operations
- `packages/drizzle-sync/src/pglite/index.ts` - Modify | Export new service

## Actions

1. **Migrate core state machine**
   - Copy `sync-operation-lifecycle-service.ts` to `pglite/operation-lifecycle.ts`
   - Keep all methods: `markProcessing`, `markCompleted`, `markFailed`, `markConflict`, `retryDeadLetterOperation`, `deleteDeadLetterOperation`, `clearDeadLetterOperations`, `deleteOperation`, `deleteOperations`, `logDetailedStatus`
   - Interface should accept `ISyncQueue` dependency (already in framework)

2. **Make self-heal configurable**
   - Extract hardcoded `SELF_HEAL_INSERTABLE_ENTITIES` into constructor option: `selfHealRules: Set<string>`
   - Extract `classifyError()` function into injectable `IErrorClassifier` interface
   - Provide default error classifier that matches current behavior
   - Document that consumers pass their entity set (e.g., `{ selfHealRules: new Set(['customers', 'products']) }`)

3. **Migrate error classification**
   - Move `SyncErrorCode` and `classifyError` from app types to framework core
   - Ensure framework's error types are compatible with app's usage

4. **Integration with queue**
   - Verify framework's `PgSyncQueue` supports all operations needed:
     - `markProcessing(id)`
     - `markCompleted(id)`
     - `markFailed(id, error, attempts)`
     - `markConflict(id, conflictData)`
     - `retryOperation(id)` - resets failed to pending
     - `moveToDeadLetter(id, error)`
     - `deleteOperation(id)`
   - If any queue operations are missing or have different signatures, align them

5. **Unit tests**
   - Create `packages/drizzle-sync/src/pglite/__tests__/operation-lifecycle.test.ts`
   - Test state transitions: pending → processing → completed/failed/conflict
   - Test self-heal: update→create conversion for configured entities
   - Test dead letter management
   - Test error classification

6. **Update app**
   - Change `sync-service.ts` to import `OperationLifecycleService` from framework
   - Remove local `sync-operation-lifecycle-service.ts`
   - Pass Avileo's self-heal rules via engine configuration

## Completion Criteria

- `pglite/operation-lifecycle.ts` exists with full implementation
- Self-heal rules are configurable via constructor
- Error classification is injectable
- Unit tests cover state transitions, self-heal, and dead letter
- App no longer has local `sync-operation-lifecycle-service.ts`
- `bun test` passes in `packages/drizzle-sync`
- `bun run typecheck` passes in both packages

## Validation

- Run `cd packages/drizzle-sync && bun test` - operation lifecycle tests pass
- Run `cd packages/app && bun run typecheck` - no errors
- Verify app `sync-service.ts` correctly imports from framework

## Risks or Notes

- **Risk**: Self-heal logic is business-specific. Making it generic while preserving Avileo's behavior requires careful testing.
- **Risk**: Error classification (`classifyError`) may have app-specific heuristics. Ensure the default classifier preserves current behavior.
- **Note**: This service is central to sync reliability. Thorough unit testing is critical.
