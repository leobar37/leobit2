# T-008 Migrar file-queue Manual y Testing

## Objective

Eliminar completamente `packages/app/app/lib/file-queue/` y migrar todos los formularios existentes a usar los nuevos componentes y hooks generados.

## Requirements Covered

- Todos los FRs (validación final)

## Dependencies

- `T-006`, `T-007`

## Files or Areas Involved

- `packages/app/app/lib/file-queue/` - Delete - Eliminar directorio completo
- `packages/app/app/hooks/use-auto-file-upload.ts` - Delete - Reemplazado por sync engine
- `packages/app/app/routes/_protected.cobros.nuevo.tsx` - Modify - Usar FormFileUpload + hook nuevo
- `packages/app/app/routes/_protected.compras.nuevo.tsx` - Modify - Usar FormFileUpload + hook nuevo
- `packages/app/app/components/products/product-form.tsx` - Modify - Usar FormAssetPicker + hook nuevo
- `packages/app/app/lib/api-client.ts` - Review - Verificar que uploadFile sigue siendo necesario

## Actions

1. Eliminar `packages/app/app/lib/file-queue/`:
   - `storage.ts`
   - `processor.ts`
   - `utils.ts`
   - `index.ts`
2. Eliminar `use-auto-file-upload.ts` hook
3. Actualizar `_protected.tsx` para quitar `useAutoFileUploadProcessor`
4. Migrar formulario de cobros/abonos:
   - Reemplazar `useState(proofImage)` por `FormFileUpload` con react-hook-form
   - Reemplazar flujo de 2 pasos (create + upload) por `useCreateAbono` unificado
5. Migrar formulario de compras:
   - Similar a cobros
6. Migrar formulario de productos:
   - Reemplazar `AssetPicker` manual por `FormAssetPicker` generado
7. Actualizar imports en todos los archivos afectados
8. Verificar que `uploadFile` en `api-client.ts` sigue siendo necesario o si se mueve al servicio generado
9. Ejecutar tests E2E para flujos críticos:
   - Crear abono con comprobante Yape
   - Crear compra con recibo
   - Crear producto con imagen
   - Flujo offline: crear, desconectar, reconectar, verificar sync

## Completion Criteria

- [ ] `packages/app/app/lib/file-queue/` no existe
- [ ] `useAutoFileUploadProcessor` no se usa en ningún lado
- [ ] Formularios de cobros, compras y productos usan componentes generados
- [ ] Flujo offline funciona: archivo se guarda, al reconectar se sube y se sincroniza
- [ ] Flujo online funciona: archivo se sube inmediatamente y se sincroniza
- [ ] Tests E2E pasan para casos de archivo

## Validation

- `bun run test:e2e` en `packages/app`
- `bun run typecheck` en frontend
- Testing manual en dispositivo móvil (iOS Safari)

## Risks or Notes

- Esta es la tarea más riesgosa porque toca código de producción activo.
- Hacer backup o branch antes de empezar.
- Considerar migración gradual: primero un formulario, validar, luego los demás.
- Si algo falla en producción, debe ser fácil rollback al sistema de file-queue.
