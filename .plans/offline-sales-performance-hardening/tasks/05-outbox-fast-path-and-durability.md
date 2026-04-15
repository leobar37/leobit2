# T-005 Outbox Fast Path and Durability

## Objective

Introduce a low-latency enqueue path for critical sales writes while preserving durable outbox semantics and sync correctness.

## Requirements Covered

- `FR-004`
- `NFR-003`

## Dependencies

- `T-002`

## Files or Areas Involved

- `packages/app/app/lib/services/base-service.ts` - Modify - Support fast-path enqueue options for selected operations.
- `packages/app/app/lib/sync/queue/pg-sync-queue.ts` - Modify - Separate mandatory durable append from optional coalescing prechecks.
- `packages/app/app/lib/sync/sync-batch-processor.ts` - Review/Modify - Ensure downstream behavior remains compatible.
- `packages/app/app/lib/services/sale-service.ts` - Modify - Apply fast enqueue path in create/edit hot operations.
- `packages/app/app/lib/sync/schema/sync-operations.schema.ts` - Review - Confirm index support for updated queue access pattern.

## Actions

1. Define fast-path enqueue contract for operations where precheck/coalescing can be deferred.
2. Keep durable append semantics as non-negotiable (operation must persist before success returns).
3. Preserve idempotency and `sync_group_id` compatibility in server batch mapping.
4. Shift heavy coalescing/cleanup work out of immediate mutation path when safe.

## Completion Criteria

- Critical sales writes enqueue with fewer local precheck round-trips.
- Queue durability and conflict-handling behavior remains correct.
- No regression in retry/dead-letter and grouped sync processing.

## Validation

- Unit/integration tests for enqueue, retry, coalescing, and grouped processing.
- Offline create/edit/finalize scenarios with forced refresh/reopen between operations.

## Risks or Notes

- Fast-path logic must avoid introducing duplicate operations that cannot be reconciled downstream.
