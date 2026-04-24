# Migration Guide

This guide covers breaking changes and migration steps for consuming applications.

## v2.0 Migration (syncGroupId Removal)

### What Changed

- `syncGroupId` field has been removed from all sync types, schemas, and operations
- `fastPath` option in `EnqueueParams` has been removed (it was a no-op)
- Operation ordering is now purely FK-based + entity priority

### Why It Changed

`syncGroupId` was a mechanism to group related operations (e.g., a sale with its items) under a single group ID. This was problematic because:

1. It required the consumer to manually generate and track group IDs
2. It was a second ordering mechanism competing with FK-based ordering
3. The backend `processGroup()` method was deprecated and did nothing

The new approach uses **FK references in payloads** to establish parent-child relationships. For example, a `sale_items` payload contains `saleId: "sale_123"`, which the operation sorter uses to ensure the parent `sale` is processed before the `sale_items`.

### Migration Steps

#### 1. Remove syncGroupId from Your Database Schema

Apply the migration to drop columns and indexes:

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

#### 2. Update Sync Operation Input Types

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

#### 3. Update Backend Handlers

Remove any `syncGroupId` processing from sync handlers:

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

#### 4. Update Service Registration

If your services pass `syncGroupId` to repositories:

```typescript
// Before
repo.create(ctx, { ...data, syncGroupId: payload.syncGroupId });

// After
repo.create(ctx, data);
```

#### 5. Remove syncGroupId from Zod Schemas

```typescript
// Before
const syncOperationSchema = z.object({
  idempotencyKey: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  operation: z.enum(["create", "update", "delete"]),
  payload: z.record(z.unknown()),
  syncGroupId: z.string().optional(), // REMOVE
});

// After
const syncOperationSchema = z.object({
  idempotencyKey: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  operation: z.enum(["create", "update", "delete"]),
  payload: z.record(z.unknown()),
});
```

### How FK-Based Ordering Works Now

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

### Entity Priority Map

Parent entities (priority 1) are always processed before children (priority 2):

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

### Updating Consumer Services

If you have custom services that use the framework's BaseService, update them to:

1. **Remove manual queueSync calls** - the generated services handle this
2. **Remove fastPath from queueSync options** - it no exists
3. **Use generated services for writes** - they handle sync automatically

```typescript
// Before (custom service with manual sync)
class SaleService extends BaseService {
  async createSale(input) {
    await this.pg.query(`INSERT INTO sales (...) VALUES (...)`);
    await this.queueSync("create", saleId, payload, undefined, undefined, {
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

### Removing fastPath

The `fastPath` option in `EnqueueParams` was removed because it was never actually used. The queue always performed the same operations regardless of the flag.

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

### Verifying the Migration

After migrating, verify:

1. **No sync_group_id columns exist** in your PGlite schema
2. **No syncGroupId fields** in operation payloads
3. **Operations are ordered correctly** - parents before children
4. **No fastPath references** in your codebase

Run the operation sorter tests to confirm FK ordering works:

```bash
cd packages/drizzle-sync && bun test src/server/operation-sorter.test.ts
```

All 15 tests should pass.

### Common Issues

#### Issue: Items created before parent sale

**Symptom:** `sale_items` operations fail because the referenced `saleId` doesn't exist yet.

**Cause:** Your code creates items before creating the parent sale.

**Fix:** Always create parent entities before children. The operation sorter will handle the ordering, but the initial INSERT must be done in the correct order locally.

#### Issue: groupCount always 0 in sort results

**Symptom:** After migration, `sort().groupCount` is always 0.

**Cause:** Expected - groupCount tracked syncGroupId groups which no longer exist.

**Fix:** Remove any code that depends on groupCount > 0. The FK-based ordering still ensures correct processing order; groupCount is no longer meaningful.
