# Feature Analysis: Sales Synchronization Flow

## Overview

This report analyzes the sales synchronization flow in Avileo - an offline-first chicken sales management system. The synchronization system enables vendors to work offline while ensuring data consistency when connectivity is restored. This analysis covers the complete flow from frontend (PGlite + ElectricSQL) to backend (PostgreSQL + Drizzle ORM) and identifies potential race conditions, architectural patterns, and improvement opportunities.

## Search Terms Used

- `sale`, `venta`, `sales`, `ventas`
- `sync`, `sincronizacion`, `sync_status`, `syncStatus`
- `abono`, `payment`, `abonos`, `payments`
- `sale_items`, `saleItem`, `item`
- `conflict`, `conflicto`, `race condition`
- `offline`, `queue`, `operation`

## Files Discovered

### Backend

| File | Type | Description |
|------|------|-------------|
| `packages/backend/src/db/schema/sales.ts` | Schema | Sales and sale_items table definitions with sync_status fields |
| `packages/backend/src/db/schema/payments.ts` | Schema | Abonos (payments) table definition |
| `packages/backend/src/db/schema/sync-operations.ts` | Schema | Sync operations tracking table |
| `packages/backend/src/db/schema/sync-conflicts.ts` | Schema | Conflict resolution storage |
| `packages/backend/src/db/schema/enums.ts` | Schema | Enum definitions (sync_status, sale_status, etc.) |
| `packages/backend/src/services/sync/sync.service.ts` | Service | Main sync service orchestrating batch processing |
| `packages/backend/src/services/sync/framework/SyncEngine.ts` | Framework | Core sync engine with transaction management |
| `packages/backend/src/services/sync/framework/ConflictResolver.ts` | Framework | Conflict detection using version/timestamp comparison |
| `packages/backend/src/services/sync/framework/OperationSorter.ts` | Framework | Orders operations by dependencies (sales before items) |
| `packages/backend/src/services/sync/framework/SyncPipeline.ts` | Framework | Validation and execution pipeline |
| `packages/backend/src/services/sync/handlers/SaleSyncHandler.ts` | Handler | Handles sale create/update/delete operations |
| `packages/backend/src/services/sync/handlers/SaleItemSyncHandler.ts` | Handler | Handles sale item operations with total recalculation |
| `packages/backend/src/services/sync/handlers/AbonoSyncHandler.ts` | Handler | Handles payment/abono operations |
| `packages/backend/src/services/sync/handlers/BaseSyncHandler.ts` | Handler | Base class for all sync handlers |
| `packages/backend/src/services/sync/schemas/index.ts` | Schemas | Zod validation schemas for sync operations |
| `packages/backend/src/services/repository/sale.repository.ts` | Repository | Database operations for sales |
| `packages/backend/src/services/repository/payment.repository.ts` | Repository | Database operations for payments |
| `packages/backend/src/api/sync.ts` | API Route | REST endpoints for sync operations |
| `packages/backend/src/services/transitions/sale.ts` | State Machine | Sale state transitions (draft→active→cancelled) |
| `packages/backend/src/services/transitions/sale.test.ts` | Tests | Unit tests for sale state transitions |
| `packages/backend/src/services/business/sale.service.ts` | Service | Business logic for sales |
| `packages/backend/src/services/business/sale.service.test.ts` | Tests | Unit tests for sale service |

### Frontend

| File | Type | Description |
|------|------|-------------|
| `packages/app/app/lib/sync/sync-service.ts` | Service | Frontend sync queue management |
| `packages/app/app/lib/sync/pull-service.ts` | Service | Pulls server changes to local PGlite |
| `packages/app/app/lib/sync/hooks/sales.ts` | Hook | Pre-sync validation for sales |
| `packages/app/app/lib/sync/registry.ts` | Registry | Sync hooks registration |
| `packages/app/app/lib/sync/config.ts` | Config | Sync constants (MAX_RETRIES, BATCH_SIZE, etc.) |
| `packages/app/app/lib/sync/types.ts` | Types | TypeScript type definitions |
| `packages/app/app/lib/sync/change-applier.ts` | Applier | Applies server changes to local DB |
| `packages/app/app/lib/services/sale-service.ts` | Service | Frontend sale CRUD operations |
| `packages/app/app/lib/services/payment-service.ts` | Service | Frontend payment/abono operations |
| `packages/app/app/lib/services/base-service.ts` | Service | Base class with sync queue integration |
| `packages/app/app/lib/db/schemas/sale.ts` | Schema | Frontend sale schema definitions |
| `packages/app/app/hooks/use-sales.ts` | Hook | React hook for sales data |
| `packages/app/app/hooks/use-payments.ts` | Hook | React hook for payments data |
| `packages/app/app/hooks/use-pull-sync.ts` | Hook | React hook for pull synchronization |
| `packages/app/app/hooks/use-sync-status.ts` | Hook | React hook for sync status monitoring |

### Tests

| File | Type | Description |
|------|------|-------------|
| `packages/backend/src/services/transitions/sale.test.ts` | Unit Tests | Sale state machine transitions |
| `packages/backend/src/services/business/sale.service.test.ts` | Unit Tests | Sale service operations |
| `packages/app/e2e/tests/02-sale-credito.spec.ts` | E2E Tests | Credit sale flow testing |
| `packages/app/e2e/tests/03-abono.spec.ts` | E2E Tests | Payment/abono flow testing |
| `packages/app/e2e/tests/04-sale-acuenta.spec.ts` | E2E Tests | Partial payment sale testing |
| `packages/app/e2e/tests/07-order-to-sale.spec.ts` | E2E Tests | Order lifecycle testing |
| `packages/app/e2e/tests/08-order-lifecycle.spec.ts` | E2E Tests | Complete order lifecycle |
| `packages/app/e2e/specs/sales-flow.spec.ts` | E2E Tests | General sales flow |
| `packages/app/e2e/page-objects/NewSalePage.ts` | Page Object | E2E test helper for new sale page |

## Completeness Assessment

### Implemented ✅

1. **Core Sync Infrastructure**
   - ✅ Sync operation queue with status tracking (pending, processing, completed, failed, conflict, dead_letter)
   - ✅ Idempotency key-based deduplication
   - ✅ Batch processing with configurable batch size (50 operations)
   - ✅ Exponential backoff for retries (5 max retries)
   - ✅ Dead letter queue for permanently failed operations
   - ✅ Auto-sync interval (30 seconds)

2. **Sales Entity Sync**
   - ✅ Create sale with items (atomic operation with syncGroupId)
   - ✅ Update sale (status transitions, field updates)
   - ✅ Delete sale (only draft sales)
   - ✅ Sale status workflow: draft → active/confirmed → delivered/cancelled
   - ✅ Version-based conflict detection for sales
   - ✅ Automatic total recalculation when items change

3. **Sale Items Sync**
   - ✅ Create items linked to sales
   - ✅ Update item quantities/prices
   - ✅ Delete items with automatic total adjustment
   - ✅ Dependency ordering (sales created before items)

4. **Abonos/Payments Sync**
   - ✅ Create payment records
   - ✅ Update payment details (proof images, reference numbers)
   - ✅ Delete payments
   - ✅ Timestamp-based conflict detection

5. **Conflict Resolution**
   - ✅ Version-based conflicts for sales (server wins on higher version)
   - ✅ Timestamp-based conflicts for other entities
   - ✅ Conflict persistence in sync_conflicts table
   - ✅ Admin UI for manual conflict resolution (server/local/merge)

6. **Pull Synchronization**
   - ✅ Periodic pull from server (10 second interval)
   - ✅ Cursor-based pagination for changes
   - ✅ Local database updates via change applier
   - ✅ TanStack Query invalidation on changes

7. **Offline-First Patterns**
   - ✅ Local PGlite database for offline storage
   - ✅ Sync status tracking on entities (synced/pending/error)
   - ✅ Operation coalescing (merge multiple updates)
   - ✅ Self-healing (convert update to insert if entity not found)

### Partial or Missing ⚠️

1. **Race Condition Prevention**
   - ⚠️ No distributed locking mechanism for concurrent edits
   - ⚠️ Version check in `confirmPreOrder` and `deliverPreOrder` exists but relies on client-provided baseVersion
   - ⚠️ No optimistic locking at the database level (no `FOR UPDATE` clauses)

2. **Sale Item Conflict Resolution**
   - ⚠️ Uses `NoOpConflictResolver` - no conflict detection for sale items
   - ⚠️ Concurrent edits to sale items could result in inconsistent totals

3. **Payment Sync Edge Cases**
   - ⚠️ No validation that payment amount doesn't exceed customer balance
   - ⚠️ No handling of concurrent payments creating negative balance

4. **Sync Group Atomicity**
   - ⚠️ Operations within a sync group are processed together but failures don't roll back the entire group
   - ⚠️ Individual operation failures in a group can leave partial state

### Not Found ❌

1. **Entity-Level Locking**
   - ❌ No row-level locking during sync operations
   - ❌ No advisory locks for long-running operations

2. **Advanced Conflict Resolution**
   - ❌ No automatic field-level merge strategies
   - ❌ No custom conflict resolution per entity type

3. **Sync Validation**
   - ❌ No pre-sync validation that referenced entities exist
   - ❌ No foreign key constraint validation before sync

## Issues and Risks

### 🔴 Critical Issues

#### 1. Race Condition in Concurrent Sale Updates
- **Location**: `packages/backend/src/services/sync/handlers/SaleSyncHandler.ts:85-120`
- **Description**: The `handleUpdate` method checks if a sale exists and then performs updates, but there's no database-level locking. Two concurrent updates could:
  1. Both read the same version
  2. Both update based on stale data
  3. Result in lost updates
- **Impact**: Data inconsistency, incorrect totals, missing payments
- **Suggestion**: Add `FOR UPDATE` clause when reading the sale, or use atomic update operations with version check in the WHERE clause

#### 2. Sale Item Total Recalculation Race Condition
- **Location**: `packages/backend/src/services/sync/handlers/SaleItemSyncHandler.ts:95-130`
- **Description**: When updating/deleting items, the handler:
  1. Reads the current sale total
  2. Calculates the difference
  3. Updates the sale total
  This is not atomic - concurrent item updates could:
  - Read the same base total
  - Calculate different deltas
  - Apply updates in wrong order
- **Impact**: Incorrect sale totals, balance calculation errors
- **Suggestion**: Use database triggers or atomic UPDATE with calculated expressions instead of read-modify-write

#### 3. Missing Conflict Detection for Sale Items
- **Location**: `packages/backend/src/services/sync/framework/ConflictResolver.ts:290`
- **Description**: Sale items use `NoOpConflictResolver` which never detects conflicts. If two users modify the same item:
  - Last write wins silently
  - No notification of conflict
  - Potential data loss
- **Impact**: Silent data loss on concurrent edits
- **Suggestion**: Implement version-based conflict detection for sale items, or use parent sale version as item version

### 🟡 Medium Issues

#### 4. Payment Balance Validation Gap
- **Location**: `packages/backend/src/services/sync/handlers/AbonoSyncHandler.ts:45-60`
- **Description**: When creating a payment, there's no validation that:
  - The customer exists
  - The payment amount doesn't exceed the debt
  - The related sale exists (if provided)
- **Impact**: Orphaned payments, negative balances
- **Suggestion**: Add business rule validation in `validateBusinessRules` method

#### 5. Sync Group Partial Failure
- **Location**: `packages/backend/src/services/sync/framework/SyncEngine.ts:55-95`
- **Description**: Operations in a sync group are sent together, but if one fails:
  - Other operations in the group may still succeed
  - No rollback mechanism
  - Can leave database in inconsistent state
- **Impact**: Partial data consistency within related operations
- **Suggestion**: Implement group-level transactions or compensating transactions

#### 6. Pull Sync Cursor Management
- **Location**: `packages/app/app/lib/sync/pull-service.ts:35-55`
- **Description**: The pull cursor is stored in localStorage which:
  - Can be cleared by browser
  - Is not atomic with database operations
  - Could result in missed changes if cursor advances but changes fail to apply
- **Impact**: Potential data loss or missed updates
- **Suggestion**: Store cursor in PGlite database as part of the same transaction as change application

### 🟢 Low Issues

#### 7. Inconsistent Error Handling
- **Location**: Multiple files
- **Description**: Some handlers throw errors, others return error results. The pattern is inconsistent.
- **Suggestion**: Standardize on returning result objects with success/error flags

#### 8. Missing Indexes for Sync Queries
- **Location**: `packages/backend/src/db/schema/sales.ts`
- **Description**: No index on `(business_id, version)` which is used for conflict detection
- **Impact**: Slower conflict checks on large datasets
- **Suggestion**: Add composite index for version-based lookups

## Architecture Observations

### Strengths

1. **Layered Architecture**: Clear separation between API, service, repository, and sync framework layers
2. **Idempotency**: All operations use idempotency keys preventing duplicate processing
3. **Savepoint Rollback**: Individual operation failures don't fail the entire batch
4. **Hook System**: Pre-sync hooks allow validation before operations are queued
5. **Comprehensive Logging**: Correlation IDs and detailed logging for debugging
6. **Type Safety**: Strong TypeScript typing throughout the sync system

### Patterns

1. **RequestContext Pattern**: All repository methods receive context first (businessId, userId)
2. **Transaction Passing**: Optional transaction parameter for atomic operations
3. **Sync Grouping**: Related operations grouped by syncGroupId for ordering
4. **Operation Coalescing**: Frontend merges multiple pending operations for same entity
5. **Self-Healing**: Updates automatically converted to inserts if entity not found

### Coupling Concerns

1. **Tight Coupling**: SaleSyncHandler directly creates payments for credit sales (line 75-90)
2. **Cross-Entity Logic**: SaleItemSyncHandler updates sale totals, mixing concerns
3. **Frontend-Backend Schema Duplication**: Schemas defined in both packages

## Recommended Next Steps

### Immediate (High Priority)

1. **Fix Race Condition in Sale Updates**
   ```typescript
   // In SaleRepository.update, add version check to WHERE clause
   await executor
     .update(sales)
     .set({ ...data, updatedAt: new Date(), version: sql`${sales.version} + 1` })
     .where(and(
       eq(sales.id, id), 
       eq(sales.businessId, ctx.businessId),
       eq(sales.version, expectedVersion) // Add this
     ));
   ```

2. **Implement Sale Item Conflict Detection**
   ```typescript
   // In ConflictResolver.ts, add:
   class SaleItemConflictResolver extends BaseTimestampConflictResolver {
     protected getTable() { return saleItems; }
     // Use parent sale's version for conflict detection
   }
   ```

3. **Add Database-Level Locking for Critical Operations**
   ```typescript
   // In SaleSyncHandler.handleUpdate:
   const sale = await tx.query.sales.findFirst({
     where: eq(sales.id, operation.entityId),
     // Add: forUpdate: true
   });
   ```

### Short Term (Medium Priority)

4. **Add Validation for Abono Creation**
   - Check customer exists
   - Validate amount against outstanding balance
   - Verify related sale exists

5. **Implement Group-Level Transactions**
   - Process all operations in a syncGroup within a single transaction
   - Rollback entire group on any failure

6. **Move Cursor Storage to Database**
   - Create sync_cursors table
   - Update cursor atomically with change application

### Long Term (Low Priority)

7. **Add Missing Indexes**
   ```sql
   CREATE INDEX idx_sales_business_version ON sales(business_id, version);
   CREATE INDEX idx_sale_items_business_sale ON sale_items(business_id, sale_id);
   ```

8. **Implement Optimistic UI Updates**
   - Apply changes to UI immediately
   - Rollback on sync failure
   - Show pending state indicators

9. **Add Sync Metrics and Monitoring**
   - Track sync success/failure rates
   - Monitor conflict frequency
   - Alert on high dead letter queue counts

## Conclusion

The sales synchronization flow in Avileo is well-architected with clear separation of concerns, comprehensive error handling, and good offline-first patterns. However, there are **critical race conditions** in concurrent sale and sale item updates that could lead to data inconsistency. The most urgent fixes needed are:

1. Database-level locking or atomic updates for sale modifications
2. Conflict detection for sale items
3. Validation for payment operations

With these fixes, the system should provide reliable synchronization for sales, sale items, and payments in both online and offline scenarios.

---

*Report generated: 2026-03-23*
*Analysis scope: Backend sync framework, frontend sync service, database schema, and E2E tests*
