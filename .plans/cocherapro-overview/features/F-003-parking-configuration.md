# F-003 — Parking Configuration

## Objective

Add Avileo Cocheras settings for garage identity and billing rules: name/address, hourly rate, optional day rate, grace minutes, capacity, and accepted payment methods.

## Status

planned

## Owner

unassigned

## Scope Boundaries

### In Scope

- Tenant-scoped parking settings model/API.
- Hourly rate, optional full-day rate, grace minutes, number of spaces.
- Accepted payment methods: efectivo, yape, plin.
- Configuration UI for owners/admins.
- Validation for non-negative rates, capacity, and grace minutes.

### Out of Scope

- Multi-garage configuration.
- Shift/cash register controls.
- Hardware integrations.
- Dynamic pricing rules beyond MVP requirements.

## Verified Context

- Business identity fields already exist in `packages/backend/src/db/schema/businesses.ts`.
- Dedicated vertical settings should follow the water-extension table pattern rather than overloading generic business fields.
- Frontend configuration routes exist under protected route conventions and should use Spanish UX copy.
- Payment method constants already include `efectivo`, `yape`, and `plin`.

## Assumptions

- Garage name/address may reuse business fields, but parking-specific rates/capacity should live in a Avileo Cocheras settings table or equivalent tenant-scoped model.
- Day rate is optional and can be stored nullable.
- Capacity is informational for dashboard/occupancy warnings unless `/plan` defines hard-blocking behavior.

## Likely Files or Directories Involved

- `packages/shared/src/index.ts`
- `packages/shared/src/schema.ts`
- `packages/backend/src/db/schema/cochera.ts`
- `packages/backend/src/db/schema/index.ts`
- `packages/backend/src/services/repository/cochera*.ts`
- `packages/backend/src/services/business/cochera*.ts`
- `packages/backend/src/api/cochera*.ts`
- `packages/backend/src/plugins/services.ts`
- `packages/app/app/hooks/use-cochera*.ts`
- `packages/app/app/routes/_protected.config.cochera.tsx` (settings form under `/config/cochera`)
- `packages/app/app/routes/_protected.config._index.tsx` (add "Configuracion de Cochera" item)
- `packages/app/app/components/cochera/`

## Dependencies on Other Feature IDs

- Depends on `F-001`.

## Parallelization Notes

Can proceed in parallel with `F-002` and `F-004`. It must stabilize before `F-005` because checkout fee calculation depends on rates, grace minutes, and accepted payment methods.

## Worktree Recommendation

Use a dedicated settings worktree.

## Suggested Branch/Worktree Name

- Branch: `feature/cochera-config`
- Worktree: `../avileo-cochera-config`

## Suggested `/plan` Mode

`structured`

## Decision Notes

None yet.

## Manual Overrides

None.
