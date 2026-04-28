# T-005 Atomic Sales And Payment Services

## Objective

Make local sales, sale item, and abono write paths atomic, grouped, and balance-consistent for offline-first operation.

## Requirements Covered

- `FR-005`
- `FR-006`
- `FR-008`
- `NFR-002`
- `NFR-004`

## Dependencies

- `T-003`
- `T-004`

## Files or Areas Involved

- `packages/app/app/lib/services/sale-service.ts` - Modify - Wrap compound sales/item operations in local transaction or equivalent atomic unit.
- `packages/app/app/lib/services/payment-service.ts` - Modify - Queue grouped abono operations and align balance behavior.
- `packages/app/app/lib/services/base-service.ts` - Review/Modify - Use grouping/correlation support from `T-003`.
- `packages/app/app/lib/sync/generated/services.ts` - Review/Regenerate - Ensure generated base operations still work with new enqueue metadata.
- `packages/app/app/hooks/use-sales.ts` - Review/Modify - Ensure mutations call the atomic service paths.
- `packages/app/app/hooks/use-payments.ts` - Review/Modify - Ensure abono create/update/delete invalidate correct balance sources.
- `packages/app/app/hooks/use-accounts-receivable.ts` - Review - Confirm receivable calculations use the chosen balance source of truth.
- `packages/app/app/lib/utils.ts` - Review - Reuse existing money helpers for persisted values.

## Actions

1. Define the balance source of truth for the migrated flow: either persisted sale balances are updated by abonos, or current debt is computed from sales minus abonos.
2. Update sale creation with items so local sale row, item rows, and their sync operations are committed atomically or rolled back together.
3. Update delivery finalization so item adjustments, sale total/balance updates, and queued operations cannot partially apply.
4. Ensure sale item add/update/delete hot paths update parent sale totals and local versions consistently with backend conflict strategy.
5. Update payment create/update/delete to use canonical entity name, grouping/correlation metadata, and the chosen balance source of truth.
6. If abonos are tied to a specific sale, ensure `relatedSaleId` is populated and queued when the UI passes it.
7. Add local service tests for failed mid-operation behavior, grouped operations, and balance calculations.

## Completion Criteria

- `createWithItems` cannot leave a sale without all intended items or queue operations when an item insert/queue fails.
- `finalizeDelivery` cannot leave partial item adjustments without the sale update or corresponding queue operations.
- Abono creation updates or invalidates the chosen balance source consistently for customer detail, sale detail, and cobros.
- Local queued operations for compound sale flows share grouping/correlation metadata.
- Tests cover at least one rollback/failure scenario for compound local writes.

## Validation

- `bun run --cwd packages/app test`
- `bun run --cwd packages/app typecheck`
- Targeted tests for `SaleService` and `PaymentService` if service test harness exists or is added.
- Manual or automated inspection of queued operations after a sample local sale+items+abono flow.

## Risks or Notes

- PGlite/Drizzle transaction APIs must be used in the style already supported by the app's engine/db adapter.
- If generated service methods queue immediately and cannot participate in a transaction, this task may need a small internal service helper that writes rows and queue rows within one lower-level transaction.
- Balance semantics must not double-count if both sale balances and abono aggregates are used by different screens.
