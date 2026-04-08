# T-005 Replace console.log with syncLogger

## Objective

Reemplazar todos los `console.log` en `pg-sync-queue.ts` por `syncLogger.debug/info` para permitir control de logs en producción.

## Requirements Covered

- `NFR-001`

## Dependencies

- T-001

## Files or Areas Involved

- `packages/app/app/lib/sync/queue/pg-sync-queue.ts` — Modify — 3 occurrences de `console.log` en líneas 94, 129, 152

## Actions

1. Importar `syncLogger` desde `../sync-logger` al inicio de `pg-sync-queue.ts`
2. Reemplazar cada `console.log`:
   - `console.log(\`[PgSyncQueue] Enqueuing operation:\`...)` → `syncLogger.debug('[PgSyncQueue] Enqueuing operation', ...params)`
   - `console.log(\`[PgSyncQueue] Cancelled coalesced operations...\`)` → `syncLogger.debug('[PgSyncQueue] Cancelled coalesced', ...params)`
   - `console.log(\`[PgSyncQueue] Coalesced...\`)` → `syncLogger.debug('[PgSyncQueue] Coalesced', ...params)`
3. Verificar que `syncLogger` tenga los métodos `.debug()` y `.info()` disponibles (revisar `sync-logger.ts`)

## Completion Criteria

- `grep -n "console.log" pg-sync-queue.ts` retorna cero líneas

## Validation

- `grep -rn "console.log" packages/app/app/lib/sync/queue/` retorna cero resultados
- Bun build pasa

## Risks or Notes

- Si `syncLogger` no tiene `.debug()`, usar `.info()` para logs de enqueue y coalescing (no son críticos para debugging en producción)
