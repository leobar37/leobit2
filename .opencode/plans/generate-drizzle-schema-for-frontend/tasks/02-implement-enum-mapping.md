# T-002 Implementar mapeo de tipos pgEnum → text + const

## Objective

Implementar la lógica de transformación de columnas `pgEnum` del backend a `text()` + `const` objects en el esquema generado.

## Requirements Covered

- FR-002, FR-008

## Dependencies

- T-001

## Files or Areas Involved

- `packages/drizzle-sync/src/config/generators/drizzle-schema-generator.ts` - Modify - Agregar lógica de enums

## Actions

1. Detectar columnas con `isEnum: true` o `drizzleType: "PgEnumColumn"`
2. Para cada enum encontrado:
   - Generar un `const` object con los valores del enum
   - Nombre: convertir snake_case a PascalCase + sufijo (ej: `sync_status` → `SyncStatus`)
   - Keys: UPPER_SNAKE_CASE de los valores
   - Values: los valores originales del enum
   - Agregar `as const` al final
3. Generar la columna como `text("column_name")` en vez de enum
4. Para defaults de enum columns:
   - Si tiene default, usar el const object: `.default(SyncStatus.PENDING)`
   - Mapear el valor del backend al key del const
5. Exportar todos los const objects al inicio del archivo generado
6. Ejemplo de output esperado:
   ```typescript
   export const SyncStatus = {
     PENDING: "pending",
     SYNCED: "synced",
     ERROR: "error",
   } as const;
   
   // En la tabla:
   syncStatus: text("sync_status").notNull().default(SyncStatus.SYNCED),
   ```

## Completion Criteria

- [ ] Todos los enums del backend se transforman a const objects
- [ ] Las columnas enum usan `text()` en lugar de enum
- [ ] Los defaults usan referencias al const object
- [ ] El output es equivalente funcionalmente al schema.ts manual

## Validation

- Comparar output generado vs schema.ts manual para al menos 3 tablas
- Verificar que todos los enums existentes estén presentes

## Risks or Notes

- Nombres de enums: el schema.ts manual usa PascalCase (SyncStatus), hay que replicar esto
- Algunos enums pueden no tener defaults - manejar caso nullable
- El schema.ts manual tiene algunos enums que no vienen de columnas (ej: UserRole) - estos requieren T-004
