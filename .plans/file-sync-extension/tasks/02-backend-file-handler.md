# T-002 Crear Handler de Sync para Entidad files

## Objective

Registrar la entidad `files` como syncable en backend con su handler de sync, schema Zod, y repositorio.

## Requirements Covered

- `FR-010`

## Dependencies

- `T-001`

## Files or Areas Involved

- `packages/backend/src/sync.config.ts` - Modify - Añadir entidad `files` con `syncable: true`
- `packages/backend/src/services/sync/registry.ts` - Modify - Crear `createFileHandler()` y registrarlo
- `packages/backend/src/services/sync/handlers/` - Create - `file.handler.ts` con handler de files
- `packages/backend/src/db/schema/files.ts` - Review - Confirmar schema completo
- `packages/shared/src/sync-config.ts` o schema - Modify - Agregar `files` a entidades syncable

## Actions

1. Añadir entidad `files` a `sync.config.ts`:
   ```typescript
   files: {
     table: files,
     syncable: true,
     conflictResolver: "version-based",
     fields: ["id", "business_id", "filename", "storage_path", "mime_type", "size_bytes"],
     autoFields: true,
   }
   ```
2. Crear schema Zod para create/update de files (si no existe):
   ```typescript
   const createFileSchema = z.object({
     id: z.string(),
     filename: z.string(),
     storagePath: z.string(),
     mimeType: z.string(),
     sizeBytes: z.number(),
   });
   ```
3. Crear `FileSyncHandler` que extienda `BaseSyncHandler`:
   - `validateBusinessRules`: verificar que `business_id` coincide con contexto
   - `execute`: create/update/delete en tabla `files`
   - No maneja contenido binario (solo metadata)
4. Registrar handler en `registry.ts` bajo `createFileHandler(deps)`
5. Generar migración si es necesario para asegurar que `files` tiene `sync_status`, `sync_attempts`, `version`

## Completion Criteria

- [ ] Entidad `files` aparece en `sync.config.ts`
- [ ] Handler `createFileHandler` está registrado y funciona
- [ ] POST `/sync/batch` puede procesar operaciones de tipo `files`
- [ ] El backend inserta/actualiza registros en tabla `files` correctamente

## Validation

- `bun test` en backend para tests de sync handlers
- Test manual: enviar batch con operación `files:create` y verificar inserción

## Risks or Notes

- El handler de files solo sincroniza metadata (id, filename, etc.), no el contenido binario. El contenido ya está en R2.
- Si la tabla `files` no tiene `business_id` como FK, necesita filtro por tenant.
