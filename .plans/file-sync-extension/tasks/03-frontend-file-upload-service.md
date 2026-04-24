# T-003 Crear FileUploadService en Frontend

## Objective

Crear un servicio centralizado en el frontend que reemplace `file-queue` y maneje almacenamiento temporal offline, upload a R2, y seguimiento de estado.

## Requirements Covered

- `FR-005`, `FR-007`, `NFR-002`, `NFR-003`, `NFR-004`

## Dependencies

- `T-001`

## Files or Areas Involved

- `packages/drizzle-sync/src/client/` - Create - `file-upload-service.ts`
- `packages/drizzle-sync/src/client/storage/` - Create - `file-storage.ts` (IndexedDB)
- `packages/app/app/lib/file-queue/` - Review/Delete - Reemplazar por nuevo servicio

## Actions

1. Crear `FileUploadService` con API:
   ```typescript
   interface FileUploadService {
     // Guardar archivo temporalmente (offline o preparación)
     saveTemp(fileId: string, file: File, metadata: FileUploadMetadata): Promise<void>;
     // Subir archivo a servidor (POST /files/upload)
     upload(fileId: string): Promise<{ id: string; url?: string }>;
     // Verificar si un fileId ya está subido
     isUploaded(fileId: string): Promise<boolean>;
     // Obtener archivo temporal
     getTemp(fileId: string): Promise<File | null>;
     // Eliminar temporal
     removeTemp(fileId: string): Promise<void>;
     // Obtener todos los pendientes
     getPendingUploads(): Promise<PendingFileUpload[]>;
   }
   ```
2. Implementar almacenamiento en IndexedDB:
   - Store: `sync_files_temp`
   - Estructura: `{ id, blob, filename, mimeType, sizeBytes, entityType, fieldName, createdAt }`
   - Usar `idb` o API nativa de IndexedDB
3. Implementar upload usando `FormData` + `fetch`:
   - Endpoint: `POST /files/upload`
   - Header: `X-File-ID: <fileId>` (para que backend use el ID generado en frontend)
   - Response: `{ id, filename, mimeType, sizeBytes }`
4. Integrar con `getDatabase()` de drizzle-sync para acceso al estado de sync
5. Añadir manejo de errores y reintentos con backoff exponencial
6. Exponer estado observables: `isUploading(fileId)`, `uploadProgress(fileId)`

## Completion Criteria

- [ ] `FileUploadService` puede guardar archivos en IndexedDB
- [ ] `FileUploadService` puede subir archivos a `/files/upload`
- [ ] `FileUploadService` puede verificar estado de upload
- [ ] Los archivos persisten en IndexedDB entre sesiones
- [ ] El servicio maneja errores de red y reintentos

## Validation

- Tests unitarios en `packages/drizzle-sync` con mock de IndexedDB
- Test manual: seleccionar archivo, desconectar, reconectar, verificar upload automático

## Risks or Notes

- El servicio debe funcionar tanto dentro como fuera del contexto React (para poder usarse en hooks y en sync engine)
- Considerar límites de almacenamiento de IndexedDB (~50MB+ dependiendo del navegador)
- No duplicar lógica con `file-queue` existente; esta es la versión framework-native
