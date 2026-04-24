# File Sync Extension - Requirements

## Objective

Integrar el manejo de archivos (imágenes, comprobantes, documentos) como extensión nativa del framework drizzle-sync. El desarrollador declara campos de archivo en `sync.config.ts` y el framework genera automáticamente schemas, hooks, servicios y componentes de formulario que manejan upload offline/online de forma transparente.

## Scope

- **In scope**:
  - Configuración `fileFields` en `EntitySyncConfig`
  - Generación de Zod schemas que aceptan `File | string | undefined`
  - Generación de hooks (`useCreate`, `useUpdate`) que procesan campos File automáticamente
  - Generación de componentes `FormFileUpload` y `FormAssetPicker` para react-hook-form
  - Servicio de upload orquestado (`FileUploadService`) que reemplaza `file-queue`
  - Handler de sync para entidad `files` en backend
  - Migración/eliminación de `packages/app/app/lib/file-queue/`
  - Orquestación: subir archivos antes de enviar batch sync

- **Out of scope**:
  - Cambios al endpoint `/files/upload` existente (solo se usa)
  - Modificar tabla `assets` para que sea syncable (si no lo es actualmente)
  - Compresión de imágenes o generación de thumbnails
  - Sistema de firmas digitales o PDFs
  - Cambios al schema de `files` (ya existe)

## Functional Requirements

- `FR-001` - El framework debe permitir declarar `fileFields` en `EntitySyncConfig` con propiedades `entity` (`files` | `assets`) y opcionalmente `maxSize`, `accept`
- `FR-002` - El generador de schemas Zod debe generar campos `File | string | undefined` para campos declarados como `fileFields`
- `FR-003` - Los hooks generados (`useCreate<Entity>`, `useUpdate<Entity>`) deben detectar valores `File` en el payload y orquestar upload antes de encolar sync
- `FR-004` - Cuando online, el hook debe subir archivo via POST `/files/upload`, obtener `fileId`, y reemplazar `File` por `string` en el payload
- `FR-005` - Cuando offline, el hook debe guardar archivo en IndexedDB temporal con el ID generado, y encolar sync operation con el `fileId` real
- `FR-006` - El sync engine frontend debe escanear operations pendientes, subir archivos asociados antes de enviar el batch, y reemplazar referencias cuando estén subidos
- `FR-007` - Debe generarse un `FileUploadService` que maneje IndexedDB temporal, upload a R2, y estado de pending uploads
- `FR-008` - Debe generarse componente `FormFileUpload` integrado con react-hook-form `Controller` para campos de tipo `files`
- `FR-009` - Debe generarse componente `FormAssetPicker` integrado con react-hook-form `Controller` para campos de tipo `assets` (galería + upload)
- `FR-010` - La entidad `files` debe registrarse como syncable en backend con handler de sync generado
- `FR-011` - Debe existir un mecanismo para limpiar archivos temporales de IndexedDB cuando la sync operation se completa o se elimina
- `FR-012` - El estado de upload debe ser observable en los hooks (`isUploadingFile`, `uploadProgress`) para feedback UI

## Non-Functional Requirements

- `NFR-001` - El upload de archivos no debe bloquear el envío de otras operaciones sync que no tengan archivos
- `NFR-002` - Los archivos offline deben persistir entre sesiones del navegador (IndexedDB durable)
- `NFR-003` - El sistema debe soportar archivos hasta 5MB (igual que el sistema actual)
- `NFR-004` - El upload debe usar multipart/form-data, no base64 en JSON
- `NFR-005` - La extensión no debe aumentar significativamente el bundle size si no se usa `fileFields`
- `NFR-006` - Debe ser backward compatible: entidades sin `fileFields` deben funcionar igual que antes

## Acceptance Criteria

- Se puede crear un abono con `proofImageId: File` y el hook sube la imagen + crea el abono automáticamente
- Se puede crear un producto con `imageId: File` y el framework maneja el asset correctamente
- Offline: se selecciona archivo, se guarda en IndexedDB, al reconectar se sube y se sincroniza
- No existe código de `file-queue/` manual en la aplicación
- El schema Zod generado acepta `File | string | undefined` para campos de archivo
- Los formularios existentes (abonos, compras) se migran a usar los componentes generados

## Constraints

- La tabla `files` ya existe en PostgreSQL con `sync_status`, `sync_attempts`, `version`
- El endpoint `/files/upload` ya existe en backend
- `assets` puede no tener campos de sync (requiere verificación)
- Los IDs se generan en frontend con CUID2
- IndexedDB temporal es la única opción viable para almacenamiento offline de blobs

## Open Questions

- `OQ-001` - ¿La tabla `assets` tiene campos `sync_status`/`version` o necesita modificarse?
- `OQ-002` - ¿Qué pasa si un archivo temporal nunca se sube (operation cancelada)? ¿Debe haber garbage collection?
- `OQ-003` - ¿Los hooks deben exponer progreso de upload por campo o global?
