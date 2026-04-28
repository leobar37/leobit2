# T-004 Migrate Distribucion Handler to SyncHandlerBuilder

## Objective

Replace `DistribucionSyncHandler` (115 lines, extends `StatefulSyncHandler`) with a `SyncHandlerBuilder`-based factory function. This is the simplest handler since the distribucion transitions are all no-ops.

## Requirements Covered

- `FR-004`
- `FR-017`

## Dependencies

- `T-001` (audit)

## Files or Areas Involved

- `packages/backend/src/services/sync-handlers/DistribucionSyncHandler.ts` - Delete
- `packages/backend/src/services/sync-handlers/registry.ts` - Modify: add `createDistribucionHandler(deps)` factory
- `packages/backend/src/services/business/sync.service.ts` - Modify: replace `new DistribucionSyncHandler(distribucionRepo, distribucionService)` with `createDistribucionHandler(deps)`

## Actions

1. Create `createDistribucionHandler(deps: SyncEngineDeps)` in `registry.ts`:
   ```typescript
   export function createDistribucionHandler(deps: SyncEngineDeps): ISyncHandler {
     return new SyncHandlerBuilder("distribuciones")
       .withSchemas(distribucionCreateSchema, distribucionUpdateSchema)
       .withVersionConflictField("version")
       .withCustomCreate(async (ctx, entityId, data, tx) => {
         const parsed = distribucionCreateSchema.parse(data);
         await deps.distribucionService.createDistribucion(
           toRequestContext(ctx),
           {
             ...parsed,
             fecha: parsed.fecha ?? getToday(),
             items: parsed.items?.map(item => ({
               variantId: item.variantId,
               cantidadAsignada: item.cantidadAsignada,
               unidad: item.unidad,
             })),
           },
           toDbTx(tx)
         );
       })
       .withCustomUpdate(async (ctx, entityId, data, tx, operation) => {
         const parsed = distribucionUpdateSchema.parse(data);
         const updateData = pickDefinedFields(parsed, [
           "puntoVenta", "puntoVentaId", "notaCreacion",
           "notaCierre", "montoRecaudado", "fecha", "estado",
         ] as const);
         const updated = await deps.distribucionRepo.update(
           toRequestContext(ctx), entityId,
           updateData as Parameters<typeof deps.distribucionRepo.update>[2],
           toDbTx(tx)
         );
         if (!updated) throw new Error("Distribución no encontrada");
       })
       .withCustomDelete(async (ctx, entityId, _data, tx) => {
         await deps.distribucionRepo.delete(toRequestContext(ctx), entityId, toDbTx(tx));
       })
       .build() as ISyncHandler;
   }
   ```

2. Update `sync.service.ts`:
   - Remove `import { DistribucionSyncHandler }`
   - Add `import { createDistribucionHandler }` from registry
   - Replace instantiation with `createDistribucionHandler(deps)`

3. Delete `DistribucionSyncHandler.ts`

## Completion Criteria

- `DistribucionSyncHandler.ts` does not exist
- Distribuciones sync operations work via builder-based handler
- All distribucion fields are persisted as sent by frontend

## Validation

- `cd packages/backend && bun test`
- `cd packages/backend && bun run build`

## Risks or Notes

- Very low risk — this handler is essentially CRUD with a thin wrapper around `distribucionService.createDistribucion`
- The `pickDefinedFields` utility may need to remain if used here (check after T-003 determines its fate)
- The distribucion version field may not exist yet — check schema for `version` column. If missing, skip `withVersionConflictField` or add the column first.
