# F-001 — Business Mode Cochera

## Objective

Add `cochera` as a first-class Avileo business mode so downstream Avileo Cocheras features can be created, selected, routed, and guarded consistently.

## Status

planned

## Owner

unassigned

## Scope Boundaries

### In Scope

- Extend shared business mode schemas/types/defaults to include `cochera`.
- Update business create/update contracts and validators.
- Add initial mode labels/flags needed by frontend and backend.
- Ensure existing `polleria` and `agua` behavior remains unchanged.

### Out of Scope

- Parking session tables.
- Subscription enforcement.
- Cochera UI screens beyond mode selection/label support.

## Verified Context

- Business modes are defined under `packages/shared/src/business-modes/`.
- `packages/shared/src/index.ts` currently exposes business-mode types in `Business`, `CreateBusinessInput`, and `UpdateBusinessInput`.
- `packages/backend/src/db/schema/businesses.ts` stores `businessMode` as `business_mode`.
- `packages/backend/src/context/request-context.ts` resolves `businessMode`.
- `packages/app/app/routes/_protected.business.create.tsx` is a likely mode-selection surface.

## Assumptions

- The slug should be exactly `cochera`.
- Avileo Cocheras mode defaults should disable chicken/water-specific assumptions.
- Mode changes do not require a database migration because `business_mode` is a varchar.

## Likely Files or Directories Involved

- `packages/shared/src/business-modes/schema.ts`
- `packages/shared/src/business-modes/defaults.ts`
- `packages/shared/src/business-modes/index.ts`
- `packages/shared/src/index.ts`
- `packages/backend/src/api/businesses.ts`
- `packages/backend/src/services/business/business.service.ts`
- `packages/app/app/routes/_protected.business.create.tsx`
- `packages/app/app/hooks/use-business-mode.ts`

## Dependencies on Other Feature IDs

- None.

## Parallelization Notes

This is the foundation and should be completed before all other Avileo Cocheras features. It touches shared contract files that downstream features also need.

## Worktree Recommendation

Use a dedicated foundation worktree.

## Suggested Branch/Worktree Name

- Branch: `feature/cochera-mode`
- Worktree: `../avileo-cochera-mode`

## Suggested `/plan` Mode

`simple`

## Decision Notes

None yet.

## Manual Overrides

None.
