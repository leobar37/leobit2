# F-005 — Checkout Payment Calculation

## Objective

Close active parking sessions by calculating the amount to charge, applying grace minutes and optional discounts, selecting a payment method, and saving the completed transaction.

## Status

planned

## Owner

unassigned

## Scope Boundaries

### In Scope

- Checkout endpoint/service flow for active sessions.
- Duration calculation from entry time to checkout time.
- Hourly ceiling rule: 2h15m becomes 3 billable hours.
- Grace minutes: if duration is within grace time, charge zero or apply the configured rule.
- Optional discount field.
- Payment method validation against accepted methods.
- Completed transaction persistence.
- Session state transition from `dentro` to `fuera`.

### Out of Scope

- Per-minute billing.
- SUNAT invoicing.
- Printed tickets.
- Refunds.
- Shift cash reconciliation.

## Verified Context

- `F-003` provides rates, grace minutes, and accepted payment methods.
- `F-004` provides active sessions to close.
- `F-002` provides subscription limit checks that may block new monthly records or Professional-only capabilities.
- Existing sales/payment code has payment method validation patterns, but parking transactions should use dedicated tables rather than product sales tables.

## Assumptions

- Checkout time should be generated server-side.
- Amounts should be stored as decimal-safe strings/DB decimals consistent with existing money fields.
- Discounts cannot make the final amount negative.
- Free-plan limit should be evaluated at the appropriate transaction creation boundary.

## Likely Files or Directories Involved

- `packages/shared/src/index.ts`
- `packages/shared/src/schema.ts`
- `packages/backend/src/db/schema/cochera.ts`
- `packages/backend/src/services/business/cochera-checkout.service.ts`
- `packages/backend/src/services/repository/cochera*.repository.ts`
- `packages/backend/src/api/cochera*.ts`
- `packages/backend/src/plugins/services.ts`
- `packages/app/app/hooks/use-cochera-checkout.ts`
- `packages/app/app/routes/_protected.cochera.cobrar.$id.tsx`
- `packages/app/app/components/cochera/checkout-sheet.tsx`
- `packages/app/app/lib/validators/`

## Dependencies on Other Feature IDs

- Depends on `F-002`, `F-003`, and `F-004`.

## Parallelization Notes

Do not start implementation planning until subscription, settings, and session contracts are stable. Frontend checkout UI can be planned after endpoint shape is agreed.

## Worktree Recommendation

Use a dedicated checkout worktree after foundation branches land.

## Suggested Branch/Worktree Name

- Branch: `feature/cochera-checkout`
- Worktree: `../avileo-cochera-checkout`

## Suggested `/plan` Mode

`structured`

## Decision Notes

None yet.

## Manual Overrides

None.
