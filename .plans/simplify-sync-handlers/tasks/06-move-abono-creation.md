# T-006 Move Abono Initial Payment Creation to Frontend

## Objective

Move the creation of the initial abono (payment) for credit sales from the backend `SaleSyncHandler.handleCreate` to the frontend `SaleService.createWithItems()`. The frontend will enqueue both `sales/create` and `abonos/create` as correlated sync operations, making the abono visible locally immediately. This is the clearest example of the cuaderno model: if the seller wrote down a credit sale with an advance payment, both the sale and the payment must exist in the local notebook before internet returns.

## Requirements Covered

- `FR-006`
- `FR-015`
- `FR-019`
- `FR-020`
- `FR-021`

## Dependencies

- `T-003` (sales handler no longer creates abono automatically)

## Files or Areas Involved

- `packages/app/app/lib/services/sale-service.ts` - Modify: add `abonos/create` operation in `createWithItems`
- `packages/app/app/lib/services/sale-service.ts` - Modify: also add in `confirm()` for instant_sales that become active with payment
- `packages/app/app/lib/services/payment-service.ts` - Review: ensure `createInBatch` or equivalent is available for correlated operations
- `packages/app/app/hooks/use-sales.ts` - Review: may need to invalidate abono queries on sale creation
- `packages/backend/src/services/repository/payment.repository.ts` - Modify: remove or simplify `createInitialPayment` method
- `packages/backend/src/services/sync-handlers/SaleSyncHandler.ts` - Already deleted in T-003

## Actions

1. In `SaleService.createWithItems()`, after creating the sale, add abono creation:
   ```typescript
   await this.engine.batch(async (ctx) => {
     // 1. Create sale (existing code)
     await this.generatedSalesService.createInBatch(ctx, { ...saleData }, { ...syncOpts });

     // 2. Create items with skipSync (existing code)
     for (const item of itemRows) {
       await this.generatedItemsService.createInBatch(ctx, { ...itemData }, { skipSync: true, ... });
     }

     // 3. NEW: Create initial abono if credit sale with payment
     if (saleInput.saleType === "credito" && amountPaid > 0 && saleInput.customerId) {
       const abonoId = this.generateId();
       await this.generatedAbonosService.createInBatch(ctx, {
         customerId: saleInput.customerId,
         sellerId,
         amount: amountPaid.toString(),
         paymentMethod: saleInput.paymentMode === "yape" ? "yape" :
                        saleInput.paymentMode === "plin" ? "plin" : "efectivo",
         referenceNumber: `init-sale:${saleId}`,
         relatedSaleId: saleId,
         notes: "Abono inicial registrado en la venta",
       }, {
         id: abonoId,
         idempotencyKey: `abono:create:${abonoId}`,
         correlationId, // Same correlationId as the sale
       });
     }
   });
   ```

2. In `SaleService.confirm()` (for instant_sales becoming active), check if there's a similar payment-creation need. Currently the backend's `handleUpdate` with `status: "active"` doesn't create abonos, so this may not be needed. Verify.

3. Remove `createInitialPayment` from `payment.repository.ts`:
   - This method uses `onConflictDoNothing` on `referenceNumber` for idempotency
   - The generic abono handler in `registry.ts` doesn't use this method — it uses `paymentRepo.create` directly
   - The `referenceNumber: "init-sale:${saleId}"` pattern will still work for deduplication via the abono handler's idempotency key

4. Verify that `PaymentService` frontend has a `createInBatch` method available (or the generated `AbonosService.createInBatch`):
   - The `generatedAbonosService` should be accessible from the engine via `engine.getService("abonos")`

5. Update `useCreateSale` hook to also invalidate abono-related queries on success

6. Add a local cuaderno invariant to the service-level tests or manual QA checklist:
   - After creating a credit sale with initial payment while offline, the local sales list, customer debt, and abono history must all be coherent before sync succeeds.

## Completion Criteria

- When a credit sale with initial payment is created offline, both the sale and the abono appear in PGlite immediately
- The local cuaderno is coherent immediately: the sale total, paid amount, balance due, and abono history agree before sync succeeds
- The `abonos/create` sync operation has the same `correlationId` as the `sales/create` operation
- The `createInitialPayment` repository method no longer exists
- After sync, the backend has both the sale and the abono persisted
- The `referenceNumber: "init-sale:${saleId}"` pattern prevents duplicate abonos on retry

## Validation

- `cd packages/app && bun test` (unit tests for SaleService)
- Manual test: create credit sale with S/50 advance offline, check PGlite has both sale and abono
- Manual test: while still offline, open customer debt/abono views and verify they reflect the S/50 payment
- Manual test: sync, verify backend has both records
- `cd packages/backend && bun run build`

## Risks or Notes

- The `AbonosService` generated handler already has `withPreValidation` that checks if the customer has outstanding debt and if the payment exceeds it. For an initial payment on a new sale, the customer may not have debt yet (the sale hasn't synced). The `withPreValidation` hook needs to be reviewed — it may reject the abono if `balanceDue <= 0` at the time of sync. Solution: the pre-validation should allow abonos with `referenceNumber` starting with `init-sale:` to bypass the balance check, OR the sales handler should process before abonos (FK ordering ensures this if configured).
- The `PaymentService` custom frontend service wraps `AbonosService` with additional logic (customer balance update). Check if `createInBatch` is exposed there or needs to be added.
- Idempotency: the `abono:create:${abonoId}` idempotency key ensures no duplicates. The `referenceNumber: "init-sale:${saleId}"` also provides application-level deduplication.
