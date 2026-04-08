# T-001 Deduplicate Dead-Letter Logic

## Objective

Eliminar la copia privada de `moveToDeadLetter` en `SyncService` y hacer que el servicio llame a `queue.moveToDeadLetter()` a través de la interfaz `ISyncQueue`.

## Requirements Covered

- `FR-001`

## Dependencies

- None

## Files or Areas Involved

- `packages/app/app/lib/sync/queue/pg-sync-queue.ts` — Modify — contiene la implementación canónica de `moveToDeadLetter`
- `packages/app/app/lib/sync/queue/sync-queue.ts` — Modify — verificar que la interfaz `moveToDeadLetter` coincida con el nuevo uso
- `packages/app/app/lib/sync/sync-service.ts` — Modify — eliminar el método privado `moveToDeadLetter` y sus llamadas
- `packages/app/app/lib/sync/testing/mocks.ts` — Modify — `MockSyncQueue` debe implementar la firma actualizada

## Actions

1. En `pg-sync-queue.ts`, auditar que `moveToDeadLetter(operation, error)` haga:
   - INSERT en `sync_dead_letter` con todos los campos necesarios
   - UPDATE `sync_operations SET status = 'dead_letter'`
2. Verificar que la interfaz `ISyncQueue.moveToDeadLetter` acepte los mismos parámetros (debe ser `SyncOperationRecord` + `error: string`)
3. En `sync-service.ts`, localizar el método privado `moveToDeadLetter` (línea ~817) y sus dos sitios de llamada en `markFailed`
4. Reemplazar cada llamada interna por `await this.queue.moveToDeadLetter(op, error)`
5. Eliminar el método privado `SyncService.moveToDeadLetter`
6. En `testing/mocks.ts`, actualizar `MockSyncQueue.moveToDeadLetter` si la firma cambió

## Completion Criteria

- `SyncService` no tiene método privado `moveToDeadLetter`
- Todas las llamadas a DLQ pasan por `queue.moveToDeadLetter()`
- Tests pasan

## Validation

- `grep -n "moveToDeadLetter" packages/app/app/lib/sync/sync-service.ts` muestra solo llamadas a `this.queue.moveToDeadLetter`
- `bun run build` en `packages/app` pasa

## Risks or Notes

- Si `SyncService.moveToDeadLetter` hacía algo extra (ej. self-heal check), ese logic debe moverse a un wrapper en `markFailed` antes de llamar al queue
