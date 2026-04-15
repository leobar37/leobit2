# T-001 Baseline and Instrumentation

## Objective

Create a measurable baseline for offline sales latency and add durable instrumentation hooks to compare improvements.

## Requirements Covered

- `FR-001`
- `NFR-001`
- `NFR-004`

## Dependencies

- none

## Files or Areas Involved

- `packages/app/app/lib/services/sale-service.ts` - Modify - Add timing instrumentation around create/edit operations.
- `packages/app/app/hooks/use-sales.ts` - Modify - Add mutation-level instrumentation markers.
- `packages/app/app/lib/sync/queue/pg-sync-queue.ts` - Modify - Add timing instrumentation around enqueue phases.
- `packages/app/app/lib/sync/service-provider.tsx` - Review/Modify - Ensure startup timing can be observed.
- `packages/app/e2e/` - Modify/Create - Add repeatable perf scenario for create draft and edit operations.

## Actions

1. Define instrumentation points for draft creation and editor mutation lifecycle (start/end + sub-phase timers).
2. Capture queue enqueue phase timings (idempotency lookup, pending lookup, insert).
3. Add a reproducible local perf scenario (script or e2e) for dataset-scale testing.
4. Document baseline metrics captured on representative Android Chrome profile.

## Completion Criteria

- Hot-path operations emit structured timing logs or metrics with stable labels.
- A repeatable baseline run exists and records P50/P95 for critical operations.
- Instrumentation can remain enabled in staging/dev without breaking flows.

## Validation

- Run targeted create/edit flow under baseline scenario and confirm metrics captured.
- Verify no functional regression in sale creation/edit operations.

## Risks or Notes

- Instrumentation overhead should remain low and avoid skewing measurements materially.
