# Paginated Local Lists For Sales Customers Payments

## Objective

Design an implementation-ready plan to reduce load time and rendering cost on the `ventas`, `clientes`, and `cobros` list screens by replacing full local dataset loading with real SQL-backed pagination in PGlite, visible pagination controls with 100 records per page, and stronger search delegated to local database queries instead of in-memory filtering across entire collections.

## Scope

- In scope: local PGlite query strategy, React Query hooks for paginated list fetching, visible pagination UI, search flow changes, sales/customer/payment/accounts-receivable data paths, and validation coverage for these three screens.
- Out of scope: backend API pagination, sync protocol changes, infinite scroll, virtualized lists as the primary solution, and unrelated UI redesign outside the affected list screens.

## Verified Context

- The frontend uses `PGlite` and `drizzle-orm/pglite` for local persistence, confirmed in `packages/app/app/engine/db.ts`, `packages/app/app/lib/services/customer-service.ts`, `packages/app/app/lib/services/sale-service.ts`, and `packages/app/app/lib/services/payment-service.ts`.
- The list hooks for customers, sales, and payments currently use `@tanstack/react-query` with broad list queries that return all records for the business: `packages/app/app/hooks/use-customers.ts`, `packages/app/app/hooks/use-sales.ts`, and `packages/app/app/hooks/use-payments.ts`.
- `packages/app/app/lib/services/customer-service.ts` currently exposes `findByBusiness(filters?: CustomerSearchFilters): Promise<Customer[]>` without `limit`, `offset`, or count support.
- `packages/app/app/lib/services/sale-service.ts` methods `findByBusiness`, `findByCustomerId`, `findByStatus`, `findByDistribucionId`, and `findByDistribucionIdIsNull` currently return full lists and perform extra per-sale queries for customer and items, which increases cost as the dataset grows.
- `packages/app/app/hooks/use-sale-filters.ts` and `packages/app/app/hooks/use-customer-filters.ts` perform filtering and search in memory after the full dataset has already been loaded.
- `packages/app/app/hooks/use-accounts-receivable.ts` currently loads all customers, all sales, and all payments, then computes debt in React memory, and only applies `limit` after building the full derived list.
- `packages/app/app/routes/_protected.ventas._index.tsx`, `packages/app/app/routes/_protected.clientes._index.tsx`, and `packages/app/app/routes/_protected.cobros._index.tsx` render mapped card lists directly with no pagination controls.
- `packages/app/app/components/customers/customer-card.tsx` fetches tags and groups per card through hooks, which adds per-item work on large pages.
- The mobile list pattern documented in `docs/screens/mobile-list-pattern.md` expects a search-first operational screen layout and is the right visual reference for keeping the UX consistent while adding pagination controls.
- There is no existing reusable pagination component under `packages/app/app/components`, so pagination UI will need a new shared component or local screen-specific controls.
- Existing test coverage relevant to this work includes `packages/app/tests/integration/hooks/use-customers.integration.spec.tsx`, `packages/app/tests/integration/hooks/use-sales.integration.spec.tsx`, `packages/app/tests/integration/customers.spec.tsx`, `packages/app/app/hooks/use-sales.test.tsx`, and `packages/app/e2e/specs/sales-flow.spec.ts`.

## Assumptions

- The user wants classic visible pagination controls, not infinite scroll, and wants the page size fixed to `100` for these screens unless product feedback later changes that requirement.
- Search should remain responsive and broad, but the initial implementation can rely on SQL `LIKE`-style matching in local PGlite rather than full-text search.
- URL-persisted state should be preserved where already used, especially on `ventas`, and should be introduced carefully on `clientes` and `cobros` only if it does not add unnecessary complexity.
- `cobros` will likely need a dedicated aggregated local query service instead of continuing to compose three full-list queries in the hook layer.
- A second optimization pass may still be needed later for `CustomerCard` tag/group loading if page size `100` proves too expensive on lower-end devices.

## Files Involved

- `packages/app/app/lib/services/customer-service.ts` - Modify - add paginated customer queries and count support for SQL-backed search.
- `packages/app/app/hooks/use-customers.ts` - Modify - expose paginated query parameters and page-aware query keys.
- `packages/app/app/hooks/use-customer-filters.ts` - Modify - reduce in-memory filtering responsibilities so search and pagination are not duplicating work.
- `packages/app/app/routes/_protected.clientes._index.tsx` - Modify - wire search, page state, visible pagination controls, and paginated customer results.
- `packages/app/app/components/customers/customer-card.tsx` - Review - evaluate whether per-card tags/groups data fetch must be reduced or deferred for 100-row pages.
- `packages/app/app/lib/services/sale-service.ts` - Modify - add paginated sales queries, count support, and reduce repeated per-sale loading.
- `packages/app/app/hooks/use-sales.ts` - Modify - expose paginated sales queries with page-aware filters.
- `packages/app/app/hooks/use-sale-filters.ts` - Modify - separate URL filter state from full-list in-memory filtering and sorting.
- `packages/app/app/routes/_protected.ventas._index.tsx` - Modify - connect the new paginated sales flow and visible pagination controls.
- `packages/app/app/lib/services/payment-service.ts` - Modify - add paginated payment/debt-related accessors and count helpers where needed.
- `packages/app/app/hooks/use-payments.ts` - Modify - support page-aware business payment queries if the payments list is used directly elsewhere.
- `packages/app/app/hooks/use-accounts-receivable.ts` - Modify - replace full-list composition with paginated aggregated debt queries.
- `packages/app/app/routes/_protected.cobros._index.tsx` - Modify - use paginated debtors data and visible pagination controls.
- `packages/app/app/lib/search.ts` - Review - keep debounce utilities, but stop depending on full-array filtering for large list screens.
- `packages/app/app/components/` - Create - add a reusable pagination component if shared controls are preferred over duplicating controls in each route.
- `packages/app/tests/integration/hooks/use-customers.integration.spec.tsx` - Modify - add pagination and search validation.
- `packages/app/tests/integration/hooks/use-sales.integration.spec.tsx` - Modify - add pagination and filter interaction coverage.
- `packages/app/tests/integration/customers.spec.tsx` - Modify - validate customer screen paging and search behavior.
- `packages/app/app/hooks/use-sales.test.tsx` - Modify - update hook expectations for paginated query signatures.
- `packages/app/e2e/specs/sales-flow.spec.ts` - Review/Modify - preserve existing flows and add a pagination smoke path if this screen remains part of E2E coverage.
- `docs/screens/mobile-list-pattern.md` - Review - keep spacing and layout aligned while introducing bottom pagination controls.

## Ordered Execution Steps

1. **Define shared pagination contract for local list services**
   - Files: `packages/app/app/lib/services/customer-service.ts`, `packages/app/app/lib/services/sale-service.ts`, `packages/app/app/lib/services/payment-service.ts`
   - Action: Introduce a small, consistent local query contract for paged list fetching and total counting, including `limit`, `offset`, `search`, and screen-specific filters so hooks can request exactly one page and know the total row count.
   - Depends on: none

2. **Implement paginated customer query and count methods in PGlite**
   - Files: `packages/app/app/lib/services/customer-service.ts`
   - Action: Add SQL-backed customer list methods that support search on `name`, `dni`, and `phone`, return deterministic ordering, and expose a matching total-count query so the UI can render page numbers and `Mostrando x-y de z` metadata.
   - Depends on: 1

3. **Refactor customer hook layer to request one page at a time**
   - Files: `packages/app/app/hooks/use-customers.ts`, `packages/app/app/hooks/use-customer-filters.ts`
   - Action: Replace the current “load everything” hook contract with paginated query params and page-aware query keys; keep debounce and filter state management where useful, but stop performing full-array search/filter work after the data is loaded.
   - Depends on: 2

4. **Add visible customer pagination UI with 100-per-page behavior**
   - Files: `packages/app/app/routes/_protected.clientes._index.tsx`, `packages/app/app/components/`
   - Action: Add a reusable or route-local pagination control with explicit buttons (`Anterior`, numbered pages, `Siguiente`), keep the existing mobile list structure, reset to page `1` on search/filter change, and show total results context.
   - Depends on: 3

5. **Audit and reduce per-card customer overhead for paged lists**
   - Files: `packages/app/app/components/customers/customer-card.tsx`, related hooks used by the card
   - Action: Confirm whether the per-card tag/group queries are acceptable with 100 cards per page; if not, plan or implement batching/deferred rendering in the execution phase to prevent the new paginated view from still feeling heavy.
   - Depends on: 4

6. **Implement paginated sales query methods and remove the worst full-list cost**
   - Files: `packages/app/app/lib/services/sale-service.ts`
   - Action: Add sales list methods that page at SQL level and return total counts for the current filters; redesign list retrieval to avoid repeated per-sale loading patterns where possible so each page fetch does bounded work instead of scaling with the whole dataset.
   - Depends on: 1

7. **Refactor sales hooks and filter state to support server-style local pagination**
   - Files: `packages/app/app/hooks/use-sales.ts`, `packages/app/app/hooks/use-sale-filters.ts`
   - Action: Move `tab`, `tipo`, and search into a request model that the hook can translate into paginated PGlite queries; keep URL persistence for filters, but avoid sorting/filtering the entire dataset in memory.
   - Depends on: 6

8. **Add visible pagination to the sales list screen**
   - Files: `packages/app/app/routes/_protected.ventas._index.tsx`, `packages/app/app/components/`
   - Action: Render paginated sales results with the same explicit controls and metadata as customers, preserving existing search, tab, and type filter UX while ensuring page resets happen when filters change.
   - Depends on: 7

9. **Create an aggregated local query path for accounts receivable**
   - Files: `packages/app/app/hooks/use-accounts-receivable.ts`, `packages/app/app/lib/services/payment-service.ts` or a new specialized service under `packages/app/app/lib/services/`
   - Action: Replace the current three-query full-data composition with a dedicated aggregated local query that computes debt per customer in SQL, supports search and total counts, and returns only the requested 100-row page.
   - Depends on: 1

10. **Add visible pagination to the payments/debtors screen**
    - Files: `packages/app/app/routes/_protected.cobros._index.tsx`, `packages/app/app/components/`
    - Action: Update `cobros` to use the new paginated debt query, keep the summary block at the top, and add explicit page controls below the debtor cards without breaking the existing mobile list structure.
    - Depends on: 9

11. **Stabilize cache invalidation and page refresh behavior after mutations**
    - Files: `packages/app/app/hooks/use-customers.ts`, `packages/app/app/hooks/use-sales.ts`, `packages/app/app/hooks/use-payments.ts`, `packages/app/app/hooks/use-accounts-receivable.ts`
    - Action: Ensure mutations invalidate paged query keys correctly so the visible page updates after create/edit/delete/payment actions without forcing all pages to refetch unnecessarily.
    - Depends on: 4, 8, 10

12. **Add automated coverage for pagination and search behavior**
    - Files: `packages/app/tests/integration/hooks/use-customers.integration.spec.tsx`, `packages/app/tests/integration/hooks/use-sales.integration.spec.tsx`, `packages/app/tests/integration/customers.spec.tsx`, `packages/app/app/hooks/use-sales.test.tsx`, `packages/app/e2e/specs/sales-flow.spec.ts`
    - Action: Add tests that verify 100-item paging, total counts, page resets after filter/search changes, and preservation of existing create/edit flows after the data-loading contract changes.
    - Depends on: 11

## Risks and Edge Cases

- The current `sale-service` list path does repeated customer/item fetching per sale; if pagination is added without reducing this pattern, `100` sales per page may still feel slow on older devices.
- `cobros` currently derives debt in React from three full datasets; converting this to SQL aggregation may surface edge cases around cancelled sales, draft sales, decimal math, and customers with payments but no current debt.
- Search terms containing spacing or partial phone/DNI fragments may require normalization rules to feel “strong” enough without introducing complex indexing too early.
- Resetting page state on every filter change is necessary for correctness, but it must not create confusing URL churn or double-fetch loops.
- A new shared pagination component must be small and operationally styled; overbuilding it could slow delivery.
- Mutations that create or remove records can shift totals and page boundaries; the implementation should define what happens when the current page becomes empty after a delete or filter change.
- `CustomerCard` currently triggers per-card secondary hooks; even with only 100 rows, this may still produce avoidable work and should be measured during implementation.

## Validation Strategy

- Run targeted hook and integration tests for customers and sales after refactoring paginated query contracts.
- Add coverage for accounts receivable aggregation to confirm debt totals match previous business rules for `credito`, excluding `draft` and `cancelled` sales.
- Manually verify the three screens on mobile-sized viewport with enough seeded data to exceed 100, 200, and 500 rows.
- Confirm visible pagination behavior: first page, middle page, last page, empty results, and page reset after changing search or filters.
- Confirm mutation flows still refresh correctly on the current page after creating/editing/deleting customers, sales, and payments.
- Run project typecheck and the most relevant test suites in `packages/app` before execution is considered complete.

## Open Questions

- Should pagination state for `clientes` and `cobros` also be persisted in the URL, or is in-memory component state acceptable while only filters/search remain persisted?
- For `ventas`, do we want page counts based on all matching sales before secondary item/customer hydration, or should the list query itself be redesigned around a flatter list row shape?
- Should the first implementation keep tags/group filtering on `clientes`, or should tag filtering be temporarily simplified if batching that data becomes too expensive?
- Does `cobros` need a separate total debt summary for all matching debtors or only for the currently loaded page once pagination is introduced?
- If search performance with SQL `LIKE` is still not enough on large local datasets, is a later full-text-search index acceptable in PGlite, or should normalization-only improvements be the limit?
