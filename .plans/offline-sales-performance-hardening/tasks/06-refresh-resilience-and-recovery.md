# T-006 Refresh Resilience and Recovery

## Objective

Guarantee that pending sales operations remain recoverable and sync resumes correctly across page refreshes, tab close/reopen, and reconnect transitions.

## Requirements Covered

- `FR-001`
- `FR-004`
- `FR-006`

## Dependencies

- `T-003`
- `T-005`

## Files or Areas Involved

- `packages/app/app/lib/sync/service-provider.tsx` - Modify - Harden startup and resume ordering.
- `packages/app/app/lib/sync/coordinator.ts` - Modify - Ensure robust restart/recovery sequencing.
- `packages/app/app/lib/sync/sync-service.ts` - Modify - Improve process resume guarantees on initialization.
- `packages/app/app/lib/sync/sync-auto-runner.ts` - Review/Modify - Avoid lost processing windows after restart.
- `packages/app/app/routes/_protected.tsx` - Review/Modify - Ensure provider lifecycle preserves resume semantics.

## Actions

1. Define explicit startup sequence to resume pending operations after app initialization.
2. Ensure refresh/reopen does not require manual trigger for pending push processing.
3. Validate reconnect behavior with backoff reset and recovery from stale states.
4. Add integration coverage for refresh during pending operations.

## Completion Criteria

- Pending operations survive refresh/reopen and continue processing automatically when conditions allow.
- No manual intervention is required for normal recovery scenarios.
- Coordinator lifecycle is deterministic and observable in logs/metrics.

## Validation

- Simulate offline write -> refresh -> online reconnect and verify completion.
- Simulate in-flight sync interruption and verify safe resume.

## Risks or Notes

- Lifecycle races between providers and sync services can cause flaky recovery if not ordered carefully.
