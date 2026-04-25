# T-003 Integrar generador en pipeline generateAll

## Objective

Integrar el nuevo generador de esquema Drizzle en el orquestador existente `generateAll()` para que se ejecute automáticamente al correr `bun run sync:generate`.

## Requirements Covered

- FR-007

## Dependencies

- T-001, T-002

## Files or Areas Involved

- `packages/drizzle-sync/src/config/generator.ts` - Modify - Agregar llamada al nuevo generador
- `packages/drizzle-sync/src/config/generators/drizzle-schema-generator.ts` - Review - Verificar exports

## Actions

1. Importar `generateDrizzleSchema` y `generateDrizzleSchemaFile` en `generator.ts`
2. Agregar paso de generación en `generateAll()` después de los servicios (paso 5b o nuevo paso 10)
3. Determinar nombre y ubicación del archivo generado:
   - Opción A: `packages/app/app/lib/sync/generated/drizzle-schema.ts` (nuevo archivo)
   - Opción B: Reemplazar `packages/app/app/lib/sync/generated/drizzle-schema.ts` existente (que solo hace re-exports)
4. Implementar la generación:
   ```typescript
   // Después del paso 5b actual
   const drizzleSchemaPath = `${outputDir}/drizzle-schema.ts`;
   const drizzleSchemaFile = generateDrizzleSchemaFile(entityNames, entities as Record<string, SerializedEntity>);
   writeFileSync(drizzleSchemaPath, await formatGeneratedCode(drizzleSchemaFile, drizzleSchemaPath));
   files.push(`${outputDir}/drizzle-schema.ts`);
   ```
5. Asegurar que el archivo existente `drizzle-schema.ts` (re-exports) se sobrescriba o se renombre
6. Actualizar `GenerationResult` si es necesario

## Completion Criteria

- [ ] `generateAll()` incluye el nuevo paso de generación
- [ ] Ejecutar `bun run sync:generate` produce el archivo de esquema Drizzle
- [ ] No hay errores en el pipeline existente

## Validation

- `cd packages/backend && bun run sync:generate` ejecuta sin errores
- Verificar que `packages/app/app/lib/sync/generated/drizzle-schema.ts` existe y tiene contenido válido

## Risks or Notes

- El archivo `drizzle-schema.ts` actual solo hace re-exports desde `@avileo/shared`. Al reemplazarlo, hay que asegurar que los imports del frontend sigan funcionando
- Considerar renombrar el archivo actual antes de sobrescribir para no perder referencia
