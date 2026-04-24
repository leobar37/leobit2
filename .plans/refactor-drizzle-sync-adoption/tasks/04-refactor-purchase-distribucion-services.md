# T-004 Refactor Purchase and Distribucion Services SQL to Drizzle ORM

## Objective

Eliminate raw SQL (`pg.query()`) from `purchase-service.ts` and `distribucion-service.ts`, replacing it with Drizzle ORM queries or generated service methods.

## Requirements Covered

- `FR-003`
- `FR-005`
- `NFR-002`

## Dependencies

- `T-001`

## Files or Areas Involved

- `packages/app/app/lib/services/purchase-service.ts` - Modify - Replace raw SQL
- `packages/app/app/lib/services/distribucion-service.ts` - Modify - Replace raw SQL
- `packages/app/app/lib/sync/generated/services.ts` - Review - Check for `PurchasesService` and `DistribucionesService`
- `packages/app/app/hooks/use-purchases.ts` - Review - Ensure compatibility
- `packages/app/app/hooks/use-distribuciones.ts` - Review - Ensure compatibility

## Actions

1. In `purchase-service.ts`:
   - Replace `findById()` JOINs (lines 88-111) with Drizzle relations or separate queries
   - Replace `createWithItems()` INSERTs (lines 232-253) with Drizzle `insert().values()` or generated service `create()`
   - Replace remaining INSERT/UPDATE blocks (lines 271-292, 438-459, 571-592, 631-648) with Drizzle ORM
2. In `distribucion-service.ts`:
   - Replace `createWithItems()` INSERTs (lines 125-148) with Drizzle `insert().values()`
   - Replace `getItemsWithNames()` JOINs (lines 274-289) with Drizzle relations or separate queries
   - Replace remaining INSERT/UPDATE blocks (lines 336-355, 441-444)
3. For both services:
   - Ensure `queueSync()` is still called for all write operations
   - Preserve exact return types to avoid breaking hooks
   - Remove unused SQL string variables and `pg.query()` imports

## Completion Criteria

- `purchase-service.ts` contains zero `pg.query()` calls
- `distribucion-service.ts` contains zero `pg.query()` calls
- Both services compile without TypeScript errors
- Purchase and distribucion flows remain functional offline and online

## Validation

- Run `cd packages/app && bun run typecheck`
- Manual test: create a purchase and a distribucion offline, sync online

## Risks or Notes

- These services have less complex business logic than payment/sale services, so the refactor should be straightforward.
- If Drizzle does not support inserting with explicit IDs (some services may generate IDs client-side), document this exception clearly.
- Consider running these two refactors in parallel since they are independent.
