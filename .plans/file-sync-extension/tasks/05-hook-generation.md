# T-005 Generar Hooks con Procesamiento Automático de Archivos

## Objective

Extender los generadores de hooks (`useCreate`, `useUpdate`) para que detecten campos `File` en el payload, suban archivos automáticamente, y reemplacen `File` por `fileId` antes de encolar sync.

## Requirements Covered

- `FR-003`, `FR-004`, `FR-005`, `FR-012`, `NFR-001`, `NFR-006`

## Dependencies

- `T-003`, `T-004`

## Files or Areas Involved

- `packages/drizzle-sync/src/config/generators/hooks-generator.ts` - Modify - Incluir lógica de upload en hooks generados
- `packages/drizzle-sync/src/react/hooks.ts` - Modify - Agregar helpers `useFileProcessing()`
- `packages/drizzle-sync/src/client/create-sync-client-engine.ts` - Modify - Integrar FileUploadService con engine

## Actions

1. Crear helper `processFileFields(payload, fileFieldsConfig)`:
   ```typescript
   async function processFileFields(
     payload: Record<string, unknown>,
     fileFields: Record<string, FileFieldConfig>
   ): Promise<{ processed: Record<string, unknown>, uploaded: boolean }>
   ```
   - Itera sobre campos en `payload`
   - Si valor es `File`:
     - Genera `fileId` con `createId()`
     - Si online: `await fileUploadService.upload(fileId, file)`
     - Si offline: `await fileUploadService.saveTemp(fileId, file)`
     - Reemplaza `File` por `fileId` en payload
2. Extender hook generator para inyectar llamada a `processFileFields`:
   ```typescript
   export function useCreateAbono() {
     const service = useEngineService<AbonoService>("abonos");
     const fileService = useFileUploadService();
     
     return useMutation({
       mutationFn: async (input: CreateAbonoInput) => {
         // Procesar archivos antes de crear
         const processed = await processFileFields(input, FILE_FIELDS_CONFIG.abonos);
         return service.create(processed);
       }
     });
   }
   ```
3. Exponer estado de upload en el hook:
   ```typescript
   const { mutateAsync, isPending, fileUploadState } = useCreateAbono();
   // fileUploadState: { proofImageId: { status: 'uploading' | 'pending' | 'done', progress: number } }
   ```
4. Integrar con `useSyncEngineInit` para que al inicializar se procesen uploads pendientes
5. Asegurar que `useUpdate` también procesa archivos (ej: cambiar imagen de producto)

## Completion Criteria

- [ ] Hook `useCreateAbono` detecta `proofImageId: File` y sube automáticamente
- [ ] Hook `useUpdateAbono` detecta cambios de archivo y sube nuevo file
- [ ] Estado de upload es observable (`isUploading`, `progress`)
- [ ] Offline: archivo se guarda temporalmente, sync se encola con `fileId`
- [ ] Online: archivo se sube inmediatamente antes de encolar sync

## Validation

- Tests unitarios de hooks con mock de FileUploadService
- Test E2E: crear abono con imagen, verificar que aparece en backend
- Test offline: crear abono sin conexión, reconectar, verificar upload

## Risks or Notes

- El procesamiento de archivos debe ser atómico con respecto a la operación de sync. Si el upload falla, ¿se crea la entidad sin archivo o se falla todo?
  - **Decisión**: Si upload falla y estamos online, fallar la mutación completa. Si offline, encolar todo (archivo + entidad) y reintentar después.
- Considerar race conditions: si el usuario cambia rápidamente el archivo, cancelar upload anterior.
