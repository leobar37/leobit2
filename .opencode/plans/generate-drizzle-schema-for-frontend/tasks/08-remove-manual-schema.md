# T-008 Eliminar schema.ts manual y validar

## Objective

Eliminar o deprecar `packages/shared/src/schema.ts` manual una vez que el esquema generado está funcionando correctamente en producción.

## Requirements Covered

- Acceptance Criteria final

## Dependencies

- T-007

## Files or Areas Involved

- `packages/shared/src/schema.ts` - Delete/Mark - Eliminar o marcar como deprecated
- `packages/shared/src/index.ts` - Modify - Limpiar imports si es necesario

## Actions

1. Verificar que **ningún archivo** en el monorepo importa directamente de `@avileo/shared/schema` (solo de `@avileo/shared`)
2. Hacer backup de `packages/shared/src/schema.ts` por si acaso
3. Eliminar `packages/shared/src/schema.ts` (803 líneas)
4. Actualizar `packages/shared/src/index.ts` para remover imports del schema.ts eliminado
5. Verificar que shared sigue compilando: `cd packages/shared && bun run build`
6. Verificar que el frontend sigue compilando: `cd packages/app && bun run typecheck`
7. Verificar que el backend sigue compilando: `cd packages/backend && bun run build`
8. Agregar documentación indicando que el esquema ahora es generado automáticamente

## Completion Criteria

- [ ] `packages/shared/src/schema.ts` no existe o está vacío (solo comments)
- [ ] Todo el monorepo compila sin errores
- [ ] No hay referencias al schema.ts manual en ningún archivo
- [ ] La generación funciona end-to-end: `bun run sync:generate` → frontend compila

## Validation

- Typecheck en los 3 packages: shared, app, backend
- Build completo: `bun run build` en root
- Test de integración: crear una nueva entidad en backend, regenerar, verificar que aparece en frontend

## Risks or Notes

- **NO eliminar hasta estar 100% seguro de que todo funciona**
- Hacer backup antes de eliminar
- Si algo falla, rollback inmediato
- Considerar mantener el archivo por una semana marcado como `@deprecated` antes de eliminarlo
