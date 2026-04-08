# T-003 Add Pagination to Sales List

## Objective

Replace unbounded `findByBusiness()` calls with paginated `findPageByBusiness()` so that `useSales()` and related hooks never load more than one page (50 records) into memory at a time.

## Requirements Covered

- `FR-003`

## Dependencies

- None

## Files or Areas Involved

- `packages/app/app/lib/services/sale-service.ts` - Modify - `findByBusiness()` deprecation path
- `packages/app/app/hooks/use-sales.ts` - Modify - `useSales()` to use `usePaginatedSales`
- `packages/app/app/hooks/use-sales.ts` - Modify - `useSalesByStatus()` and `useSalesByCustomer()` to also use pagination
- `packages/app/app/lib/services/sale-service.ts` - Review - `findPageByBusiness()` already exists

## Actions

1. **Audit all call sites of `findByBusiness()` and `findByStatus()` and `findByCustomerId()`** in `sale-service.ts`. Use `grep` to find all places calling these methods. Identify which are used in hooks vs. internal service calls.

2. **Update `useSales()` hook** (`use-sales.ts`, line 53):
   - Change from `saleService.findByBusiness()` to `saleService.findPageByBusiness({ limit: 50, offset: 0, ...filters })`
   - The hook signature should not change (returns `Sale[]`) — add a `useMemo` to flatten the page result:
   ```typescript
   const { items } = usePaginatedSales({ limit: 50, offset: 0, ...filters });
   const sales = useMemo(() => items, [items]);
   ```
   - Or rename the hook to `usePaginatedSalesList` to make pagination explicit

3. **Update `useSalesByStatus()`** (line 140): Use `findPageByBusiness({ limit: 50, offset: 0, status })` instead of `findByStatus()`.

4. **Update `useSalesByCustomer()`** (line 125): Use `findPageByBusiness({ limit: 50, offset: 0, customerId })` instead of `findByCustomerId()`.

5. **Add infinite-query pattern for sales list screen** if the UI currently shows a flat list. If the sales list screen (`routes/ventas.tsx` or similar) renders all records, it should be converted to use `@tanstack/react-query`'s `useInfiniteQuery` with `getNextPageParam`. This is a larger change — if the sales list is already paginated in the UI (e.g., "Load more" button), just changing the hook is sufficient.

6. **Add a default page size constant** at the top of `sale-service.ts`:
   ```typescript
   const DEFAULT_PAGE_SIZE = 50;
   ```
   Use this in all hook calls instead of hardcoded `50`.

7. **Verify `findPageByBusiness()` uses `LIMIT/OFFSET`** (it already does based on code review at line 369). Confirm the `sales` index `(business_id, sale_date)` is used by the query planner for `ORDER BY sale_date DESC LIMIT 50`.

8. **Update the sales count query** in `findPageByBusiness()` — the current implementation runs `COUNT(*)` on every request (line 371-375). For very large tables, this is slow. Consider deferring the count or caching it for 30 seconds. This is a performance optimization, not a blocker.

## Completion Criteria

- `findByBusiness()` is no longer called from any React hook
- All sales list hooks return at most 50 records per call
- The sales list screen in the UI renders correctly with pagination
- Type signature of `useSales()` unchanged (still returns `Sale[]`)

## Validation

- Load sales list with 1000 records → network tab shows `LIMIT 50` in the query
- Verify no `SELECT * FROM sales ORDER BY sale_date DESC` queries (unbounded) appear in the network tab
- Performance: sales list should render in < 500ms even with 10,000 total records

## Risks or Notes

- **Risk**: Some components may depend on having all sales in memory (e.g., dashboard stats, export features). Audit these before cutting over.
- **Note**: `findByBusiness()` can be kept in the service for internal use (e.g., sync conflict resolution) but must not be exposed via hooks.
- **Open Question**: Does the "libres" (unassigned) sales list on the rutas/distribucion screen use `findByDistribucionIdIsNull()`? That method also returns unbounded results and should be paginated if it's used in a list.
