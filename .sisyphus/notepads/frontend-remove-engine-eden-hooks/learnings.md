## Migration B4: Drop Sync Columns - 2026-04-27

### Summary
Successfully dropped all sync-only columns from the database after B2 schema cleanup.

### Migration File
- **Path**: packages/backend/drizzle/0060_drop_sync_columns.sql
- **Type**: Manual migration (db:generate blocked by snapshot drift)

### What Was Dropped
- sync_status column from 20 operational tables
- sync_attempts column from 20 operational tables
- version column from 19 tables (ALL except sales)
- sync_conflicts table (entire table)
- sync_status enum (no longer referenced)

### Tables Affected
customers, sales, sale_items, products, product_variants, distribuciones, distribucion_items, variant_inventory, purchases, purchase_items, abonos, visitas, puntos_venta, suppliers, tags, files, product_units, customer_groups, customer_group_members, customer_tags

### sales.version
PRESERVED as required. sales.version is kept for backend optimistic locking in confirmSale() and deliverPreOrder().

### Issues Encountered

1. db:generate blocked by snapshot drift
   - Snapshots stuck at 0032, but migrations exist up to 0059
   - Drizzle-kit prompted interactively about payment_mode enum rename
   - Could not bypass interactive prompt (tried CI=true, piped input, Node.js wrapper)
   - Resolution: Created manual migration SQL file

2. drizzle_migrations table missing
   - db:migrate failed because tracking table didn't exist
   - Resolution: Applied SQL directly via postgres client, then created tracking table

3. distribucion_cierre_items table not in database
   - Migration 0050 was supposed to create it, but table was missing
   - Resolution: Removed table from migration

4. Some columns didn't exist
   - variant_inventory.sync_status, variant_inventory.sync_attempts, sale_items.version were missing
   - IF EXISTS handled this gracefully with NOTICE messages

### Verification Results
- All sync_status columns: DROPPED
- All sync_attempts columns: DROPPED
- All version columns (except sales): DROPPED
- sync_conflicts table: DROPPED
- sync_status enum: DROPPED
- sales.version: KEPT

### Recommendation
Fix snapshot drift before next migration:
- Snapshots need to be regenerated to match current schema state
- Journal should include entries for 0057, 0058, 0059
- Consider running drizzle-kit introspect or manually syncing snapshots

## Wave 1: Foundation (2026-04-27)

### api-utils.ts
- `extractData` already exists in `api-client.ts` (lines 28-43) and is robust enough.
- Instead of duplicating, `api-utils.ts` re-exports `extractData` as `unwrapApiResponse` for naming consistency with the plan.
- Added utility helpers: `isApiError`, `isApiSuccess`, `getErrorMessage` for standardized error handling in hooks.
- All helpers are typed and tree-shakeable.

### query-keys.ts
- Query key factory uses `as const` for type-safe query keys.
- `PeriodParams` type defined inline since it's frontend-specific.
- Factory covers sales, customers, products, and dashboard domains.

### api-client.ts verification
- `treaty<App>` from `@avileo/backend` is current and correct.
- `credentials: "omit"` is correct because Better Auth uses Bearer tokens.
- Headers include both `Authorization` (Bearer token) and `x-business-id`.
- `uploadFile` helper handles multipart uploads outside Eden Treaty.
- No sync fields exposed in this file.
- Typecheck passes cleanly with no errors.

## Tasks 9-10: Rewrite use-sales.ts and use-sales-db.ts (2026-04-28)

### Completed
- Rewrote `packages/app/app/hooks/use-sales.ts` to use Eden Treaty API (`api.sales.*`)
- Rewrote `packages/app/app/hooks/use-sales-db.ts` to use Eden Treaty API directly
- Removed all imports from `@avileo/drizzle-sync/react` and `~/lib/services/*`
- Defined all types locally in the hooks (Sale, SaleItem, SaleWithItems, etc.)

### Key Patterns
- `extractData(response)` unwraps API responses; for DELETE 204 responses, check `response.error` directly
- Cast through `unknown` when API returns `Date` fields but frontend types use `string` (e.g., `as unknown as SaleItem`)
- `queryKeys.sales.lists()` expects `Record<string, unknown>` — cast filter objects through `unknown` first

### API Limitations Discovered
- Backend `GET /sales` only supports `startDate`, `endDate`, `saleType`, `limit`, `offset` query params
- No `customerId`, `status`, `distribucionId`, `search`, `hasBalanceDue`, or `type` params on the API
- Client-side filtering implemented for `useSalesByCustomer`, `useSalesByStatus`, and `usePaginatedSales`
- `POST /sales/:id/deliver` only takes `baseVersion` — does NOT handle item adjustments or payment changes
- `useFinalizeSale` delivery mode now does: PATCH items → POST deliver (multi-step, not atomic)

### Type Compatibility
- Added `syncStatus` and `syncAttempts` to `Sale` type for backward compatibility with components that still reference them
- `useSaleSyncStatus` simplified to always return `isSynced: true` (no more sync engine)
- No errors in `use-sales.ts` or `use-sales-db.ts` after typecheck

### Remaining Type Errors (Pre-existing)
- Many other hooks have `Date` vs `string` mismatches from unrelated migrations
- Route files still reference snake_case DB fields (`payment_method`, `created_at`, `sync_status`)
- These errors exist independently of the sales hooks rewrite
