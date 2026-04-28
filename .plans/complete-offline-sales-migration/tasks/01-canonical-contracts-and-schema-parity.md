# T-001 Canonical Contracts And Schema Parity

## Objective

Establish one canonical contract for the migrated flow across shared schema, backend schema, sync payload validation, sync config, and generated frontend artifacts.

## Requirements Covered

- `FR-001`
- `FR-002`
- `NFR-003`
- `NFR-004`

## Dependencies

- none

## Files or Areas Involved

- `packages/shared/src/schema.ts` - Modify - Align table columns, nullability, version fields, and payment method constants for target entities.
- `packages/shared/src/index.ts` - Review/Modify - Keep exported payment method and sale/payment types consistent with schema.
- `packages/shared/src/sync-config.ts` - Review/Modify - Confirm canonical entities and priorities for `customers`, `sales`, `sale_items`, `abonos`, and related files.
- `packages/shared/src/sync-stages.ts` - Review/Modify - Decide if `files` must be staged because `abonos.proofImageId` references files.
- `packages/backend/src/db/schema/customers.ts` - Review - Confirm customer version and sync fields match shared/generated expectations.
- `packages/backend/src/db/schema/sales.ts` - Review/Modify - Align `visitaId`, date fields, sale item `businessId`, and version expectations.
- `packages/backend/src/db/schema/payments.ts` - Review/Modify - Align abonos version and payment method enum behavior.
- `packages/backend/src/db/schema/enums.ts` - Modify - Align `paymentMethodEnum` with the canonical method set.
- `packages/backend/src/services/sync/schemas/index.ts` - Modify - Align sync create/update schemas with canonical payload fields and payment methods.
- `drizzle-sync.config.ts` - Review/Modify - Ensure generator inputs reflect the canonical schema.
- `packages/app/app/lib/sync/generated/` - Review/Regenerate - Generated schema/services/hooks after source changes.
- `packages/shared/src/__tests__/sync-config.test.ts` - Modify - Update expectations for entity priorities/stages if needed.

## Actions

1. Decide and document the canonical payment method set for abonos before editing schemas. Candidate values must resolve the current `tarjeta` and `saldo` drift.
2. Keep `abonos` as the canonical sync entity unless a concrete persisted-data need requires aliases.
3. Align shared schema with backend/generated for target entities, especially `abonos.version`, `sales.visitaId`, `sale_items.businessId`, and sale date field types.
4. Align backend sync schemas with the canonical payment method set and all payload fields needed by frontend services.
5. Review sync stage coverage for `files` if payment proof images need pull support in the migrated flow.
6. Generate a database migration for backend schema changes when persistent schema changes are made.
7. Regenerate frontend sync artifacts with `bun run sync:generate` after schema/generator inputs are fixed.
8. Add or update a parity validation test that compares the target flow contract across shared, backend, generated, and sync payload definitions.

## Completion Criteria

- One canonical payment method set is used consistently in shared, backend enum, sync payload schemas, generated schemas, and cobros UI validation.
- `customers`, `sales`, `sale_items`, and `abonos` have aligned columns, nullability, date types, and version fields across layers.
- Generated frontend files reflect source changes and are not hand-edited.
- Sync config/stages intentionally include or exclude `files` with test coverage or documented rationale.
- Schema parity test exists or existing tests cover the same guarantees.

## Validation

- `bun run sync:validate`
- `bun run sync:generate`
- `bun run --cwd packages/shared test`
- `bun run --cwd packages/backend typecheck`
- `bun run --cwd packages/app typecheck`

## Risks or Notes

- Payment method changes can affect persisted rows and UI options. If removing a value, add migration/backfill guidance instead of silently rejecting existing data.
- Backend uses PostgreSQL `pgEnum` while shared schema uses text values for PGlite compatibility; parity should compare allowed values, not implementation type.
- Generated files under `packages/app/app/lib/sync/generated/` are expected to change after regeneration.
