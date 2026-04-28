# T-007 Validation And Offline Gold Path

## Objective

Add and run validation that proves the migrated framework works for the full offline-first sales/customer/abono flow.

## Requirements Covered

- `FR-009`
- `NFR-005`

## Dependencies

- `T-001`
- `T-002`
- `T-003`
- `T-004`
- `T-005`
- `T-006`

## Files or Areas Involved

- `packages/app/e2e/tests/sync-tests.spec.ts` - Modify/Replace - Stop using stale mock sync payload shape.
- `packages/app/e2e/tests/03-abono.spec.ts` - Review/Modify - Align with canonical abono hooks and offline expectations.
- `packages/app/e2e/tests/02-sale-credito.spec.ts` - Review/Modify - Reuse or extend for offline credit sale path.
- `packages/app/e2e/tests/flujo-vendedor.spec.ts` - Review/Modify - Update full seller flow assertions if useful.
- `packages/app/e2e/tests/sales-cash.spec.ts` - Review - Decide whether to unskip, replace, or keep outside this migration.
- `packages/app/e2e/page-objects/` - Modify/Create - Add stable helpers for customers, sales, cobros, sync status, and offline toggling.
- `packages/backend/src/services/sync/handlers/__tests__/` - Modify/Create - Ensure unit coverage for conflict/version behavior.
- `packages/backend/tests/e2e/` - Create/Modify - Add `/sync/batch` + `/sync/changes` integration coverage if harness supports it.
- `packages/shared/src/__tests__/` - Modify/Create - Add schema/config parity checks.

## Actions

1. Replace stale sync mock payload tests with tests that use the real backend contract: `entries`, `entityType`, `entityId`, `payload`, `localVersion`, and `localTimestamp`.
2. Add a backend integration test for `/sync/batch` processing of customer, sale, sale item, and abono operations.
3. Add a pull verification test for `/sync/changes` after a successful batch.
4. Add a schema parity test for the target entities and payment method values.
5. Add a browser E2E gold path: login, go offline, create customer, create credit sale with items, register abono, verify pending sync status, reconnect, wait for push/pull, verify synced status and balances.
6. Add second-client or fresh-client verification where practical: clear local DB or use a separate context, pull server state, verify customer/sale/items/abono and balances.
7. Run targeted validations first, then package typechecks/builds.
8. Document any environment blockers, flakes, or intentionally deferred coverage in the final execution notes when this plan is built.

## Completion Criteria

- Sync tests no longer assert against the stale `{ entity, data, timestamp }` mock-only shape.
- Backend tests cover target flow batch processing and pull changes.
- Browser E2E proves offline create -> reconnect push -> pull verify for customer + sale + items + abono.
- Validation commands pass or failures are clearly tied to environment constraints, not known migration gaps.

## Validation

- `bun run sync:validate`
- `bun run --cwd packages/shared test`
- `bun run --cwd packages/backend test:run`
- `bun run --cwd packages/backend typecheck`
- `bun run --cwd packages/app test`
- `bun run --cwd packages/app typecheck`
- `bun run --cwd packages/app test:e2e -- <targeted spec>` or the project-specific E2E script for the gold path.

## Risks or Notes

- Full E2E may require dev server, backend, seeded data, and stable auth/session setup. If the existing harness cannot support true backend sync, first add a contract-accurate MSW test, then add the real integration path.
- Network offline tests should use Playwright browser context offline mode, not only mocked flags.
- Avoid random conflict behavior in mocks; conflict tests must be deterministic.
