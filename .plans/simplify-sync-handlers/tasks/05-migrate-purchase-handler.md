# T-005 Migrate Purchase Handler to SyncHandlerBuilder

## Objective

Replace `PurchaseSyncHandler` (154 lines, extends `StatefulSyncHandler`) with a `SyncHandlerBuilder`-based factory function. The key complexity is the inventory update logic (add stock on receive, remove stock on cancel) which currently lives in `setupPurchaseTransitions` via the state machine. This must be preserved as a `withPostOperation` or `withCustomUpdate` hook.

## Requirements Covered

- `FR-005`
- `FR-012` (inline inventory hook)
- `FR-014` (remove `purchaseMachine`)
- `FR-017`

## Dependencies

- `T-001` (audit)

## Files or Areas Involved

- `packages/backend/src/services/sync-handlers/PurchaseSyncHandler.ts` - Delete
- `packages/backend/src/services/sync-handlers/registry.ts` - Modify: add `createPurchaseHandler(deps)` factory
- `packages/backend/src/services/business/sync.service.ts` - Modify: replace `new PurchaseSyncHandler(deps)` with `createPurchaseHandler(deps)`
- `packages/backend/src/services/transitions/purchase.ts` - Delete (logic inlined into handler hook)
- `packages/backend/src/services/transitions/index.ts` - Modify: remove `purchaseMachine`, `setupPurchaseTransitions`, `PurchaseState`, `PurchaseWithItems` exports
- `packages/backend/src/lib/state-machine.ts` - Review: may need cleanup if only `staffInvitation` remains

## Actions

1. Create `createPurchaseHandler(deps: SyncEngineDeps)` in `registry.ts`:
   ```typescript
   export function createPurchaseHandler(deps: SyncEngineDeps): ISyncHandler {
     return new SyncHandlerBuilder("purchases")
       .withSchemas(purchaseCreateSchema, purchaseUpdateSchema)
       .withVersionConflictField("version")
       .withCustomCreate(async (ctx, entityId, data, tx) => {
         const parsed = purchaseCreateSchema.parse(data);
         if (!parsed.supplierId && parsed.status !== "draft") {
           throw new Error("supplierId es requerido para crear una compra");
         }
         if (parsed.supplierId) {
           const supplier = await deps.supplierRepo.findById(toRequestContext(ctx), parsed.supplierId);
           if (!supplier) throw new Error("Proveedor no encontrado");
         }
         await deps.purchaseRepo.create(
           toRequestContext(ctx),
           {
             id: entityId,
             supplierId: parsed.supplierId ?? null,
             purchaseDate: parsed.purchaseDate ?? toISODateString(now()),
             status: parsed.status ?? "draft",
             totalAmount: parsed.totalAmount ?? "0",
             notes: parsed.notes ?? undefined,
             receiptImageId: parsed.receiptImageId ?? null,
             invoiceNumber: parsed.invoiceNumber ?? null,
           },
           [],
           toDbTx(tx)
         );
       })
       .withCustomUpdate(async (ctx, entityId, data, tx, operation) => {
         const parsed = purchaseUpdateSchema.parse(data);
         const rctx = toRequestContext(ctx);
         const dbTx = toDbTx(tx);

         if (parsed.status) {
           const existing = await deps.purchaseRepo.findById(rctx, entityId, dbTx);
           if (!existing) throw new Error("Compra no encontrada");

           const previousStatus = existing.status as string;
           const newStatus = parsed.status;

           if (previousStatus !== newStatus) {
             await handlePurchaseStatusChange(rctx, existing, previousStatus, newStatus, deps, dbTx);
           }

           const updated = await deps.purchaseRepo.updateStatus(rctx, entityId, parsed.status, dbTx);
           if (!updated) throw new Error("Compra no encontrada");
         }
       })
       .withCustomDelete(async (ctx, entityId, _data, tx) => {
         await deps.purchaseRepo.delete(toRequestContext(ctx), entityId, toDbTx(tx));
       })
       .build() as ISyncHandler;
   }

   async function handlePurchaseStatusChange(
     ctx: RequestContext,
     purchase: PurchaseWithItems,
     previousStatus: string,
     newStatus: string,
     deps: SyncEngineDeps,
     tx: DbTransaction | undefined
   ): Promise<void> {
     if (previousStatus === "pending" && newStatus === "received") {
       for (const item of purchase.items) {
         const quantity = parseFloat(item.quantity);
         if (quantity > 0) {
           const variantId = item.variantId || item.productId;
           const existing = await deps.variantRepo.getInventory(ctx, variantId);
           if (existing) {
             const newQty = parseFloat(existing.quantity) + quantity;
             await deps.variantRepo.updateInventory(ctx, variantId, newQty.toString());
           } else {
             await deps.variantRepo.createInventory(ctx, { variantId, quantity: quantity.toString() });
           }
         }
       }
     } else if (previousStatus === "received" && newStatus === "cancelled") {
       for (const item of purchase.items) {
         const quantity = parseFloat(item.quantity);
         const variantId = item.variantId || item.productId;
         if (quantity > 0) {
           const existing = await deps.variantRepo.getInventory(ctx, variantId);
           if (existing) {
             const newQty = Math.max(0, parseFloat(existing.quantity) - quantity);
             await deps.variantRepo.updateInventory(ctx, variantId, newQty.toString());
           }
         }
       }
     }
   }
   ```

2. Update `sync.service.ts`:
   - Remove `import { PurchaseSyncHandler }`
   - Add `import { createPurchaseHandler }` from registry
   - Replace instantiation

3. Update `transitions/index.ts`:
   - Remove `import { setupPurchaseTransitions } from "./purchase"`
   - Remove `purchaseMachine` export and definition
   - Remove `PurchaseState`, `PurchaseWithItems` types
   - Remove `setupPurchaseTransitions(purchaseMachine, deps.variantRepo)` call from `initializeStateMachines`
   - Remove `StateMachineRegistry.register("purchase", purchaseMachine)` call

4. Delete `transitions/purchase.ts`

5. Delete `PurchaseSyncHandler.ts`

## Completion Criteria

- `PurchaseSyncHandler.ts` and `transitions/purchase.ts` do not exist
- Inventory is correctly added when purchase status changes to "received"
- Inventory is correctly removed when purchase status changes from "received" to "cancelled"
- No reference to `purchaseMachine` in `StateMachineRegistry`

## Validation

- `cd packages/backend && bun test`
- `cd packages/backend && bun run build`
- Manual test: sync a purchase with status change to "received", verify inventory updated

## Risks or Notes

- The `handlePurchaseStatusChange` function is essentially the same logic from `transitions/purchase.ts`, just inlined. This is acceptable because it's a server-side concern (inventory management) that can't be handled by the frontend.
- The `PurchaseWithItems` type is needed for the inventory hook (it reads `purchase.items`). This type may need to be defined locally in `registry.ts` or imported from schema.
- This is the only handler where server-side side effects are truly necessary (inventory is a server-owned resource in a multi-device scenario). Everything else can be frontend-driven.
