# T-002 Backend Sync Conflict Integrity

## Objective

Make backend sync processing reliable for customers, sales, sale items, and abonos by aligning repository writes, handler behavior, tenant guards, and conflict resolver expectations.

## Requirements Covered

- `FR-003`
- `FR-004`
- `NFR-001`
- `NFR-004`

## Dependencies

- `T-001`

## Files or Areas Involved

- `packages/backend/src/services/repository/customer.repository.ts` - Modify - Increment version on customer updates used by conflict resolver.
- `packages/backend/src/services/repository/payment.repository.ts` - Modify - Make version mismatch/not-found behavior explicit for sync updates.
- `packages/backend/src/services/repository/sale.repository.ts` - Modify - Increment parent sale version when sale items mutate and harden tenant filters.
- `packages/backend/src/services/sync/framework/ConflictResolver.ts` - Review/Modify - Align resolvers with actual version mutation strategy.
- `packages/backend/src/services/sync/handlers/registry.ts` - Modify - Make `sale_items` and `abonos` handlers fail/retry explicitly for invalid state.
- `packages/backend/src/services/sync/handlers/SaleSyncHandler.ts` - Review/Modify - Ensure sale create/update validations and version behavior are consistent.
- `packages/backend/src/services/business/payment.service.ts` - Review - Identify business rules that must be mirrored or safely called from sync.
- `packages/backend/src/services/business/sale.service.ts` - Review - Identify sale invariants that must be enforced on sync payloads.
- `packages/backend/src/services/sync/handlers/__tests__/` - Modify/Create - Add regression tests for versioning and invalid operations.

## Actions

1. Update customer repository update paths so every meaningful customer update increments `version` and updates `updatedAt` consistently.
2. Update payment repository/sync update paths so a missing row or expected-version mismatch returns a clear conflict/error outcome instead of a silent success.
3. Decide whether sale item conflict safety uses parent sale version only or adds per-item version. Implement the chosen strategy consistently.
4. If using parent sale version, increment parent `sales.version` when sale items are created, updated, deleted, or totals are recalculated.
5. Harden sale item update/delete repository filters with tenant guarantees, either direct `businessId` filters or parent sale checks within the same transaction.
6. Review `withSkipOnParentMissing()` behavior for `sale_items`; decide whether missing parent should retry/dead-letter instead of skipping in the migrated flow.
7. Add sync-path business validation for sale totals and abono overpayment/debt constraints where repository-only handlers currently bypass service-level checks.
8. Add backend tests for customer version increments, abono version mismatch, sale item parent version increments, tenant guard behavior, and invalid parent handling.

## Completion Criteria

- Conflict resolvers read versions that are actually incremented by the corresponding write paths.
- Abono update operations cannot silently report success when no row was updated due to version mismatch or missing data.
- Sale item changes are visible to conflict detection through parent sale version or an explicit item version.
- Backend handlers preserve tenant isolation and explicit failure semantics.
- Regression tests cover the version/conflict cases discovered in investigation.

## Validation

- `bun run --cwd packages/backend test:run -- src/services/sync/handlers`
- `bun run --cwd packages/backend typecheck`
- Targeted tests for `customer.repository`, `payment.repository`, and `sale.repository` if test coverage exists or is added.

## Risks or Notes

- Changing version increments can cause legitimate conflicts to appear where previous behavior ignored them. That is desired, but UI/error handling must be ready for conflict states.
- Business validation in sync handlers should not require online-only dependencies or side effects.
- Avoid broad repository rewrites; only change paths relevant to target sync entities.
