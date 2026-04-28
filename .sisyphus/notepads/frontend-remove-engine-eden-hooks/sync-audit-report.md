# Backend Sync Audit Report

**Date:** 2026-04-28
**Auditor:** Atlas (automated + manual verification)
**Scope:** packages/backend/src, packages/shared/src

---

## Executive Summary

All operational tables in the backend have `syncStatus` + `syncAttempts` columns. The `version` field exists on all tables but serves dual purposes: (1) backend optimistic locking for sales/pre-orders, and (2) offline sync conflict detection. 

**Recommendation:** Drop `syncStatus`/`syncAttempts` everywhere. Keep `version` only on tables where backend optimistic locking is actively used via API endpoints. Drop `version` from tables where it's only used by sync handlers.

---

## Entities with Sync Fields

### 1. sales (packages/backend/src/db/schema/sales.ts)
- **syncStatus**: `syncStatusEnum("sync_status").notNull().default("synced")` → **DROP**
- **syncAttempts**: `integer("sync_attempts").notNull().default(0)` → **DROP**
- **version**: `integer("version").notNull().default(1)` → **KEEP**
  - **Justification**: Used in `sale.service.ts:confirmSale()` and `deliverPreOrder()` with `baseVersion` parameter. Backend optimistic locking for concurrent pre-order edits.
  - **API usage**: `POST /sales/:id/confirm` requires `baseVersion` for pre_orders. `POST /sales/:id/deliver` requires `baseVersion`.
  - **Repository usage**: `sale.repository.ts` implements `expectedVersion` check in `update()` and `updateWithItems()`.

### 2. sale_items (packages/backend/src/db/schema/sales.ts)
- **syncStatus**: `syncStatusEnum("sync_status").notNull().default("synced")` → **DROP**
- **syncAttempts**: `integer("sync_attempts").notNull().default(0)` → **DROP**
- **version**: Not present on sale_items → N/A

### 3. customers (packages/backend/src/db/schema/customers.ts)
- **syncStatus**: Present → **DROP**
- **syncAttempts**: Present → **DROP**
- **version**: Present → **DROP**
  - **Justification**: No backend API endpoint uses `baseVersion` or `expectedVersion` for customers. Only used by sync handlers (`CustomerConflictResolver`).

### 4. customer_groups (packages/backend/src/db/schema/customer-groups.ts)
- **syncStatus**: Present → **DROP**
- **syncAttempts**: Present → **DROP**
- **version**: Present → **DROP**
  - **Justification**: Only used by sync handlers.

### 5. customer_group_members (packages/backend/src/db/schema/customer-group-members.ts)
- **syncStatus**: Present → **DROP**
- **syncAttempts**: Present → **DROP**
- **version**: Present → **DROP**
  - **Justification**: Only used by sync handlers.

### 6. customer_tags (packages/backend/src/db/schema/customer-tags.ts)
- **syncStatus**: Present → **DROP**
- **syncAttempts**: Present → **DROP**
- **version**: Present → **DROP**
  - **Justification**: Only used by sync handlers.

### 7. products (packages/backend/src/db/schema/inventory.ts)
- **syncStatus**: Present → **DROP**
- **syncAttempts**: Present → **DROP**
- **version**: Present → **DROP**
  - **Justification**: Only used by sync handlers (`ProductConflictResolver`).

### 8. product_variants (packages/backend/src/db/schema/inventory.ts)
- **syncStatus**: Present → **DROP**
- **syncAttempts**: Present → **DROP**
- **version**: Present → **DROP**
  - **Justification**: Only used by sync handlers.

### 9. product_units (packages/backend/src/db/schema/product-units.ts)
- **syncStatus**: Present → **DROP**
- **syncAttempts**: Present → **DROP**
- **version**: Present → **DROP**
  - **Justification**: Only used by sync handlers.

### 10. distribuciones (packages/backend/src/db/schema/inventory.ts)
- **syncStatus**: Present → **DROP**
- **syncAttempts**: Present → **DROP**
- **version**: Present → **DROP**
  - **Justification**: Only used by sync handlers.

### 11. distribucion_items (packages/backend/src/db/schema/inventory.ts)
- **syncStatus**: Present → **DROP**
- **syncAttempts**: Present → **DROP**
- **version**: Present → **DROP**
  - **Justification**: Only used by sync handlers.

### 12. cierre_items (packages/backend/src/db/schema/inventory.ts)
- **syncStatus**: Present → **DROP**
- **syncAttempts**: Present → **DROP**
- **version**: Present → **DROP**
  - **Justification**: Only used by sync handlers.

### 13. variant_inventory (packages/backend/src/db/schema/inventory.ts)
- **syncStatus**: Present → **DROP**
- **syncAttempts**: Present → **DROP**
- **version**: Present → **DROP**
  - **Justification**: Only used by sync handlers.

### 14. purchases (packages/backend/src/db/schema/purchases.ts)
- **syncStatus**: Present → **DROP**
- **syncAttempts**: Present → **DROP**
- **version**: Present → **DROP**
  - **Justification**: Only used by sync handlers.

### 15. purchase_items (packages/backend/src/db/schema/purchases.ts)
- **syncStatus**: Present → **DROP**
- **syncAttempts**: Present → **DROP**
- **version**: Present → **DROP**
  - **Justification**: Only used by sync handlers.

### 16. abonos (payments) (packages/backend/src/db/schema/payments.ts)
- **syncStatus**: Present → **DROP**
- **syncAttempts**: Present → **DROP**
- **version**: Present → **DROP?**
  - **Caution**: `payment.repository.ts` implements `expectedVersion` parameter in `update()`, but no API endpoint appears to use it. Verify before dropping.

### 17. visitas (packages/backend/src/db/schema/visitas.ts)
- **syncStatus**: Present → **DROP**
- **syncAttempts**: Present → **DROP**
- **version**: Present → **DROP**
  - **Justification**: Only used by sync handlers.

### 18. puntos_venta (packages/backend/src/db/schema/puntos-venta.ts)
- **syncStatus**: Present → **DROP**
- **syncAttempts**: Present → **DROP**
- **version**: Present → **DROP**
  - **Justification**: Only used by sync handlers.

### 19. suppliers (packages/backend/src/db/schema/suppliers.ts)
- **syncStatus**: Present → **DROP**
- **syncAttempts**: Present → **DROP**
- **version**: Present → **DROP**
  - **Justification**: Only used by sync handlers.

### 20. tags (packages/backend/src/db/schema/tags.ts)
- **syncStatus**: Present → **DROP**
- **syncAttempts**: Present → **DROP**
- **version**: Present → **DROP**
  - **Justification**: Only used by sync handlers.

### 21. files (packages/backend/src/db/schema/files.ts)
- **syncStatus**: Present → **DROP**
- **syncAttempts**: Present → **DROP**
- **version**: Present → **DROP?**
  - **Caution**: `file.repository.ts` implements `expectedVersion` parameter, but no API endpoint appears to use it. Verify before dropping.

---

## Special Cases

### sync-conflicts table (packages/backend/src/db/schema/sync-conflicts.ts)
- **Action**: DROP entire table
- **Justification**: This table exists solely for offline sync conflict resolution. In online-first architecture, conflicts are resolved server-side at request time, not stored for later resolution.
- **Columns**: `localVersion`, `serverVersion`, `entityType`, `entityId`, `localData`, `serverData`, `resolution`, `resolvedAt`

### syncStatusEnum (packages/backend/src/db/schema/enums.ts)
- **Action**: DROP enum
- **Justification**: No longer needed after dropping all syncStatus columns.

---

## Backend Code Using Sync Fields

### Repositories (select/insert/update sync fields)
- `visita.repository.ts` — selects/sets syncStatus, syncAttempts
- `product.repository.ts` — selects/sets syncStatus, syncAttempts
- `product-variant.repository.ts` — accepts syncStatus/syncAttempts in update data
- `distribucion.repository.ts` — accepts syncStatus/syncAttempts in update data
- `customer.repository.ts` — accepts syncStatus/syncAttempts in update data
- `tag.repository.ts` — hardcodes syncStatus="synced", syncAttempts=0 on create
- `product-unit.repository.ts` — accepts syncStatus/syncAttempts in update data
- `punto-venta.repository.ts` — hardcodes syncStatus="synced", syncAttempts=0 on create
- `customer-tag.repository.ts` — hardcodes syncStatus="synced", syncAttempts=0 on create
- `customer-group.repository.ts` — hardcodes syncStatus="synced", syncAttempts=0
- `sale.repository.ts` — uses version for optimistic locking (KEEP for sales table only)
- `payment.repository.ts` — uses version with expectedVersion (verify if API uses it)
- `file.repository.ts` — uses version with expectedVersion (verify if API uses it)

### Services
- `distribucion.service.ts` — hardcodes syncStatus="synced" in create
- `sale.service.ts` — uses version for optimistic locking (KEEP)

### Sync Handlers (ALL TO BE REMOVED)
- `packages/backend/src/services/sync-handlers/conflict-resolvers.ts` — 18 conflict resolver classes
- `packages/backend/src/services/sync-handlers/registry.ts` — sync operation registry using version
- All sync handlers use version for offline conflict detection.

### Seed Files
- `packages/backend/src/seed/index.ts` — inserts syncStatus, syncAttempts for products, customers, sales, abonos
- `packages/backend/src/seed/backfill-sync-operations.ts` — filters by syncStatus="synced" for backfill

### API Routes
- `packages/backend/src/api/public-sales.ts` — returns `version` in public sale responses (may need to keep for sales)
- Most API routes don't explicitly return syncStatus/syncAttempts (they return full objects which include these fields via Drizzle types)

---

## version Field Classification Summary

| Table | version Action | Reason |
|-------|---------------|--------|
| sales | **KEEP** | Backend optimistic locking via `baseVersion` in confirm/deliver endpoints |
| sale_items | N/A | No version field |
| All other tables | **DROP** | Only used by sync handlers, no backend API uses `expectedVersion` |

**Note on sales.version**: Even though we keep it, we should evaluate if `baseVersion` parameter in API is still necessary in online-first architecture. With online-first, concurrent edits are handled by standard database transactions, not by client-side version checks. However, removing it requires API contract changes and frontend changes. **Recommendation**: Keep `sales.version` for now to minimize API changes, but consider removing in a future phase.

---

## Files to Modify (B2 Scope)

### Schema Files
- `packages/backend/src/db/schema/sales.ts` — drop syncStatus, syncAttempts; keep version
- `packages/backend/src/db/schema/customers.ts` — drop syncStatus, syncAttempts, version
- `packages/backend/src/db/schema/customer-groups.ts` — drop syncStatus, syncAttempts, version
- `packages/backend/src/db/schema/customer-group-members.ts` — drop syncStatus, syncAttempts, version
- `packages/backend/src/db/schema/customer-tags.ts` — drop syncStatus, syncAttempts, version
- `packages/backend/src/db/schema/inventory.ts` — drop syncStatus, syncAttempts, version from products, variants, distribuciones, distribucion_items, cierre_items, variant_inventory
- `packages/backend/src/db/schema/purchases.ts` — drop syncStatus, syncAttempts, version
- `packages/backend/src/db/schema/payments.ts` — drop syncStatus, syncAttempts, version (verify first)
- `packages/backend/src/db/schema/visitas.ts` — drop syncStatus, syncAttempts, version
- `packages/backend/src/db/schema/puntos-venta.ts` — drop syncStatus, syncAttempts, version
- `packages/backend/src/db/schema/suppliers.ts` — drop syncStatus, syncAttempts, version
- `packages/backend/src/db/schema/tags.ts` — drop syncStatus, syncAttempts, version
- `packages/backend/src/db/schema/files.ts` — drop syncStatus, syncAttempts, version (verify first)
- `packages/backend/src/db/schema/product-units.ts` — drop syncStatus, syncAttempts, version
- `packages/backend/src/db/schema/enums.ts` — drop syncStatusEnum
- `packages/backend/src/db/schema/sync-conflicts.ts` — drop entire file

### Repository Files
- All repository files listed above — remove syncStatus/syncAttempts from selects/inserts/updates
- Remove version from updates on tables where version is dropped

### Service Files
- `distribucion.service.ts` — remove syncStatus hardcoding
- `sale.service.ts` — keep version usage

### Seed Files
- `packages/backend/src/seed/index.ts` — remove syncStatus, syncAttempts from inserts
- `packages/backend/src/seed/backfill-sync-operations.ts` — entire file may be obsolete (sync backfill)

### Sync Handler Files
- `packages/backend/src/services/sync-handlers/` — entire directory to be removed in B3

---

## Risk: payment.repository.ts and file.repository.ts version usage

Both repositories implement `expectedVersion` checking but no API endpoint appears to expose this to clients. Need to verify:
1. Check if any API route passes `baseVersion` or `expectedVersion` for payments/files
2. If not, these version fields can be dropped along with their expectedVersion logic

**Verification needed before B2 execution.**

---

## Migration Impact

Dropping columns from ~15 tables. Migration SQL will contain many `DROP COLUMN` statements.

**Data loss**: All syncStatus/syncAttempts/version data will be lost. This is acceptable because:
- syncStatus values are all "synced" in production (the app has been syncing)
- syncAttempts values are mostly 0
- version values for non-sales tables are not used by backend API

**Rollback**: Keep migration file. If rollback needed, restore from backup or re-add columns with defaults.

---

*Report generated for Task B1. Ready for B2 execution.*
