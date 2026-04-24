# T-004 Refactor Custom Services to Use this.tables

## Objective

Replace all direct table imports from `@avileo/shared` in custom services with `this.tables` access, eliminating tight coupling between services and the schema package.

## Requirements Covered

- `FR-003`

## Dependencies

- `T-003`

## Files or Areas Involved

- `packages/app/app/lib/services/payment-service.ts` - Modify - Replace abonos, customers, sales imports
- `packages/app/app/lib/services/sale-service.ts` - Modify - Replace salesTable, saleItemsTable, customers imports
- `packages/app/app/lib/services/purchase-service.ts` - Modify - Replace purchases, purchaseItems, products, productVariants imports
- `packages/app/app/lib/services/distribucion-service.ts` - Modify - Replace distribuciones, distribucionItems, products, productVariants imports
- `packages/app/app/lib/services/customer-service.ts` - Modify - Replace customers and related table imports
- `packages/app/app/lib/services/inventory-service.ts` - Modify - Replace variant_inventory and related imports

## Actions

1. For each service file:
   a. Remove table object imports from `@avileo/shared` (keep type imports if needed)
   b. Replace `customers` with `this.tables.customers`
   c. Replace `sales` with `this.tables.sales`
   d. Replace all other table references with `this.tables.<name>`
2. Preserve table aliases used in code (e.g., `salesTable` -> `this.tables.sales` or alias locally)
3. Keep non-table imports from `@avileo/shared` (e.g., `SyncStatus`, enums, types)
4. Update any destructuring patterns that relied on imported tables
5. Verify each service file compiles individually

## Completion Criteria

- Zero table object imports from `@avileo/shared` in all listed service files
- All Drizzle queries continue to work with `this.tables` references
- No regression in functionality (queries, inserts, updates)
- TypeScript compilation passes for all modified files

## Validation

- Run `cd packages/app && bun run typecheck` after all changes
- Grep for `from "@avileo/shared"` in modified files to verify no table imports remain
- Manual review of each service to ensure correct table references

## Risks or Notes

- Some services may use table objects in complex ways (e.g., `sql` template literals with table columns). Ensure `this.tables` works in all contexts.
- If a service uses a table alias extensively (e.g., `sales as salesTable`), replacing it with `this.tables.sales` may make the code verbose. Consider local aliasing: `const { sales: salesTable } = this.tables`.
- `inventory-service.ts` uses raw SQL (`pg.query`) - this service may need Drizzle refactoring first or can skip table migration if it's not using Drizzle tables.
