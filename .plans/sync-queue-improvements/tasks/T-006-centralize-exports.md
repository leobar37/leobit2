# T-006 Centralize ISyncQueue Exports

## Objective

Crear un barrel export en `types/index.ts` para `ISyncQueue` y sus tipos relacionados, de modo que `sync-service.ts` no importe directamente desde `queue/sync-queue.ts`.

## Requirements Covered

- `NFR-002`

## Dependencies

- T-001

## Files or Areas Involved

- `packages/app/app/lib/sync/types/index.ts` — Modify — agregar re-export de `ISyncQueue` y tipos del queue
- `packages/app/app/lib/sync/sync-service.ts` — Modify — cambiar import de `ISyncQueue`
- `packages/app/app/lib/sync/queue/sync-queue.ts` — Modify — el archivo original sigue siendo la fuente; solo cambia cómo se importa desde afuera
- `packages/app/app/lib/sync/testing/mocks.ts` — Review — verificar imports

## Actions

1. En `types/index.ts`, agregar:
   ```typescript
   export type { ISyncQueue } from "../queue/sync-queue";
   ```
2. En `sync-service.ts`, cambiar:
   ```typescript
   // Antes
   import type { ISyncQueue } from "./queue/sync-queue";
   // Después
   import type { ISyncQueue } from "./types";
   ```
3. Revisar `cleanup-service.ts`, `testing/mocks.ts` para verificar si también importan `ISyncQueue` directamente desde `queue/sync-queue.ts` y actualizarlos
4. Agregar también a `types/index.ts`:
   - `SyncOperationRecord` y `DeadLetterOperationRecord` (ya están en `sync-service.ts` re-export, pero deberían vivir en types)
   - `EnqueueParams`

## Completion Criteria

- `sync-service.ts` importa `ISyncQueue` desde `types/index.ts`
- No hay imports directos de `./queue/sync-queue` fuera del directorio `queue/`

## Validation

- `grep -rn "from.*queue/sync-queue" packages/app/app/lib/sync/` muestra solo líneas dentro del directorio `queue/`

## Risks or Notes

- No mover la interfaz real (que vive en `sync-queue.ts`); solo crear un re-export para desacoplar
- Verificar que no se creen imports circulares al agregar el re-export en `types/index.ts`
