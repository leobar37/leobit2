# T-007 Integrar Upload con Sync Engine (Orquestación Pre-Batch)

## Objective

Integrar el `FileUploadService` con el sync engine para que antes de enviar un batch, se suban todos los archivos pendientes asociados a las operations.

## Requirements Covered

- `FR-006`, `FR-011`, `NFR-001`

## Dependencies

- `T-003`, `T-005`

## Files or Areas Involved

- `packages/drizzle-sync/src/pglite/push-service.ts` - Modify - Integrar upload de archivos antes de batch
- `packages/drizzle-sync/src/pglite/batch-processor.ts` - Modify - Escanear operations por file references
- `packages/drizzle-sync/src/client/create-sync-client-engine.ts` - Modify - Registrar FileUploadService en engine

## Actions

1. Extender `PushSyncService` para escanear operations pendientes:
   ```typescript
   private async uploadPendingFiles(operations: SyncOperation[]): Promise<void> {
     const fileIds = this.extractFileReferences(operations);
     for (const fileId of fileIds) {
       if (await fileUploadService.isUploaded(fileId)) continue;
       const file = await fileUploadService.getTemp(fileId);
       if (file) {
         await fileUploadService.upload(fileId);
       }
     }
   }
   ```
2. Implementar `extractFileReferences`: buscar en payloads de operations valores que sean `fileId` (strings de 24+ chars, formato CUID2) y estén referenciados en `sync_files_temp` de IndexedDB
3. Orquestar el flujo en `performPush()`:
   ```
   1. Obtener operations pendientes
   2. Para cada operation: extraer fileIds referenciados
   3. Subir archivos pendientes (upload a R2)
   4. Una vez todos subidos: enviar batch normal
   ```
4. Si un archivo falla al subir:
   - Marcar operation como failed
   - No enviar batch parcial (todo o nada para operations con archivos)
   - Reintentar en próximo ciclo de sync
5. Limpiar archivos temporales cuando:
   - Operation se marca como `synced`
   - Operation se elimina (cancelación)
   - Implementar garbage collection periódico
6. Asegurar que operations sin archivos no se vean afectadas (no bloquear batch por archivos de otras operations)

## Completion Criteria

- [ ] Antes de enviar batch, el engine sube archivos pendientes
- [ ] El batch solo se envía cuando todos los archivos están subidos
- [ ] Si un archivo falla, la operation se retrasa (no se envía batch incompleto)
- [ ] Archivos temporales se limpian después de sync exitoso
- [ ] Operations sin archivos no se ven afectadas por delays de upload

## Validation

- Tests unitarios de `PushSyncService` con mocks
- Test manual: crear entidad con archivo offline, reconectar, verificar orden correcto

## Risks or Notes

- El orden es crítico: archivo debe subirse ANTES de que el backend procese la operation que lo referencia. Esto se logra subiendo archivos antes de enviar el batch.
- Si hay muchos archivos pendientes, el upload puede tardar. Considerar batch upload paralelo.
- Garbage collection: archivos huérfanos en IndexedDB deben limpiarse periódicamente.
