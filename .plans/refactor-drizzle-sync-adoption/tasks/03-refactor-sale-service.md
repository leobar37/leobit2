# T-003 Refactor Sale Service SQL to Drizzle ORM

## Objective

Replace remaining `pg.query()` calls in `sale-service.ts` with Drizzle ORM queries, leveraging the composed `GeneratedSalesService` and `GeneratedItemsService` where possible.

## Requirements Covered

- `FR-003`
- `FR-005`
- `NFR-002`

## Dependencies

- `T-001`

## Files or Areas Involved

- `packages/app/app/lib/services/sale-service.ts` - Modify - Replace raw SQL with Drizzle ORM
- `packages/app/app/lib/services/base-service.ts` - Review - May need new helper methods
- `packages/app/app/lib/sync/generated/services.ts` - Review - Verify generated services provide needed methods
- `packages/app/app/hooks/use-sales.ts` - Review - Ensure compatibility
- `packages/app/app/hooks/use-sales-db.ts` - Review - Ensure compatibility

## Actions

1. Identify all `pg.query()` calls in `sale-service.ts`:
   - `findById()` with JOINs to customers and sale_items (~lines 310-344)
   - `enrichSalesBatch()` with `ANY($1)` for batch lookups (~lines 351-390)
   - `findPageByBusiness()` with customer lookup (~lines 447-456)
   - Various operations throughout lines 960, 972, 992, 1054, 1074, 1125, 1145
2. For `findById()`:
   - Use Drizzle relations or two separate queries (get sale, then get items) instead of a raw JOIN
   - The generated `SalesService.findById()` may already handle this; prefer using it
3. For `enrichSalesBatch()`:
   - Replace `ANY($1)` batch query with `inArray()` from Drizzle ORM
   - Use `select().from().where(inArray(customers.id, saleCustomerIds))`
4. For remaining basic lookups:
   - Replace with standard Drizzle `select().from().where(eq())` queries
5. Ensure atomic operations (create sale + items) continue to use transactions via PGlite/drizzle
6. Preserve the existing `SaleItem`, `Sale`, and return type interfaces

## Completion Criteria

- `sale-service.ts` contains zero `pg.query()` calls for business logic
- All sale operations (create draft, confirm, deliver, cancel) compile without errors
- POS/cart functionality remains unchanged
- Sale list and detail views continue to display correctly

## Validation

- Run `cd packages/app && bun run typecheck`
- Run sale-related tests if they exist
- Manual test: create a sale offline, add items, confirm, sync online

## Risks or Notes

- `SaleService` manages two entities atomically and has complex state transitions (draft → confirmed → delivered). Ensure transaction boundaries are preserved when switching from raw SQL to Drizzle.
- The `enrichSalesBatch()` method is performance-sensitive (batch loads customers and items for a list of sales). Ensure the Drizzle replacement does not cause N+1 queries.
- Some `pg.query()` calls may be for infrastructure/sync status updates in `BaseService` — those are acceptable and should not be touched.
