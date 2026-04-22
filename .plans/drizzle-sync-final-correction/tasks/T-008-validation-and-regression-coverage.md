# T-008: Validation and Regression Coverage

## Objective

Validate the final correction end-to-end and add guardrails to prevent reintroduction of coupling or identifier drift.

## Requirements Covered

- `NFR-004`

## Dependencies

- `T-002`
- `T-003`
- `T-004`
- `T-005`
- `T-006`
- `T-007`

## Files or Areas Involved

- `packages/drizzle-sync/src/**/__tests__` — **Add/Modify**
- `packages/backend/src/services/sync/**/__tests__` — **Add/Modify**
- `packages/app/tests/**` and `packages/app/app/lib/sync/**/__tests__` — **Add/Modify**
- Optional lint/check script for forbidden imports in generic paths — **Add/Modify**

## Actions

1. Add regression tests for canonical identity serialization and generation output.
2. Add runtime tests proving apply path uses injected config and canonical names.
3. Add migration tests with legacy persisted names to verify safe normalization.
4. Add decoupling guard test/check to prevent `@avileo/shared` imports in generic library paths.
5. Run full build/test validation across affected packages.

## Completion Criteria

- Tests cover identity normalization, applier generation, apply integration, migration behavior, and decoupling constraints.
- Build and test suites pass for `drizzle-sync`, `backend`, and `app` targets impacted by the correction.

## Validation

- `cd packages/drizzle-sync && bun test && bun run build`
- `cd packages/backend && bun test`
- `cd packages/app && bun test`
- Run sync generation commands and verify no drift.

## Risks or Notes

- Treat this task as release gate; do not close initiative without it.
