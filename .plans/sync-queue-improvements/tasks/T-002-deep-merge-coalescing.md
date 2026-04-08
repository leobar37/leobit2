# T-002 Deep Merge for Coalescing

## Objective

Reemplazar el merge superficial `{ ...a, ...b }` en `getCoalescePlan()` con un merge profundo que fusione arrays de items por su campo `id`.

## Requirements Covered

- `FR-002`

## Dependencies

- T-001

## Files or Areas Involved

- `packages/app/app/lib/sync/queue/pg-sync-queue.ts` — Modify — `getCoalescePlan()` líneas 26-63, función `deepMerge` o `mergeById`

## Actions

1. Crear función `deepMerge(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown>` que:
   - Para cada key en `b`, si `a[key]` y `b[key]` son ambos arrays, llamar a `mergeArrayById(a[key], b[key])`
   - Si no, hacer spread shallow merge
2. Crear función `mergeArrayById<T extends {id: string}>(a: T[], b: T[]): T[]` que:
   - Iterar sobre `b`; para cada item, si existe en `a` por `id`, reemplazar en resultado; si no existe, hacer append
   - Mantener el orden original de `a` + nuevos items de `b`
3. En `getCoalescePlan()`, cambiar el caso merge para usar `deepMerge(existingPayload, incoming.data)`
4. Agregar tests unitarios para `deepMerge` y `mergeArrayById` cubriendo:
   - Arrays vacíos
   - Items con mismo id (reemplazo)
   - Items con id nuevo (append)
   - Casos donde uno no es array (fallback shallow)

## Completion Criteria

- `getCoalescePlan()` usa `deepMerge` para el caso type === "merge"
- Tests unitarios pasan cubriendo los paths principales

## Validation

- `bun test` en `packages/app` pasa
- Verificar manualmente: enqueue create con `items: [{id: '1', qty: 2}]` + update con `items: [{id: '1', qty: 5}]` resulta en `items: [{id: '1', qty: 5}]`

## Risks or Notes

- No cambiar el comportamiento para entities sin arrays en payload (shallow es correcto ahí)
- El campo `id` como clave de fusión es una decisión de diseño; documentar que esta es la convención
