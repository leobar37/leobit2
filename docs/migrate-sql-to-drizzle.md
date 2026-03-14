# Migrate Frontend SQL Queries to Drizzle ORM

## Objective

Migrate 91 raw SQL queries (`this.pg.query`, `this.pg.exec`) across 9 service files in `packages/app/app/lib/services/` to use Drizzle ORM. The services already have Drizzle configured but only use it for 5 simple insert/delete operations. The goal is to leverage type-safe Drizzle queries while maintaining performance and transaction handling for complex operations.

## Current State

- **Done**: 
  - Identified all 91 SQL queries across 9 service files
  - Verified Drizzle schemas exist in `packages/shared/src/schema.ts` (647 lines)
  - Confirmed services already import necessary Drizzle utilities (`eq`, `sql`, `and`, `gte`, `lte`, `inArray`)
  - Mapped which operations use `this.db` (inserts/updates/deletes) vs `this.pg` (queries)
  
- **Remaining**: 
  - Actual migration of each service from SQL to Drizzle
  - Validation that migrated queries produce identical results
  
- **In progress / partial**: 
  - Analysis complete, execution not started
  
- **Blockers or constraints**:
  - PGlite + Drizzle transaction handling differs from PostgreSQL - keep BEGIN/COMMIT in SQL for now
  - Complex JOIN queries in SaleService may need SQL or careful Drizzle planning

## Decisions Already Made

- **Keep transactions in SQL** - SaleService uses BEGIN/COMMIT for atomic operations; Drizzle's transaction API in PGlite is not fully mature for this use case
- **Migrate SELECTs to Drizzle** - All `this.pg.query()` for reads should become `this.db.select()` with Drizzle
- **Keep simple writes as Drizzle** - The 5 existing `this.db.insert/update/delete` calls are already correct
- **Use shared schemas** - All table definitions in `packages/shared/src/schema.ts` should be used (not duplicating schemas in frontend)

## Affected Files / Artifacts

- `packages/app/app/lib/services/base-service.ts` - 3 queries to migrate (updateSyncStatus, incrementSyncVersion)
- `packages/app/app/lib/services/customer-service.ts` - 4 queries to migrate (findById, findByBusiness, create, update, delete)
- `packages/app/app/lib/services/payment-service.ts` - 10 queries to migrate (findById, findByCustomer, findByBusiness, findTotals, create, delete)
- `packages/app/app/lib/services/product-service.ts` - 13 queries to migrate (findById, findByBusiness, findByVariant, count, create, update, delete)
- `packages/app/app/lib/services/sale-service.ts` - 41 queries to migrate (findById, findByBusiness, findByDateRange, create, update, delete, item operations)
- `packages/app/app/lib/services/purchase-service.ts` - 6 queries to migrate
- `packages/app/app/lib/services/tag-service.ts` - 5 queries to migrate
- `packages/app/app/lib/services/customer-tag-service.ts` - 9 queries to migrate
- `packages/app/app/lib/services/inventory-service.ts` - 4 queries to migrate
- `packages/shared/src/schema.ts` - review next - contains all table definitions used for migrations
- `packages/app/app/engine/schema.ts` - review next - re-exports from shared, should not need changes

## Execution Plan

1. **Phase 1 - BaseService**: Migrate `updateSyncStatus` (UPDATE) and `incrementSyncVersion` (SELECT + UPDATE) to Drizzle using `db.update()` with `where(eq(...))`

2. **Phase 2 - Simple Read Services**: 
   - Migrate CustomerService: `findById` → `db.select().from(customers).where(eq(customers.id, id))`
   - Migrate ProductService: `findById`, `findByBusiness`, `findByVariant`
   - Migrate TagService: `findAll`, `findByBusiness`

3. **Phase 3 - Filtered Queries**:
   - Migrate PaymentService: Add `findByCustomer`, `findByBusiness` with filters
   - Migrate CustomerTagService: Complex junction table queries
   - Migrate PurchaseService: Supplier and date range filters

4. **Phase 4 - Complex Queries**:
   - Migrate InventoryService: Queries with JOINs
   - Migrate SaleService: Queries with customer + items JOINs (largest impact: 41 queries)

## Validation

- **Automated**: Run TypeScript typecheck (`bun run typecheck` in app package) after each service migration
- **Manual**: Compare query results before/after migration in dev environment - create test data and verify output matches
- **Acceptance**: All 91 queries return identical data, type errors resolved, app functions normally

## Open Questions / Assumptions

- **Transaction handling**: Assumed BEGIN/COMMIT should stay in SQL for SaleService atomic operations
- **JOIN complexity**: SaleService may need hybrid approach - simple selects as Drizzle, complex multi-join as SQL
- **Testing strategy**: No existing tests found for services; validation will be manual via dev environment

## Immediate Next Action

Start Phase 1: Edit `packages/app/app/lib/services/base-service.ts` to replace `this.pg.exec()` in `updateSyncStatus` with `this.db.update()` using Drizzle, then do the same for `incrementSyncVersion`.

---

Resume by migrating base-service.ts queries to Drizzle, then proceed through phases in order. Run typecheck after each service. Verify results manually in dev environment.
