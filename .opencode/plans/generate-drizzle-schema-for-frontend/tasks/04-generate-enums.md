# T-004 Generar enums automáticamente desde sync.schema.json

## Objective

Extraer automáticamente todos los enums del backend desde `sync.schema.json` y generarlos como `const` objects exportables.

## Requirements Covered

- FR-002, FR-008

## Dependencies

- T-001

## Files or Areas Involved

- `packages/drizzle-sync/src/config/generators/drizzle-schema-generator.ts` - Modify - Agregar generación de enums
- `packages/drizzle-sync/src/config/schema-types.ts` - Review - Verificar estructura de enumValues

## Actions

1. Iterar sobre todas las entidades y sus columnas
2. Identificar columnas con `isEnum: true`
3. Extraer valores únicos de `enumValues`
4. Generar const objects con naming convention:
   - De snake_case a PascalCase
   - Ejemplos:
     - `sync_status` → `SyncStatus`
     - `sale_type` → `SaleType`
     - `payment_method` → `PaymentMethod`
     - `product_type` → `ProductType`
5. Keys del const: UPPER_SNAKE_CASE del valor
   - `pending` → `PENDING`
   - `contado` → `CONTADO`
   - `instant_sale` → `INSTANT_SALE`
6. Prevenir duplicados (múltiples columnas pueden usar el mismo enum)
7. Agregar exports al inicio del archivo generado
8. Ejemplo completo de output:
   ```typescript
   export const SyncStatus = {
     PENDING: "pending",
     SYNCED: "synced",
     ERROR: "error",
   } as const;

   export const SaleType = {
     CONTADO: "contado",
     CREDITO: "credito",
   } as const;
   ```

## Completion Criteria

- [ ] Todos los enums del schema.ts manual están presentes en el generado
- [ ] No hay enums duplicados
- [ ] Los const objects tienen `as const`
- [ ] Son exportables para uso en el frontend

## Validation

- Comparar lista de enums generados vs schema.ts manual
- Contar: debe haber ~12 enums (SyncStatus, SaleType, TransactionType, SaleStatus, PaymentMode, PaymentMethod, ProductType, ProductUnit, DistribucionStatus, SupplierType, PurchaseStatus, VisitaStatus)

## Risks or Notes

- Algunos enums del schema.ts manual no vienen de tablas sync (UserRole, BusinessUserRole, etc.) - estos deben seguir siendo manuales o extraerse de otra fuente
- La conversión de nombres debe ser consistente con el schema.ts manual actual
