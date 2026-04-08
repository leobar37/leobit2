# Sync Queue Improvements Requirements

## Objective

Limpiar la deuda técnica de la capa de cola de sincronización: eliminar duplicación, mejorar el algoritmo de coalescing, respetar la abstracción queue/servicio, y preparar el código para mantenimiento a largo plazo.

## Scope

- In scope: `PgSyncQueue`, `ISyncQueue`, `SyncService`, `MockSyncQueue`
- Out of scope: Backend sync handlers, pull service, base-service

## Functional Requirements

- `FR-001` — El método `moveToDeadLetter` existe una sola vez y es llamado desde `SyncService` a través de `ISyncQueue`
- `FR-002` — El coalescing hace merge profundo de arrays usando `id` como clave de fusión
- `FR-003` — `ISyncQueue.getPending()` acepta opciones de ordenamiento por prioridad de entidad
- `FR-004` — `PgSyncQueue` implementa `cleanupCompleted(olderThanDays: number)` que elimina filas con `status = 'completed'` y `updated_at` anterior a la fecha dada

## Non-Functional Requirements

- `NFR-001` — Ningún `console.log` en `pg-sync-queue.ts`; usar `syncLogger.debug/info`
- `NFR-002` — `ISyncQueue` y tipos relacionados se exportan desde `sync/types/index.ts` como barrel, no desde `queue/sync-queue.ts` directamente

## Acceptance Criteria

- `SyncService.moveToDeadLetter()` privado es eliminado; las llamadas van a `queue.moveToDeadLetter()`
- `getCoalescePlan()` hace merge profundo de arrays de items por `id`
- `queue.getPending(limit, options?)` reemplaza el SQL inline en `processPending()`
- `cleanupCompleted(7)` elimina operaciones completadas de más de 7 días
- `grep -n "console.log" pg-sync-queue.ts` retorna cero resultados
- `ISyncQueue` se importa en `sync-service.ts` desde `types/index.ts`

## Constraints

- No romper el contrato de `ISyncQueue` existente para `MockSyncQueue` en tests
- Backward compatible: las operaciones existentes en cola no se alteran

## Open Questions

- Ninguno — todas las decisiones fueron tomadas en el artifact de análisis
