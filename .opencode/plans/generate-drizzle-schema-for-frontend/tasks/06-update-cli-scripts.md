# T-006 Actualizar CLI y scripts de generación

## Objective

Actualizar los scripts de generación y CLI para incluir el nuevo paso de generación de esquema Drizzle.

## Requirements Covered

- FR-007

## Dependencies

- T-003

## Files or Areas Involved

- `packages/backend/package.json` - Modify - Scripts de sync:generate
- `packages/drizzle-sync/src/cli.ts` - Review - Verificar que CLI soporte el nuevo output

## Actions

1. Verificar que `bun run sync:generate` en backend ya ejecuta `generateAll()` (debería ser así)
2. Verificar que el output va a `../app/app/lib/sync/generated/` (ruta actual)
3. Si es necesario, actualizar scripts en `packages/backend/package.json`:
   ```json
   "sync:generate": "bun run sync:build-schema && cd ../drizzle-sync && bun ./dist/cli.js generate --schema ./src/sync.schema.json --output ../app/app/lib/sync/generated"
   ```
4. Verificar que `drizzle-schema.ts` se genera en la ubicación correcta
5. Documentar en AGENTS.md o README que el esquema Drizzle ahora es generado

## Completion Criteria

- [ ] `bun run sync:generate` produce todos los archivos incluyendo el nuevo esquema Drizzle
- [ ] El archivo se genera en la ruta esperada
- [ ] No hay cambios manuales necesarios después de generar

## Validation

- Ejecutar `cd packages/backend && bun run sync:generate`
- Verificar que `packages/app/app/lib/sync/generated/drizzle-schema.ts` existe

## Risks or Notes

- Si el CLI tiene validaciones de archivos esperados, puede fallar al agregar uno nuevo
- Asegurar que el build de drizzle-sync incluye el nuevo generador
