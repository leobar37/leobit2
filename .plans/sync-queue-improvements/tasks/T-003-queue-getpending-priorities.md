# T-003 Move Priority Ordering Into Queue

## Objective

Refactorizar `SyncService.processPending()` para que use `queue.getPending()` en vez de SQL inline con ordenamiento por prioridad de entidad.

## Requirements Covered

- `FR-003`

## Dependencies

- T-001

## Files or Areas Involved

- `packages/app/app/lib/sync/queue/sync-queue.ts` — Modify — extender interfaz `ISyncQueue`
- `packages/app/app/lib/sync/queue/pg-sync-queue.ts` — Modify — implementar la lógica de prioridad dentro del queue
- `packages/app/app/lib/sync/sync-service.ts` — Modify — quitar el SQL inline de `processPending()` líneas 151-180
- `packages/shared/src/sync-config.ts` — Review — verificar que `ENTITY_PRIORITIES` esté disponible

## Actions

1. Definir `QueueOptions` en `types/index.ts`:
   ```typescript
   interface QueueOptions {
     includePriority?: boolean;
     groupBySyncGroupId?: boolean;
   }
   ```
2. En `ISyncQueue`, cambiar签名 de `getPending(limit: number)` a `getPending(limit: number, options?: QueueOptions)`
3. En `PgSyncQueue.getPending()`, aplicar la misma lógica de prioridad que está en `sync-service.ts:157-172`:
   - Orden: `customers=1, products=1, tags=1, customer_groups=1, suppliers=1, product_variants=2, customer_group_members=2, sales=3, abonos=3, purchases=3, distribuciones=3, else=4`
   - Luego por `created_at ASC`
4. Para el grouping por `sync_group_id`, mantenerlo en `SyncService` como paso de post-procesamiento (es lógica de batch, no de storage)
5. En `sync-service.ts`, reemplazar la query inline por `await this.queue.getPending(BATCH_SIZE, { includePriority: true })`
6. Actualizar `MockSyncQueue.getPending()` para que acepte el segundo parámetro

## Completion Criteria

- `processPending()` no tiene SQL de ordenamiento inline
- La lógica de prioridad vive en `PgSyncQueue.getPending()`

## Validation

- `bun test` pasa
- Ejecutar sync con operaciones de differentes entidades y verificar que se procesan en orden de prioridad

## Risks or Notes

- El grouping por `sync_group_id` se mantiene en `SyncService` porque requiere conocimiento del batch completo; moverlo al queue complicaría la abstracción
