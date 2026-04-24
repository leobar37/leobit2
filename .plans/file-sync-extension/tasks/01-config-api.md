# T-001 Configurar fileFields en EntitySyncConfig

## Objective

Extender la configuración de entidades syncable para soportar declaración de campos de archivo (`fileFields`) con sus propiedades.

## Requirements Covered

- `FR-001`

## Dependencies

- none

## Files or Areas Involved

- `packages/drizzle-sync/src/config/types.ts` - Modify - Agregar tipos `FileFieldConfig` y `fileFields` a `EntitySyncConfig`
- `packages/drizzle-sync/src/config/entity-definition.ts` - Modify - Agregar métodos `fileField()` al `EntityBuilder`
- `packages/drizzle-sync/src/config/validator.ts` - Modify - Validar que `fileFields` referencien entidades válidas
- `packages/backend/src/sync.config.ts` - Modify - Añadir `fileFields` a entidades que usan archivos (abonos, purchases, products, etc.)
- `packages/backend/src/db/schema/files.ts` - Review - Verificar que `files` tiene todos los campos necesarios para sync

## Actions

1. Agregar interface `FileFieldConfig` con propiedades: `entity: 'files' | 'assets'`, `maxSize?: number`, `accept?: string[]`
2. Extender `EntitySyncConfig` con campo opcional `fileFields?: Record<string, FileFieldConfig>`
3. Extender `EntityBuilder` con método `fileField(name: string, config: FileFieldConfig)`
4. Validar que las entidades referenciadas en `entity` existan en la configuración
5. Actualizar `sync.config.ts` en backend para declarar `fileFields` en:
   - `abonos`: `proof_image_id` → `files`
   - `purchases`: `receipt_image_id` → `files`
   - `products`: `image_id` → `assets` (o `files` según decisión)
   - `sales`: `advance_proof_image_id` → `files`
6. Verificar que la tabla `files` en schema tiene campos necesarios: `id`, `business_id`, `filename`, `storage_path`, `mime_type`, `size_bytes`, `sync_status`, `sync_attempts`, `version`

## Completion Criteria

- [ ] `EntitySyncConfig` acepta `fileFields` sin errores de TypeScript
- [ ] `EntityBuilder` tiene método `fileField()` funcional
- [ ] Validador rechaza configuraciones inválidas (ej: `entity` que no existe)
- [ ] `sync.config.ts` declara todos los campos de archivo existentes
- [ ] Tests de configuración pasan

## Validation

- `bun test` en `packages/drizzle-sync` para tests de configuración
- `bun run typecheck` en backend para verificar `sync.config.ts`

## Risks or Notes

- Si `assets` no tiene campos de sync (`sync_status`, `version`), puede que no se pueda declarar como syncable inmediatamente. Requiere decisión sobre si migrar `assets` a syncable o mantener `assets` como online-only.
