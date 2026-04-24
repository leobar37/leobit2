# T-005 Validation and Integration Testing

## Objective

Verify that all refactored services work correctly, sync ordering is correct, and no regressions were introduced in offline-first behavior.

## Requirements Covered

- `FR-006`
- `NFR-001`
- `NFR-003`

## Dependencies

- `T-002`
- `T-003`
- `T-004`

## Files or Areas Involved

- `packages/app/` - Review - Type checking, tests
- `packages/backend/` - Review - Sync handler validation
- `packages/shared/` - Review - Sync config tests
- `packages/app/e2e/` - Review - E2E test execution

## Actions

1. Run TypeScript type checking across all packages:
   - `packages/shared`
   - `packages/app`
   - `packages/backend`
2. Run unit tests for sync configuration (`packages/shared`)
3. Run frontend unit tests (`packages/app`)
4. Run backend unit tests (`packages/backend`)
5. Execute E2E tests for the critical flows:
   - Customer CRUD + sync
   - Payment registration + sync + debt calculation
   - Sale creation (POS) + sync
   - Offline → online transition for each flow
6. Manually verify sync ordering:
   - Create a customer offline
   - Create a sale for that customer offline
   - Create a payment for that sale offline
   - Go online and verify sync succeeds without FK errors
7. Check for any remaining `pg.query()` usage in frontend services (grep for it)
8. Document any exceptions where raw SQL is intentionally kept

## Completion Criteria

- All TypeScript compilation passes with zero errors
- All existing unit tests pass
- E2E tests for customer, payment, and sale flows pass
- No FK constraint errors during sync
- No remaining `pg.query()` calls in frontend services (except documented exceptions)

## Validation

- `bun run typecheck` (or equivalent per package)
- `bun test` in each package
- `bun run test:e2e` in `packages/app`
- Manual sync ordering test (offline → online)

## Risks or Notes

- If E2E tests fail, determine whether the failure is due to the refactor or a pre-existing issue.
- Sync ordering issues may only appear under specific race conditions (e.g., multiple offline changes). Consider adding a specific test for this.
- Document the final state: which services use generated services vs. custom Drizzle queries, so future developers know the pattern.
