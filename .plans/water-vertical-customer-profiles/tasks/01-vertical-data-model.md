# T-001 Vertical Data Model

## Objective

Add typed, tenant-scoped water vertical tables without adding water-only columns to `customers`.

## Requirements Covered

- `FR-001`
- `FR-002`
- `FR-008`
- `FR-009`
- `FR-014`
- `NFR-005`
- `NFR-006`

## Dependencies

- none

## Files or Areas Involved

- `packages/backend/src/db/schema/` - Create/modify - Add water profile, container ledger, and deposit ledger schema.
- `packages/shared/src/schema.ts` - Modify - Add shared table contracts for sync/front-back compatibility.
- `packages/shared/src/index.ts` - Modify - Export public water profile and ledger types.
- `packages/backend/src/db/migrations/` - Create - Add migration for new tables and indexes.
- Sync generator/config files - Review/Modify - Include new tables in generated frontend/backend sync artifacts.

## Actions

1. Create `water_customer_profiles` with `id`, `businessId`, `customerId`, delivery schedule fields, default bidon quantity, aggregate container balance, deposit status fields, route/zone field, delivery instructions, and timestamps.
2. Enforce one profile per customer per business with a unique index on `(businessId, customerId)`.
3. Add `water_container_ledger_entries` for auditable balance changes: delivery, pickup, damaged, lost, adjustment, and opening balance.
4. Add `water_deposit_ledger_entries` for guarantee movements: collect, refund, penalty, adjustment.
5. Keep aggregate values on `water_customer_profiles` only as cached current state; ledger entries remain the audit source.
6. Add relations to customer/business where appropriate.
7. Add shared schema/types and exports for frontend/backend contracts.
8. Generate or update migrations and sync artifacts using the repo's established source-of-truth flow.

## Completion Criteria

- `customers` has no new water-only columns.
- New water tables are tenant-scoped, indexed, and exported.
- Shared contracts include the water types needed by the frontend.
- Migration and sync artifacts reflect the new tables.

## Validation

- Run backend schema/type checks.
- Run shared package tests.
- Run sync generation/validation commands used by this repo.
- Inspect generated artifacts to confirm water tables are exposed to the right package layers.

## Risks or Notes

- Avoid JSON for fields needed by route generation or reporting.
- If deposit state becomes complex, ledger entries should drive the balance rather than duplicating business rules across screens.
