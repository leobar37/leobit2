# Implement syncGroupId Backend Support

## Objective

Implement full `syncGroupId` support in the backend sync engine to guarantee that related operations (e.g., sale + sale_items) are processed together and in correct dependency order, preventing FK violations when child entities arrive before their parents.

## Current State

- **Done**: Full analysis of frontend sync grouping logic (sale-service.ts, base-service.ts, sync-service.ts)
- **Done**: Confirmed backend ignores `syncGroupId` completely despite accepting it in schema
- **Done**: Identified critical FK violation risk in `SaleItemSyncHandler.handleCreate()` (line 66-68)
- **Done**: Documented that `SaleSyncHandler` handles items atomically in payload, but `SaleItemSyncHandler` operates independently
- **Done**: Identified that frontend already groups and orders by `sync_group_id` (sync-service.ts:532-590) but backend does not
- **Remaining**: Schema change to add `sync_group_id` column to Drizzle `sync_operations` table
- **Remaining**: Backend `SyncEngine` grouping and ordering logic
- **Remaining**: Frontend priority map missing `sales`/`sale_items` entries
- **In progress**: Planning only — no code changes made

## Decisions Already Made

- **Add `sync_group_id` column to backend schema** — frontend already has it in PGlite (db.ts:292), backend schema (sync-operations.ts) lacks it entirely
- **Group operations by `syncGroupId` in `SyncEngine.processBatch()`** — not currently done; operations processed individually in arrival order
- **Sort groups by entity priority** — parents (sales) must process before children (sale_items)
- **No handler changes required** — handlers are order-agnostic; the framework guarantees order
- **Retrocompatible** — operations without `syncGroupId` process as individual groups (no breaking change)

## Affected Files / Artifacts

- `packages/backend/src/db/schema/sync-operations.ts` — **status: change required** — add `sync_group_id` column
- `packages/backend/src/services/sync/framework/SyncEngine.ts` — **status: change required** — grouping/sorting logic at line 70
- `packages/backend/src/services/sync/framework/types.ts` — **status: review** — ensure `SyncContext` propagates `syncGroupId`
- `packages/backend/src/services/sync/types.ts` — **status: reviewed** — `SyncOperationInput.syncGroupId` exists at line 26, `SyncContext` needs it
- `packages/backend/src/api/sync.ts` — **status: review** — ensure `syncGroupId` stored when inserting sync operations
- `packages/app/app/lib/sync/sync-service.ts` — **status: change required** — add `sales` and `sale_items` to `entityPriority` map (line 574-589)
- `packages/app/app/lib/services/sale-service.ts` — **status: reviewed** — correctly reuses `syncGroupId` via `getInsertSyncGroupId()` for confirm/deliver/cancel/update
- `packages/backend/src/services/sync/handlers/SaleItemSyncHandler.ts` — **status: no change** — but depends on engine ordering
- `packages/backend/src/services/sync/handlers/SaleSyncHandler.ts` — **status: no change** — handles items atomically in payload
- `reports/sales-abonos-review.md` — **status: reference** — documents issue S4 (syncGroupId ordering not guaranteed)

## Execution Plan

1. **Add `sync_group_id` column to Drizzle schema** — `packages/backend/src/db/schema/sync-operations.ts` — add `syncGroupId: varchar("sync_group_id", { length: 128 })` to table definition
2. **Create migration file** — `packages/backend/src/db/migrations/000X_add_sync_group_id.sql` — add column via ALTER TABLE (or use `db push` for dev speed)
3. **Update `SyncContext`** — `packages/backend/src/services/sync/framework/types.ts` — add `syncGroupId?: string` field
4. **Modify `SyncEngine.processBatch()`** — `packages/backend/src/services/sync/framework/SyncEngine.ts` — replaced per-group sort + flatten with a **single global sort** by `(syncGroupId, priority, timestamp)`:
   - Primary: syncGroupId (undefined sorts last, so ungrouped ops process at the end)
   - Secondary: entity priority (parents before children)
   - Tertiary: local timestamp (creation order)
   - Also added `distribucion: 1` and `distribucion_items: 2` to entity priority map
5. **Store `syncGroupId` on insert** — `SyncEngine.ts` line 244-253 — pass `syncGroupId: operation.syncGroupId` when inserting into `syncOperations`
6. **Update frontend priority map** — `packages/app/app/lib/sync/sync-service.ts` line 574-589 — add `'sales': 1` and `'sale_items': 2` to `entityPriority`

## Validation

- **Automated**:
  - Run existing sync-related tests
  - `cd packages/backend && bun run db:push` to apply schema
  - Verify no TypeScript errors in modified files
- **Manual**:
  - Create a sale with items offline, sync — verify sale processes before items
  - Create sale, add item, update item, confirm — verify all share same `syncGroupId` in server logs
  - Check `sync_operations` table has `sync_group_id` populated for grouped operations
- **Acceptance**:
  - `SaleItemSyncHandler` never throws "Venta X no encontrada" when items arrive immediately after sale in same batch
  - Operations with same `syncGroupId` appear consecutively in server logs
  - Backend `sync_operations` table shows `sync_group_id` column populated

## Open Questions / Assumptions

- Migration approach: formal Drizzle migration or `db push` in dev? (Assumption: use `db push` for dev, generate migration for production)
- No breaking change: operations without `syncGroupId` process individually as before
- The `SaleSyncHandler` already handles items atomically within the sale payload — this means a `create` operation includes all items. The `SaleItemSyncHandler` is only used for incremental item operations (`addItem`, `updateItem`, `removeItem`) after the sale exists

## Immediate Next Action

Add `sync_group_id` column to `packages/backend/src/db/schema/sync-operations.ts` — add `syncGroupId: varchar("sync_group_id", { length: 128 })` field to the table definition, then run `cd packages/backend && bun run db:push` to apply the schema change.
