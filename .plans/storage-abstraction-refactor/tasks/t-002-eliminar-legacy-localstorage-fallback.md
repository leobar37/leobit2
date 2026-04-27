# T-002 — Eliminar Legacy localStorage Fallback

## Objective

Quitar los paths en `schema-hash.ts` y `database-init.ts` que hacen `typeof localStorage !== "undefined" ? localStorage : undefined` como fallback implícito cuando no se pasa un `StorageAdapter`. Estos paths existen por backward compatibility pero son la fuente del problema — si el consumer no pasa storage explicitado, la librería usa `localStorage` sin que sea visible.

## Scope

**In:**
- `packages/drizzle-sync/src/client/schema-hash.ts`
- `packages/drizzle-sync/src/client/database-init.ts`

**Out:**
- Ambas funciones solo usan `StorageAdapter`. El fallback legacy se elimina.

## Requirements

- R-002

## Steps

1. **Auditar usages de las funciones sueltas en el monorepo** antes de tocar código:
   ```
   grep -rn "hasSchemaChanged\|saveSchemaHash\|clearSchemaHash\|initPgliteDatabase\|resetDatabase" \
     packages/app/ --include="*.ts" --include="*.tsx"
   ```
   Confirmar que todos los calls pasan `StorageAdapter` o `storageAdapter`, no options legacy.
   Si hay calls sin adapter, documentarlos — son los que van a romper con este cambio.

2. **Refactorizar `schema-hash.ts`**

   La función `hasSchemaChanged` tiene overload:
   ```typescript
   // ANTES: acepta options legacy O StorageAdapter
   hasSchemaChanged(sql, optionsOrAdapter)
   ```
   Cambiar a solo:
   ```typescript
   // DESPUÉS: solo StorageAdapter
   hasSchemaChanged(sql: string, adapter: StorageAdapter): Promise<{...}>
   ```
  同理 para `saveSchemaHash(hash, optionsOrAdapter)` → `saveSchemaHash(hash, adapter: StorageAdapter)` y `clearSchemaHash(optionsOrAdapter)` → `clearSchemaHash(adapter: StorageAdapter)`.

   Eliminar el branch legacy que hace `typeof localStorage !== "undefined" ? localStorage : undefined` (líneas ~54, ~93, ~123).

3. **Refactorizar `database-init.ts`**

   En `doInit()`, la destructuración tiene:
   ```typescript
   storage = typeof localStorage !== "undefined" ? localStorage : undefined,
   storageAdapter,
   ```
   Cambiar para que si `storageAdapter` no está definido, cree uno con `createStorageAdapter()` que internamente usa `createLocalStorageBackend()` (que ya tiene el fallback no-op para SSR):
   ```typescript
   storageAdapter: storageAdapter ?? createStorageAdapter(config.storage),
   ```
   (donde `config.storage` es el campo `StorageConfig` en `DatabaseInitConfig`).

   Lo mismo para `resetDatabase()` (~línea 322): crear el adapter con `createStorageAdapter()` si no se provee.

   Eliminar el campo `storage?: Storage` de `DatabaseInitConfig` ya que no será necesario — se usa `storageAdapter` únicamente.

4. **Verificar que nada rompe en browser**

   La cadena `createStorageAdapter(config.storage)` → `createLocalStorageBackend()` → `localStorage` sigue funcionando igual para el browser. El cambio es solo que ya no hay dos paths paralelos (adapter vs legacy).

5. **Actualizar JSDoc de las funciones** para indicar que requieren `StorageAdapter`

## Validation

- `schema-hash.ts` no tiene `typeof localStorage` en ninguna línea
- `database-init.ts` no tiene `typeof localStorage` en ninguna línea
- Las funciones `hasSchemaChanged`, `saveSchemaHash`, `clearSchemaHash` tienen firma que solo acepta `StorageAdapter`
- `DatabaseInitConfig` no tiene campo `storage?: Storage` (solo `storageAdapter`)
- `packages/app` compila sin errores después del cambio
