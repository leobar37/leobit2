# File Sync Extension Task Index

## Summary

- Mode: Structured
- Slug: `file-sync-extension`
- Requirements File: `requirements.md`
- Checklist File: `checklist.json`

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-001` | `tasks/01-config-api.md` |
| `FR-002` | `tasks/04-schema-generation.md` |
| `FR-003` | `tasks/05-hook-generation.md` |
| `FR-004` | `tasks/05-hook-generation.md` |
| `FR-005` | `tasks/03-frontend-file-upload-service.md`, `tasks/05-hook-generation.md` |
| `FR-006` | `tasks/07-sync-integration.md` |
| `FR-007` | `tasks/03-frontend-file-upload-service.md` |
| `FR-008` | `tasks/06-form-components.md` |
| `FR-009` | `tasks/06-form-components.md` |
| `FR-010` | `tasks/02-backend-file-handler.md` |
| `FR-011` | `tasks/07-sync-integration.md` |
| `FR-012` | `tasks/05-hook-generation.md` |
| `NFR-001` | `tasks/07-sync-integration.md` |
| `NFR-002` | `tasks/03-frontend-file-upload-service.md` |
| `NFR-003` | `tasks/03-frontend-file-upload-service.md` |
| `NFR-004` | `tasks/03-frontend-file-upload-service.md` |
| `NFR-005` | `tasks/04-schema-generation.md` |
| `NFR-006` | `tasks/05-hook-generation.md` |

## Task List

| Task ID | File | Purpose | Dependencies |
| --- | --- | --- | --- |
| `T-001` | `tasks/01-config-api.md` | Extender EntitySyncConfig con fileFields | none |
| `T-002` | `tasks/02-backend-file-handler.md` | Registrar files como entidad syncable con handler | T-001 |
| `T-003` | `tasks/03-frontend-file-upload-service.md` | Crear FileUploadService que reemplace file-queue | T-001 |
| `T-004` | `tasks/04-schema-generation.md` | Generar schemas Zod que acepten File | string | undefined` | T-001 |
| `T-005` | `tasks/05-hook-generation.md` | Generar hooks con procesamiento automático de archivos | T-003, T-004 |
| `T-006` | `tasks/06-form-components.md` | Generar FormFileUpload y FormAssetPicker | T-004, T-005 |
| `T-007` | `tasks/07-sync-integration.md` | Integrar upload con sync engine pre-batch | T-003, T-005 |
| `T-008` | `tasks/08-migrate-and-test.md` | Eliminar file-queue manual y migrar formularios | T-006, T-007 |

## Suggested Execution Order

1. **T-001** - Foundation: sin la configuración, nada puede generarse
2. **T-002** - Backend handler: necesario para que el batch procese files
3. **T-003** - Upload service: el motor de archivos del frontend
4. **T-004** - Schemas: los tipos que usan hooks y componentes
5. **T-005** - Hooks: la magia de "detectar File y subir automáticamente"
6. **T-006** - Components: la UI que el usuario ve
7. **T-007** - Sync integration: el pegamento que orquesta upload antes de batch
8. **T-008** - Migration: eliminar lo viejo, validar que todo funciona

## Parallelization Notes

- T-002 (backend) puede ejecutarse en paralelo con T-003 y T-004 (frontend)
- T-005 depende de T-003 y T-004
- T-006 puede empezarse en paralelo con T-007 una vez T-005 está listo
- T-008 debe ser lo último (es la migración de producción)

## Notes

- **Open Question OQ-001**: ¿Assets tiene sync_status? Verificar antes de T-002.
- **Open Question OQ-002**: Garbage collection de archivos temporales. Implementar en T-007.
- **Open Question OQ-003**: Progreso de upload por campo vs global. Decidir en T-005.
