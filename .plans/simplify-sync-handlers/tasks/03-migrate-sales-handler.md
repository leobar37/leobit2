# T-003 Migrate Sales Handler to SyncHandlerBuilder

## Objective

Replace `SaleSyncHandler` (240 lines, extends `StatefulSyncHandler`) with a `SyncHandlerBuilder`-based factory function in `registry.ts`. The new handler treats sync operations as pure "parse payload → persist via repo" operations, removing all state-transition branching and business logic from the backend.

This preserves the cuaderno model: the frontend records the complete sale fact locally first, and the backend only persists the already-written notebook entry.

## Requirements Covered

- `FR-001` (version conflict via `withVersionConflictField`)
- `FR-002` (accept any valid update payload, no status branching)
- `FR-003` (custom create with embedded items)
- `FR-016` (remove `confirmPreOrder`/`deliverPreOrder` repo methods)
- `FR-017` (register via factory in `sync.service.ts`)
- `FR-019` (document cuaderno boundary)
- `FR-020` (seller-visible sale facts are local before sync)
- `FR-021` (backend does not create hidden day-to-day records)

## Dependencies

- `T-002` (snapshots removed, so handler doesn't need to create them)

## Files or Areas Involved

- `packages/backend/src/services/sync-handlers/SaleSyncHandler.ts` - Delete
- `packages/backend/src/services/sync-handlers/registry.ts` - Modify: add `createSaleHandler(deps)` factory
- `packages/backend/src/services/business/sync.service.ts` - Modify: replace `new SaleSyncHandler(saleRepo, paymentRepo)` with `createSaleHandler(deps)`
- `packages/backend/src/services/repository/sale.repository.ts` - Modify: remove `confirmPreOrder`, `deliverPreOrder` methods; remove `updateWithItems` if items are handled via separate `sale_items` operations
- `packages/backend/src/services/sync-handlers/schemas/index.ts` - Modify: simplify `saleCreateSchema` (remove item-embedding refinements if items become separate ops) or keep for backward compat
- `packages/backend/src/services/sync-handlers/core/patch-utils.ts` - Review: if only used by SaleSyncHandler, delete after migration

## Actions

1. Create `createSaleHandler(deps: SyncEngineDeps)` in `registry.ts` using `SyncHandlerBuilder`:
   ```typescript
   export function createSaleHandler(deps: SyncEngineDeps): ISyncHandler {
     return new SyncHandlerBuilder("sales")
       .withSchemas(saleCreateSchema, saleUpdateSchema)
       .withVersionConflictField("version")
       .withPayloadEnricher((ctx, payload) => ({
         ...payload,
         sellerId: (payload.sellerId as string) || ctx.businessUserId,
       }))
       .withCustomCreate(async (ctx, entityId, data, tx) => {
         const parsed = saleCreateSchema.parse(data);
         const saleData = {
           ...parsed,
           id: entityId,
           amountPaid: parsed.amountPaid ?? (parsed.saleType === "contado" ? parsed.totalAmount : "0"),
           balanceDue: parsed.saleType === "credito"
             ? subtract(parsed.totalAmount, parsed.amountPaid ?? "0")
             : "0",
           items: parsed.items?.map(item => ({ ...item })),
         };
         await deps.saleRepo.create(toRequestContext(ctx), saleData, toDbTx(tx));
         // NO automatic abono creation - frontend handles this
       })
       .withCustomUpdate(async (ctx, entityId, data, tx, operation) => {
         const parsed = saleUpdateSchema.parse(data);
         const clientVersion = operation?.localVersion ?? parsed.version ?? 0;
         const updateData = { ...parsed, version: clientVersion + 1 };
         delete updateData.items; // Items handled via sale_items handler

         if (Array.isArray(parsed.items) && parsed.items.length > 0) {
           await deps.saleRepo.updateWithItems(
             toRequestContext(ctx), entityId,
             { ...updateData, items: parsed.items },
             toDbTx(tx), clientVersion
           );
         } else {
           await deps.saleRepo.update(
             toRequestContext(ctx), entityId, updateData,
             toDbTx(tx), clientVersion
           );
         }
       })
       .withCustomDelete(async (ctx, entityId, _data, tx) => {
         await deps.saleRepo.delete(toRequestContext(ctx), entityId, toDbTx(tx));
       })
       .build() as ISyncHandler;
   }
   ```

2. Update `sync.service.ts` handler registration:
   - Remove `import { SaleSyncHandler }` 
   - Add `import { createSaleHandler }` from registry
   - Replace `new SaleSyncHandler(saleRepo, paymentRepo)` with `createSaleHandler(deps)`

3. Remove `confirmPreOrder` and `deliverPreOrder` from `sale.repository.ts`:
   - These methods create snapshots (already removed in T-002) and do version-conditional updates
   - The `withVersionConflictField` on the handler + `saleRepo.update` with `expectedVersion` parameter covers this

4. Simplify `handleUpdate` logic:
   - Remove all `if (parsed.status === "active" && existing.status === "draft")` branches
   - The frontend sends the complete update payload including `status`, `cancelledAt`, `cancelReason`, etc.
   - A single `saleRepo.update(ctx, id, updateData, tx, expectedVersion)` call handles all cases
   - Treat the update as a replicated cuaderno entry, not as a backend command that decides what the sale should become

5. Delete `SaleSyncHandler.ts`

6. If `patch-utils.ts` (`mergeDefined`, `pickDefinedFields`) is only used by `SaleSyncHandler`, delete it. Check other consumers first.

## Completion Criteria

- `SaleSyncHandler.ts` does not exist
- `sync.service.ts` imports `createSaleHandler` from registry
- Sales sync operations (create, update, delete) work via `SyncHandlerBuilder` handler
- Version conflict detection works via `withVersionConflictField`
- No state-transition branching logic exists in the sales handler
- Sales create/update/delete sync does not create user-visible records that are absent from local PGlite

## Validation

- `cd packages/backend && bun test`
- `cd packages/backend && bun run build`
- Manual test: create a sale via sync, update status, check version conflicts

## Risks or Notes

- The `saleCreateSchema` has `.refine()` validators that check total = sum of items, credito requires customer, etc. These are still valuable server-side validation even with the generic handler. Keep them in the schema.
- The `handleUpdate` currently has a "create-if-not-found" path (lines 101-128) for when the sale doesn't exist yet. The generic handler's `withCustomUpdate` should preserve this pattern or we decide that create-if-not-found is unnecessary (the frontend should always create before update).
- The `updateWithItems` method does a complex "sync items" operation (add/update/delete items based on ID matching). This is the hardest part to simplify. Consider whether the frontend should always use separate `sale_items` operations instead of embedding items in `sales/update`.
- A future cleanup should prefer explicit `sale_items` sync operations over embedded sale item arrays whenever possible, because notebook entries are easier to reason about when each entity has its own local operation.
