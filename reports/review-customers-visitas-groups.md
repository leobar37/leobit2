# Deep Review: Customers, Visitas & Customer Groups Modules

## Executive Summary

**Critical blocker found**: The three new tables (`customer_groups`, `customer_group_members`, `visitas`) are **not created in the local PGlite database** (`packages/app/app/engine/db.ts` → `createTables()`). All offline operations for Visitas and Customer Groups will fail with a "table does not exist" error at runtime. Additionally, the pull-sync shape configuration (`shape-config.ts`) is missing entries for these three tables, so server-to-client sync will never deliver data for these entities.

---

## Module 1: Customers

### Data Model
- **Backend schema**: `packages/backend/src/db/schema/customers.ts`
- **Local schema (Zod)**: `packages/app/app/lib/db/schema.ts` → `customerSchema`
- **Shared Drizzle schema**: `packages/shared/src/schema.ts` → `customers` table
- Fields: `id`, `name`, `dni`, `phone`, `address`, `notes`, `syncStatus`, `syncAttempts`, `businessId`, `createdBy`, `createdAt`, `updatedAt`

### Offline Creation Flow
1. `CustomerService.create()` generates UUID, inserts into local PGlite, queues sync op via `BaseService.queueSync()`
2. Sync op goes into `sync_operations` table as `pending`
3. `SyncService.processPending()` picks it up and sends to `/sync/batch`
4. Backend `CustomerSyncHandler.handleCreate()` validates with `customerCreateSchema` and inserts via `CustomerRepository.create()`

### Sync Flow Analysis
- **Push (client→server)**: ✅ Well-implemented. Coalescing logic merges consecutive insert+update into single insert; insert+delete cancels.
- **Pull (server→client)**: ✅ `pull-service.ts` handles `customers` table. VALID_TABLES includes "customers".
- **Shape config**: ✅ Customers have priority 10 (synced first).
- **Self-healing**: ✅ `SELF_HEAL_INSERTABLE_ENTITIES` includes "customers" — if an update fails with "not found", it converts to insert.
- **Conflict resolver**: ✅ `TimestampConflictResolver` for customers — compares `updatedAt` timestamps. Server wins if server timestamp is newer.

### Duplicate Prevention
- **⚠️ NO duplicate prevention**: There are no unique constraints on `name`, `phone`, or `dni` in the customers table. Two customers with the same name/phone can be created.
- Backend `CustomerRepository.findByDni()` exists but is never called during creation — only as a standalone query.
- The `CustomerSyncHandler.handleCreate()` doesn't check for existing customers with same name/phone before inserting.

### Conflict Resolution
- **Implemented**: `TimestampConflictResolver` compares `updatedAt` timestamps for update operations.
- **⚠️ Last-write-wins strategy**: If the customer was edited both offline and on server, the server version "wins" only if its timestamp is newer. The client-side `SyncService` then marks it as "conflict" and relies on manual resolution — but there's no UI for conflict resolution.
- **⚠️ No field-level merge**: The entire customer record is either accepted or rejected — no per-field merge.

### Sync Status Update
- **✅** `SYNC_STATUS_ENTITY_TABLES` includes "customers", so when sync completes, the local customer row's `sync_status` is updated to "synced".

### Issues Found
1. **No duplicate prevention** — same customer can be created offline and on server simultaneously
2. **No conflict resolution UI** — conflicts are detected but the resolution path (`resolveConflict`) has no frontend UI
3. **`createdBy` is always null** in offline-created customers (`customer.createdBy: null` in `CustomerService.create()`)

---

## Module 2: Visitas (Visits)

### Data Model
- **Backend schema**: `packages/backend/src/db/schema/visitas.ts`
- **Shared Drizzle schema**: `packages/shared/src/schema.ts` → `visitas` table
- Fields: `id`, `businessId`, `distribucionId`, `customerId`, `vendedorId`, `status`, `motivoNoCompra`, `saleId`, `syncStatus`, `syncAttempts`, `createdAt`, `updatedAt`
- FKs: `distribuciones.id`, `customers.id`, `business_users.id`, `sales.id`

### 🚨 CRITICAL: Local PGlite Table Missing
- **File**: `packages/app/app/engine/db.ts` → `createTables()`
- **Issue**: The `visitas` table is **NOT created** in the local PGlite database.
- **Impact**: Any call to `VisitaService.create()`, `findByDistribucion()`, etc. will fail with a SQL error "relation 'visitas' does not exist".
- **All offline operations for visitas are broken.**

### 🚨 CRITICAL: Pull Sync Not Configured
- **File**: `packages/app/app/lib/sync/shape-config.ts` → `SHAPES_CONFIG`
- **Issue**: No entry for `visitas` in `SHAPES_CONFIG`. The table IS in `VALID_TABLES` set in `pull-service.ts`, but without a shape config entry, pull sync will never request visitas data from the server.

### Offline Creation Flow (if table existed)
1. `VisitaService.create()` generates UUID, inserts locally, queues sync
2. **⚠️ Bug**: `vendedorId` is set to `this.businessId` instead of the actual vendor/user ID. This is the `businessId` (a business UUID), not a `business_users.id`. The backend schema requires `vendedorId` to reference `business_users.id`.
3. Sync payload only includes `distribucionId`, `customerId`, `status` — missing `vendedorId`
4. Backend `VisitaSyncHandler.handleCreate()` calls `visitaRepo.create()` which properly sets `vendedorId = ctx.businessUserId`

### Sync Flow
- **Push**: The handler is registered (`HandlerRegistry.register("visitas", ...)`). Backend handler works correctly.
- **Pull**: Missing from shape config — server→client sync won't deliver visitas.
- **Conflict resolver**: Uses `NoOpConflictResolver` (default fallback) — **no conflict detection** for visitas.

### FK Integrity Risks
- `customerId` references `customers.id` — if a customer hasn't synced yet, the backend create will fail with FK violation (see Cross-entity section below).
- `distribucionId` references `distribuciones.id` — same issue if distribution hasn't synced.
- `saleId` references `sales.id` — same issue for linking a sale to a visita.

### Issues Found
1. 🚨 **Table not created in local PGlite** — all offline operations broken
2. 🚨 **Not in pull sync shape config** — server data never reaches client
3. **`vendedorId` bug** — set to `businessId` instead of actual user ID in `VisitaService.create()`
4. **No duplicate visit prevention** — can create multiple visits for same customer+distribution offline
5. **No conflict resolution** — uses NoOp conflict resolver
6. **`createBulk` is N+1** — loops and does individual inserts + individual findById for each

---

## Module 3: Customer Groups

### Data Model
- **Backend schema**: `packages/backend/src/db/schema/customer-groups.ts` + `customer-group-members.ts`
- **Shared Drizzle schema**: `packages/shared/src/schema.ts`
- Groups: `id`, `name`, `businessId`, `syncStatus`, `syncAttempts`, `createdAt`, `updatedAt`
- Members (junction): `id`, `groupId`, `customerId`, `addedBy`, `syncStatus`, `syncAttempts`, `addedAt`

### 🚨 CRITICAL: Local PGlite Tables Missing
- **File**: `packages/app/app/engine/db.ts` → `createTables()`
- **Issue**: Neither `customer_groups` NOR `customer_group_members` tables are created in the local PGlite database.
- **Impact**: All `CustomerGroupService` operations will fail with SQL errors.
- **All offline operations for customer groups are broken.**

### 🚨 CRITICAL: Pull Sync Not Configured
- **File**: `packages/app/app/lib/sync/shape-config.ts` → `SHAPES_CONFIG`
- **Issue**: No entries for `customer_groups` or `customer_group_members`. Server data will never reach the client.

### Offline Operations (if tables existed)
- Group CRUD works through `CustomerGroupService` → `BaseService.queueSync()`
- Member operations use composite entityId: `${groupId}_${customerId}` — this is significant because:

### ⚠️ Member Sync: Composite Entity ID Issue
- **File**: `packages/app/app/lib/services/customer-group-service.ts` lines for `addMembers` and `removeMember`
- When adding a member, `queueSync("insert", `${groupId}_${customerId}`, { groupId, customerId })`
- The `entityId` is `${groupId}_${customerId}` — a concatenated string, NOT a UUID
- The backend `CustomerGroupMemberSyncHandler.handleCreate()` uses `operation.payload` (groupId, customerId) to call `customerGroupRepo.addMembers()` — it does NOT use `operation.entityId`
- This means the composite entityId works for coalescing/idempotency, but will fail for:
  - Pull sync updates (the entityId won't match any actual record ID)
  - Self-healing (would try to find a record with this composite ID)
  - The `sync_operations` tracking on the backend uses this entityId to record processing

### Sync Flow
- **Push**: Handlers registered (`customer_groups`, `customer_group_members`). Backend handlers work.
- **Pull**: Missing from shape config.
- **Conflict resolver**: Uses `NoOpConflictResolver` (default) — no conflict detection.

### Group Delete Behavior
- Frontend `CustomerGroupService.delete()` manually deletes members first, then the group, then queues ONE delete operation for the group only
- **⚠️** Member deletions are NOT synced when deleting a group — relies on backend cascade delete (schema has `onDelete: 'cascade'`)
- This works if the group exists on the server, but if the group was created offline and never synced, the delete sync op will fail silently (backend handler returns early if not found)

### Issues Found
1. 🚨 **Tables not created in local PGlite** — all offline operations broken
2. 🚨 **Not in pull sync shape config** — server data never reaches client
3. **Composite entityId for members** — won't work correctly with pull sync or self-healing
4. **No conflict resolution** — uses NoOp conflict resolver
5. **Group deletion doesn't sync member removals** — relies on server cascade
6. **`addedBy` set to `businessId`** — should be the actual user ID (`businessUserId`)
7. **`getMemberCount` uses `result.length` instead of SQL COUNT** — N+1 query pattern

---

## Cross-Entity Concerns

### FK Integrity During Sync

**Problem**: Entities reference each other via foreign keys, but sync operations are processed independently without dependency ordering.

#### Scenario 1: Visita references unsynced customer
1. User creates customer offline (sync_status: pending)
2. User creates visita for that customer offline
3. Visita sync may be processed BEFORE customer sync
4. Backend: `visitas.customer_id` FK to `customers.id` → **FK violation error**

#### Scenario 2: Group member references unsynced customer
1. User creates customer offline
2. User adds customer to a group offline
3. Member sync processes before customer sync
4. Backend: `customer_group_members.customer_id` FK → **FK violation error**

#### Scenario 3: Visita references unsynced distribution
1. Distribution created offline
2. Visita created for that distribution
3. Visita syncs first → `distribuciones.id` FK violation

#### Scenario 4: Visita with sale link
1. Sale created offline
2. Visita updated with `saleId` link
3. Visita sync processes before sale sync
4. `sales.id` FK violation (though `saleId` is nullable, the backend will try to set it)

### Dependency Ordering Analysis

**Current state**: No dependency ordering for push sync. The `SyncService.processPending()` processes operations in `created_at ASC` order. It groups by `sync_group_id` if present, but individual entity services do NOT set `syncGroupId` for cross-entity operations.

**What's needed**: Either:
1. Sync operations should respect entity dependency order (customers before visitas/groups)
2. OR the backend should handle FK violations gracefully (e.g., retry after creating the dependency)
3. OR use `sync_group_id` to batch related operations together

**Current mitigation**: 
- Backend uses SAVEPOINTs per operation, so one failure doesn't abort the batch
- Failed operations are retried up to 5 times with exponential backoff
- After 5 failures → dead letter queue
- Self-healing exists only for `sales` and `customers` (not visitas/groups)

### Missing `SYNC_STATUS_ENTITY_TABLES` Entries
- **File**: `packages/app/app/lib/sync/sync-service.ts` line 120
- Only `"sales"` and `"customers"` are in `SYNC_STATUS_ENTITY_TABLES`
- This means when visitas/groups sync completes, their local `sync_status` field is NOT updated to "synced"
- Similarly, `SELF_HEAL_INSERTABLE_ENTITIES` only covers sales and customers

---

## Summary of All Issues

### 🚨 Critical (Blocks Feature)
| # | Module | Issue | File |
|---|--------|-------|------|
| 1 | Visitas | `visitas` table NOT created in local PGlite | `engine/db.ts` → `createTables()` |
| 2 | Groups | `customer_groups` table NOT created in local PGlite | `engine/db.ts` → `createTables()` |
| 3 | Groups | `customer_group_members` table NOT created in local PGlite | `engine/db.ts` → `createTables()` |
| 4 | Visitas | Missing from `SHAPES_CONFIG` for pull sync | `lib/sync/shape-config.ts` |
| 5 | Groups | Missing from `SHAPES_CONFIG` for pull sync | `lib/sync/shape-config.ts` |

### ⚠️ High (Data Integrity)
| # | Module | Issue | File |
|---|--------|-------|------|
| 6 | Cross-entity | No FK dependency ordering in push sync | `lib/sync/sync-service.ts` |
| 7 | Visitas | `vendedorId` set to `businessId` instead of user ID | `lib/services/visita-service.ts` |
| 8 | Groups | `addedBy` set to `businessId` instead of user ID | `lib/services/customer-group-service.ts` |
| 9 | Groups | Composite entityId for members won't work with pull sync | `lib/services/customer-group-service.ts` |
| 10 | All three | Missing from `SYNC_STATUS_ENTITY_TABLES` — sync_status never updated locally | `lib/sync/sync-service.ts` |
| 11 | All three | Missing from `SELF_HEAL_INSERTABLE_ENTITIES` — no self-healing for these entities | `lib/sync/sync-service.ts` |

### ⚠️ Medium (Functional)
| # | Module | Issue | File |
|---|--------|-------|------|
| 12 | Customers | No duplicate prevention (name, phone, DNI) | `services/customer-service.ts` |
| 13 | Customers | No conflict resolution UI | N/A |
| 14 | Customers | `createdBy` always null for offline-created customers | `services/customer-service.ts` |
| 15 | Visitas | No duplicate visit prevention (same customer+distribution) | `services/visita-service.ts` |
| 16 | Visitas | `createBulk` is N+1 pattern | `services/visita-service.ts` |
| 17 | Groups | Group deletion doesn't sync member removals individually | `services/customer-group-service.ts` |
| 18 | Groups | `getMemberCount` uses array length instead of COUNT | `services/customer-group-service.ts` |
| 19 | Visitas/Groups | No conflict resolution registered | `framework/ConflictResolver.ts` |

---

## Code References

| Resource | Path |
|----------|------|
| Local DB table creation (MISSING tables) | `packages/app/app/engine/db.ts` → `createTables()` |
| Shape config (MISSING entries) | `packages/app/app/lib/sync/shape-config.ts` → `SHAPES_CONFIG` |
| Customer service | `packages/app/app/lib/services/customer-service.ts` |
| Visita service | `packages/app/app/lib/services/visita-service.ts` |
| Customer group service | `packages/app/app/lib/services/customer-group-service.ts` |
| Sync service (push) | `packages/app/app/lib/sync/sync-service.ts` |
| Pull service | `packages/app/app/lib/sync/pull-service.ts` |
| Backend customer sync handler | `packages/backend/src/services/sync/handlers/CustomerSyncHandler.ts` |
| Backend visita sync handler | `packages/backend/src/services/sync/handlers/VisitaSyncHandler.ts` |
| Backend group sync handler | `packages/backend/src/services/sync/handlers/CustomerGroupSyncHandler.ts` |
| Backend member sync handler | `packages/backend/src/services/sync/handlers/CustomerGroupMemberSyncHandler.ts` |
| Conflict resolvers | `packages/backend/src/services/sync/framework/ConflictResolver.ts` |
| Sync config constants | `packages/app/app/lib/sync/config.ts` |
