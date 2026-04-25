# T-001 Crear generador drizzle-schema-generator.ts

## Objective

Crear un nuevo generador en `drizzle-sync` que produzca código Drizzle ORM (`pgTable` definitions) a partir de `SerializedEntity`.

## Requirements Covered

- FR-001, FR-003, FR-004, FR-005, NFR-001, NFR-004

## Dependencies

- none

## Files or Areas Involved

- `packages/drizzle-sync/src/config/generators/drizzle-schema-generator.ts` - Create - Nuevo generador principal
- `packages/drizzle-sync/src/config/generators/code-builder.ts` - Review - Usar CodeBuilder existente
- `packages/drizzle-sync/src/config/schema-types.ts` - Review - Entender SerializedEntity/SerializedColumn

## Actions

1. Crear archivo `drizzle-schema-generator.ts` en `packages/drizzle-sync/src/config/generators/`
2. Implementar función `generateDrizzleSchema(name, entity)` que reciba `entityName` y `GeneratorEntity`
3. Implementar mapeo de tipos Drizzle para PGlite:
   - `PgUUID` → `uuid().primaryKey().defaultRandom()` (si es PK)
   - `PgVarchar` → `varchar({ length })`
   - `PgText` → `text()`
   - `PgInteger` → `integer()`
   - `PgBoolean` → `boolean()`
   - `PgTimestamp`/`PgTimestampTz` → `timestamp()`
   - `PgDate` → `date()`
   - `PgJsonb` → `jsonb()`
   - `PgNumeric` → `decimal({ precision, scale })`
   - `enum` → `text()` (con default del const object si aplica)
4. Implementar manejo de defaults:
   - Detectar `defaultRandom()` para UUID PKs
   - Detectar `defaultNow()` para timestamps
   - Preservar valores literales (strings, numbers, booleans)
5. Implementar generación de índices:
   - `index("idx_${table}_${col}").on(table.col)`
   - Mínimos: sync_status, business_id/tenant_id, columnas FK (_id)
6. Implementar función `generateDrizzleSchemaFile(entities)` que orqueste y genere el archivo completo
7. Agregar exports al `index.ts` de generators si es necesario

## Completion Criteria

- [ ] El generador compila sin errores
- [ ] Produce código TypeScript sintácticamente válido
- [ ] Usa CodeBuilder para consistencia
- [ ] Maneja todos los tipos de columnas del esquema actual

## Validation

- `cd packages/drizzle-sync && bun run build` compila sin errores
- Test manual: generar schema para una entidad y verificar output

## Risks or Notes

- El mapeo de defaults complejos (SQL functions de Drizzle) puede ser tricky
- PGlite no soporta `.references()` - asegurar que nunca se generen
- Los índices deben ser mínimos para no sobrecargar PGlite
