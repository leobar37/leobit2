# Sync Group ID Deep Dive

## Purpose

`syncGroupId` is a UUID that groups related operations together so they:
1. Are sent to the server in a single batch request
2. Are processed in correct dependency order (parent before children)
3. Can be retried together if any operation fails

## Generation

**Location**: `packages/app/app/lib/services/base-service.ts:140-142`

```typescript
protected generateSyncGroup(): string {
  return crypto.randomUUID();
}
```

## How It Works

### Frontend: Grouping Operations

**Location**: `packages/app/app/lib/sync/sync-service.ts:400-446`

```typescript
// Group operations by sync_group_id
const grouped = new Map<string, SyncOperationRecord[]>();
const ungrouped: SyncOperationRecord[] = [];

for (const op of pendingOps.rows) {
  if (op.sync_group_id) {
    const group = grouped.get(op.sync_group_id);
    if (group) {
      group.push(op);
    } else {
      grouped.set(op.sync_group_id, [op]);
    }
  } else {
    ungrouped.push(op);
  }
}

// For grouped operations, also pull in any siblings not yet in the query
for (const [groupId, ops] of grouped) {
  const allGroupOps = await this.pg.query<SyncOperationRecord>(
    `SELECT *
     FROM sync_operations
     WHERE business_id = $1
       AND sync_group_id = $2
       AND status IN ($3, $4)
       AND sync_attempts < $5
     ORDER BY created_at ASC`,
    // ...
  );
  grouped.set(groupId, allGroupOps.rows);
}

// Sort within each group by entity priority
for (const [groupId, ops] of grouped) {
  const sortedOps = [...ops].sort((a, b) => {
    const priorityA = ENTITY_PRIORITIES[a.entity_type as keyof typeof ENTITY_PRIORITIES] ?? 99;
    const priorityB = ENTITY_PRIORITIES[b.entity_type as keyof typeof ENTITY_PRIORITIES] ?? 99;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
  grouped.set(groupId, sortedOps);
}
```

### Backend: Sorting Operations

**Location**: `packages/backend/src/services/sync/framework/OperationSorter.ts`

```typescript
sort(operations: SyncOperationInput[]): SortResult {
  const sortedOperations = [...operations].sort((a, b) => {
    const aKey = a.syncGroupId ?? "";
    const bKey = b.syncGroupId ?? "";
    if (aKey !== bKey) {
      return aKey > bKey ? 1 : -1;
    }

    const pA = this.entityPriority[a.entityType] ?? 99;
    const pB = this.entityPriority[b.entityType] ?? 99;
    if (pA !== pB) return pA - pB;

    return new Date(a.localTimestamp).getTime() - new Date(b.localTimestamp).getTime();
  });

  const groupCount = new Set(sortedOperations.map((op) => op.syncGroupId)).size;

  return {
    operations: sortedOperations,
    groupCount,
  };
}
```

## Usage in Sale Flow

**Location**: `packages/app/app/lib/services/sale-service.ts`

### Creating a Draft Sale

```typescript
// Generate sync group
const syncGroupId = this.generateSyncGroup();

// Queue sale with syncGroupId
await this.queueSync("create", sale.id, saleData, syncGroupId);

// Queue items with same syncGroupId
for (const item of items) {
  await this.queueSync("create", item.id, itemData, syncGroupId, "sale_items");
}
```

### Creating a Draft Sale (hot-path hardened)

```typescript
await this.queueSync(
  "create",
  saleId,
  payload,
  syncGroupId,
  undefined,
  undefined,
  {
    fastPath: true,
    idempotencyKey: `sale:create:${saleId}`,
  }
);
```

Notes:
- `fastPath` reduces enqueue latency by skipping non-essential prechecks in the immediate path.
- `idempotencyKey` should be stable where duplicate create submission is plausible.
- `syncGroupId` remains required for correct ordering across related entities.

### Item Operations

Items inherit the parent's syncGroupId:

```typescript
// Item/payment operations reuse parent's syncGroupId
await this.queueSync("create", item.id, itemData, syncGroupId, "sale_items");
```

## Usage in Purchase Flow

**Location**: `packages/app/app/lib/services/purchase-service.ts`

```typescript
// Generate sync group
const syncGroupId = this.generateSyncGroup();

// Queue purchase with syncGroupId
await this.queueSync("create", purchase.id, purchaseData, syncGroupId);

// Queue items with same syncGroupId
for (const item of items) {
  await this.queueSync("create", item.id, itemData, syncGroupId, "purchase_items");
}
```

## Database Schema

### Backend Tables

**sales**: `packages/backend/src/db/schema/sales.ts`
```typescript
syncGroupId: varchar("sync_group_id", { length: 100 }),
```

**purchases**: `packages/backend/src/db/schema/purchases.ts`
```typescript
syncGroupId: varchar("sync_group_id", { length: 100 }),
```

**sync_operations**: `packages/backend/src/db/schema/sync-operations.ts`
```typescript
syncGroupId: varchar("sync_group_id", { length: 128 }),
```

### Frontend (PGlite)

**sync_operations**: Created in `packages/app/app/lib/sync/sync-service.ts:260-295`
```sql
CREATE TABLE IF NOT EXISTS sync_operations (
  -- ...
  sync_group_id TEXT,
  -- ...
);
```

## Entity Priority Map

Current priorities from `packages/shared/src/sync-config.ts` (lower = processed first):

| Priority | Entity | Description |
|----------|--------|-------------|
| 1 | `sales` | Parent sale record |
| 1 | `purchases` | Parent purchase record |
| 1 | `products` | Product reference |
| 1 | `customers` | Customer reference |
| 1 | `suppliers` | Supplier reference |
| 1 | `customer_groups` | Customer group |
| 1 | `distribuciones` | Distribution record |
| 1 | `tags` | Tag reference |
| 1 | `visitas` | Visit record |
| 1 | `abonos` | Payment/abono |
| 2 | `sale_items` | Sale line items |
| 2 | `purchase_items` | Purchase line items |
| 2 | `product_variants` | Product variants |
| 2 | `customer_group_members` | Group membership |
| 2 | `customer_tags` | Customer tags |
| 99 | * | Everything else (fallback) |

## When to Use syncGroupId

### DO Use syncGroupId When:
- Creating a parent entity with children (sale + items)
- Creating related entities that should be atomic
- Need to ensure parent is processed before children

### DON'T Use syncGroupId When:
- Entity has no dependencies
- Entities are independent of each other
- Each operation should be synced individually

## Common Issues

### Issue: Operations not grouped
**Cause**: `syncGroupId` not passed to `queueSync()`
**Fix**: Ensure parent entity's syncGroupId is passed to all child operations

### Issue: Items processed before parent
**Cause**: Priority not set correctly in ENTITY_PRIORITIES
**Fix**: Update `packages/shared/src/sync-config.ts` ENTITY_PRIORITIES

### Issue: Group sent but partial failure
**Cause**: Server-side SAVEPOINT per operation allows partial rollback
**Fix**: This is expected behavior — failed ops stay in queue for retry

### Issue: Missing sync_group_id column
**Cause**: Schema not updated with new column
**Fix**:
1. Add column to shared schema (`packages/shared/src/schema.ts`)
2. Add column to backend schema (`packages/backend/src/db/schema/`)
3. Create migration if needed
