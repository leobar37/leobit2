# F-009 — QA, Seeds, and Fixtures

## Objective

Create demo data and validation coverage for Avileo Cocheras’s critical flows: business creation, configuration, entry, duplicate prevention, checkout calculation, subscription limits, dashboard, and reports/export.

## Status

planned

## Owner

unassigned

## Scope Boundaries

### In Scope

- Demo Avileo Cocheras business/user seed data.
- Backend unit/integration coverage for calculation and tenant isolation rules.
- Frontend or E2E coverage for primary daily workflow.
- Test fixtures for Free vs Professional behavior.
- Validation of dashboard/report aggregate assumptions.

### Out of Scope

- Full browser matrix testing.
- Load testing.
- Hardware/LPR simulations.
- Production monitoring setup.

## Verified Context

- Backend package supports tests and seed scripts.
- App package supports Vitest and Playwright E2E.
- Existing water demo seed work provides a pattern for vertical-specific seed data.
- Feature validation should follow Avileo’s online-first API/TanStack flow for this vertical, not PGlite sync tests.

## Assumptions

- QA can be split per feature during implementation, but this brief tracks the final integrated validation pass.
- Demo data should include active vehicles, completed transactions, and both subscription plans.
- Exact test commands will be determined during `/plan` based on changed packages.

## Likely Files or Directories Involved

- `packages/backend/src/seed/`
- `packages/backend/scripts/`
- `packages/backend/src/services/**/*.test.ts`
- `packages/backend/src/api/**/*.test.ts`
- `packages/app/e2e/tests/`
- `packages/app/e2e/page-objects/`
- `packages/app/app/components/cochera/`
- `packages/app/app/hooks/`
- `package.json`
- `packages/backend/package.json`
- `packages/app/package.json`

## Dependencies on Other Feature IDs

- Depends on `F-005`, `F-006`, `F-007`, and `F-008`.

## Parallelization Notes

Final QA should run after integrated flows exist. Test planning can begin earlier, but durable fixtures and E2E flows depend on stable routes/API shapes.

## Worktree Recommendation

Use a QA worktree that rebases frequently after each feature wave lands.

## Suggested Branch/Worktree Name

- Branch: `feature/cochera-qa`
- Worktree: `../avileo-cochera-qa`

## Suggested `/plan` Mode

`structured`

## Decision Notes

None yet.

## Manual Overrides

None.
