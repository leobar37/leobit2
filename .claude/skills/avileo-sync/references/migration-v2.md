# Migration Guide: syncGroupId Removal (v2)

This guide covers migrating from the old sync pattern (with `syncGroupId`) to the new FK-based ordering.

**Source**: `packages/drizzle-sync/docs/11-migration-v2.md`

## What Changed

- `syncGroupId` field removed from all sync types, schemas, and operations
- `fastPath` option in `EnqueueParams` removed (was a no-op)
- Operation ordering now purely FK-based + entity priority

## Why It Changed

`syncGroupId` was problematic because:
1. Required manual generation and tracking of group IDs
2. Second ordering mechanism competing with FK-based ordering
3. Backend `processGroup()` method was deprecated and did nothing

**New approach**: FK references in payloads establish parent-child relationships. Example: `sale_items` payload contains `saleId: "sale_123"`, which the operation sorter uses to ensure parent `sale` is processed first.

## Migration Steps

### 1. Remove sync_group_id from Database Schema

```sql
-- For sales and sale_items
DROP INDEX IF EXISTS idx_sale_items_sync_group_id;
ALTER TABLE sale_items DROP COLUMN IF EXISTS sync_group_id;
ALTER TABLE sales DROP COLUMN IF EXISTS sync_group_id;

-- For purchases and purchase_items
DROP INDEX IF EXISTS idx_purchases_sync_group_id;
DROP INDEX IF EXISTS idx_purchase_items_sync_group_id;
ALTER TABLE purchase_items DROP COLUMN IF EXISTS sync_group_id;
ALTER TABLE purchases DROP COLUMN IF EXISTS sync_group_id;
```

### 2. Update Sync Operation Input Types

Remove `syncGroupId` from any operation input interfaces:

```typescript
// Before
interface MySyncInput {
  idempotencyKey: string;
  entityType: string;
  entityId: string;
  operation: "create" | "update" | "delete";
  payload: Record<string, unknown>;
  syncGroupId?: string; // REMOVE THIS
}

// After
interface MySyncInput {
  idempotencyKey: string;
  entityType: string;
  entityId: string;
  operation: "create" | "update" | "delete";
  payload: Record<string, unknown>;
}
```

### 3. Update Backend Handlers

```typescript
// Before
async handleCreate(ctx, operation, tx) {
  await this.repo.create(ctx, {
    ...operation.payload,
    syncGroupId: operation.syncGroupId ?? null,
  });
}

// After
async handleCreate(ctx, operation, tx) {
  await this.repo.create(ctx, operation.payload);
}
```

### 4. Remove fastPath from queueSync Options

```typescript
// Before (no-op flag)
await syncService.enqueue({
  entity_type: "sales",
  entityId: id,
  operation: "create",
  data: payload,
  fastPath: true, // REMOVE - does nothing
});

// After
await syncService.enqueue({
  entity_type: "sales",
  entityId: id,
  operation: "create",
  data: payload,
});
```

### 5. Use Generated Services for Writes

```typescript
// Before (custom service with manual sync)
class SaleService extends BaseService {
  async createSale(input) {
    await this.pg.query(`INSERT INTO sales (...) VALUES (...)`);
    await this.queueSync("create", saleId, payload, undefined, undefined, undefined, {
      fastPath: true,
      idempotencyKey: `sale:create:${saleId}`,
    });
  }
}

// After (use generated service)
class SaleService extends BaseService {
  constructor(engine: SyncClientEngineLike) {
    super(engine);
    this.generatedSalesService = new GeneratedSalesService(engine);
  }

  async createSale(input) {
    return this.generatedSalesService.create(input);
  }
}
```

## How FK-Based Ordering Works

The operation sorter builds a dependency graph from FK references in payloads:

```typescript
// sale_items payload contains saleId FK reference
{ saleId: "sale_123", productId: "prod_1", quantity: 5 }

// sales payload contains customerId FK reference
{ customerId: "cust_1", totalAmount: 100 }

Operation sorter ordering:
1. sales (no FK dependencies, priority 1)
2. sale_items (depends on sales via saleId, priority 2)
3. abonos (depends on sales via relatedSaleId, priority 2)
```

## Entity Priority Map

Parent entities (priority 1) always processed before children (priority 2):

| Priority 1 (Parents) | Priority 2 (Children) |
|---------------------|----------------------|
| sales | sale_items |
| purchases | purchase_items |
| customers | customer_tags |
| products | product_variants |
| distribuciones | distribucion_items |
| tags | customer_group_members |
| visitas | abonos |
| suppliers | |

## Common Issues

### Issue: Items created before parent sale

**Symptom:** `sale_items` operations fail because the referenced `saleId` doesn't exist yet.

**Cause:** Your code creates items before creating the parent sale.

**Fix:** Always create parent entities before children. The operation sorter handles ordering, but the initial INSERT must be in correct order locally.

### Issue: groupCount always 0 in sort results

**Symptom:** After migration, `sort().groupCount` is always 0.

**Cause:** Expected — groupCount tracked syncGroupId groups which no longer exist.

**Fix:** Remove any code that depends on groupCount > 0. FK-based ordering still ensures correct processing order.

## Verifying the Migration

After migrating, verify:

1. **No sync_group_id columns exist** in your PGlite schema
2. **No syncGroupId fields** in operation payloads
3. **Operations are ordered correctly** — parents before children
4. **No fastPath references** in your codebase

Run the operation sorter tests:

```bash
cd packages/drizzle-sync && bun test src/server/operation-sorter.test.ts
```

All tests should pass.

## Current App Migration Status

The Avileo app still uses the old sync pattern with `syncGroupId`. See `packages/app/app/lib/services/` for services that need migration:

**Priority migration items:**
1. Remove `sync_group_id` columns from local PGlite schema
2. Update `BaseService.queueSync()` to remove syncGroupId parameter
3. Update frontend services to use FK-based ordering
4. Remove `fastPath` option from all `EnqueueParams`
5. Update `packages/app/app/lib/sync/sync-service.ts` to remove syncGroupId grouping logic

**Key files to update:**
- `packages/app/app/lib/services/base-service.ts` — remove `generateSyncGroup()`
- `packages/app/app/lib/services/sale-service.ts` — update sale flow
- `packages/app/app/lib/services/purchase-service.ts` — update purchase flow
- `packages/app/app/lib/sync/sync-service.ts` — remove grouping logic
