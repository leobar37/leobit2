# T-006 Cobros UI And Balance Flow

## Objective

Complete the minimal UI and hook surface needed to exercise cobros/abonos and balance updates across customer detail, sale detail, and cobros screens while offline.

## Requirements Covered

- `FR-007`
- `FR-008`
- `NFR-002`
- `NFR-006`

## Dependencies

- `T-004`
- `T-005`

## Files or Areas Involved

- `packages/app/app/routes/_protected.cobros._index.tsx` - Modify - Add sync visibility or pending/error cues needed for QA.
- `packages/app/app/routes/_protected.cobros.nuevo.tsx` - Modify - Align validation with canonical payment methods and offline UX.
- `packages/app/app/routes/_protected.clientes.$id._index.tsx` - Modify - Ensure abonos tab and saldo display reflect migrated local services.
- `packages/app/app/routes/_protected.ventas.$id._index.tsx` - Review/Modify - Ensure sale detail balance/payment card links to abono flow when needed.
- `packages/app/app/components/sales/sale-detail-payment-card.tsx` - Modify - Add CTA to register abono for credit sales with balance.
- `packages/app/app/hooks/use-payment-methods-config.ts` - Review - Keep online-only config behavior explicit when offline.
- `packages/app/app/hooks/use-files.ts` - Review/Modify if proof staging is included - Online-only proof upload must be explicit or deferred.
- `packages/app/e2e/page-objects/CobrosPage.ts` - Modify - Add selectors/actions needed for validation.

## Actions

1. Align cobro form validation and UI options with the canonical payment method set from `T-001`.
2. Add a direct sale-detail CTA to register an abono for credit sales with outstanding balance, pre-filling customer and optionally sale context.
3. Ensure customer detail abonos tab shows local pending/error sync status where available.
4. Add lightweight sync visibility to cobros index so QA can verify offline pending/error state without devtools.
5. Make payment proof behavior explicit: either stage uploads for later sync, or show that proof upload requires connection while the abono itself can be saved offline.
6. Add or update page objects/selectors for cobros and sale payment flows.
7. Keep all user-facing text in Spanish and follow existing mobile list/shell patterns.

## Completion Criteria

- A user can navigate from sale detail to register an abono for a debt without manually detouring through customer search.
- Cobro creation works offline for the core payment record even if proof upload is online-only or deferred.
- Customer detail and cobros screens expose enough sync status to validate pending/error states.
- UI validation accepts exactly the canonical payment methods.
- Page objects or stable selectors exist for the final E2E gold path.

## Validation

- `bun run --cwd packages/app typecheck`
- Targeted Playwright smoke for `/cobros`, `/cobros/nuevo`, customer detail, and sale detail if available.
- Manual responsive check at mobile viewport for modified screens.

## Risks or Notes

- Do not overbuild payment management UI if tests only require create/update/delete lifecycle; minimal edit/delete actions are enough if lifecycle coverage requires them.
- Payment proof staging can become a separate feature if it expands beyond the core migration.
