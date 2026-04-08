# T-004 Add DLQ Recovery UI to Sync Debug Panel

## Objective

Make dead-letter queue operations visible in the sync debug panel so vendors can see which operations failed permanently and retry or discard them.

## Requirements Covered

- `FR-004`

## Dependencies

- `T-001` (TanStack invalidation wired, so DLQ retry result can invalidate queries)

## Files or Areas Involved

- `packages/app/app/lib/sync/cleanup-service.ts` - Modify - `retryDeadLetterOperation` method already exists
- `packages/app/app/lib/sync/sync-service.ts` - Review - `retryDeadLetterOperation` and `deleteDeadLetterOperation` methods
- `packages/app/app/devtools/sync/drawer.tsx` - Modify - Add DLQ section to the sync debug drawer
- `packages/app/app/lib/sync/types.ts` - Review - `DeadLetterOperationRecord` type
- `packages/app/app/lib/sync/sync-service.ts` - Modify - `getDeadLetterOperations` returns records with entity details

## Actions

1. **Audit the existing DLQ methods** in `SyncService`. Confirm `getDeadLetterOperations(limit: 100)`, `retryDeadLetterOperation(id)`, and `deleteDeadLetterOperation(id)` all exist and work correctly (they do based on code review at lines 917-970 of `sync-service.ts`).

2. **Add a `getDeadLetterOperationsWithDetails()` method** to `SyncService` that enriches dead-letter records with a human-readable description (e.g., "Sale update failed after 5 attempts: Record not found"). This goes in `sync-service.ts` alongside existing DLQ methods.

3. **Find the sync debug drawer component.** Locate `packages/app/app/devtools/sync/drawer.tsx` (or similar path from glob results). Read the existing structure to understand how it renders sync status.

4. **Add a DLQ section to the sync debug drawer**, above or below the existing queue status section:
   - Header: "Dead Letter Queue (N operations)"
   - List each operation showing: entity type, operation type, entity ID (truncated), error message, attempts count
   - Per-operation actions:
     - **Retry**: calls `syncService.retryDeadLetterOperation(id)` → re-enqueues the operation
     - **Discard**: calls `syncService.deleteDeadLetterOperation(id)` → permanently removes
   - "Retry All" button: loops all DLQ ops and calls retry for each
   - "Clear All" button: calls `syncService.clearDeadLetterOperations()`

5. **Wire TanStack invalidation after retry.** When a DLQ operation is retried and re-enqueued, it will eventually sync. After a successful retry, call `queryClient.invalidateQueries()` for the affected entity type so the UI reflects the corrected data.

6. **Style the DLQ section** using the existing shell tokens (`shell-card-flat`, `shell-block-muted`) to match the rest of the debug panel.

7. **Add empty state**: If DLQ is empty, show "No failed operations" with a checkmark icon instead of the list.

## Completion Criteria

- DLQ section visible in sync debug drawer at all times (even when empty)
- Each DLQ operation shows: entity type, operation, error summary, attempt count
- "Retry" button re-enqueues the operation and removes it from DLQ
- "Discard" button permanently deletes the operation from DLQ
- After retry, the operation appears in the pending queue and syncs normally
- DLQ count in the sync status badge matches the actual DLQ table count

## Validation

- Manually move an operation to DLQ: create a sale, set it to `failed` status with `sync_attempts = 5` in PGlite directly, open debug panel, see it in DLQ list, click Retry, see it disappear from DLQ and appear in pending queue, verify it syncs successfully
- "Clear All" empties the DLQ and updates the count to 0

## Risks or Notes

- **Risk**: DLQ data is PGlite-local. If the vendor resets their local DB, DLQ is cleared. This is expected.
- **Note**: The debug panel is only accessible in development mode (it's behind `import.meta.env.DEV`). For production, a production-visible DLQ management UI (e.g., under settings or sync status) would be needed. This task covers the debug panel only.
