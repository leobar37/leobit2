# T-005 Generar tipos inferidos ($inferSelect/$inferInsert)

## Objective

Generar automáticamente los tipos TypeScript inferidos de Drizzle (`$inferSelect`, `$inferInsert`) para cada entidad, reemplazando los tipos manuales de `packages/shared/src/schema.ts`.

## Requirements Covered

- FR-006

## Dependencies

- T-001

## Files or Areas Involved

- `packages/drizzle-sync/src/config/generators/drizzle-schema-generator.ts` - Modify - Agregar exports de tipos

## Actions

1. Después de generar todas las tablas `pgTable`, agregar sección de tipos
2. Para cada entidad, generar:
   ```typescript
   export type Customer = typeof customers.$inferSelect;
   export type NewCustomer = typeof customers.$inferInsert;
   ```
3. Usar naming convention:
   - PascalCase del nombre de entidad para el tipo select
   - `New` + PascalCase para el tipo insert
   - Ejemplos:
     - `customers` → `Customer`, `NewCustomer`
     - `sales` → `Sale`, `NewSale`
     - `sale_items` → `SaleItem`, `NewSaleItem`
4. Asegurar que los tipos se exporten correctamente
5. El output debe ser equivalente a:
   ```typescript
   export type Customer = typeof customers.$inferSelect;
   export type NewCustomer = typeof customers.$inferInsert;
   export type Sale = typeof sales.$inferSelect;
   export type NewSale = typeof sales.$inferInsert;
   // ... etc para las 16 entidades
   ```

## Completion Criteria

- [ ] Todos los tipos del schema.ts manual están presentes
- [ ] Los nombres de tipos coinciden con el schema.ts manual
- [ ] Usan `$inferSelect` y `$inferInsert` de Drizzle

## Validation

- Comparar lista de tipos generados vs schema.ts manual
- Verificar que el frontend puede importar `Customer`, `Sale`, etc. desde el archivo generado

## Risks or Notes

- Algunos tipos manuales en shared no vienen de tablas (Business, ApiResponse, etc.) - estos deben seguir en shared manualmente
- Los tipos generados deben ser 100% compatibles con los usados en el frontend
