# Sync Flow Examples

## Example 1: Creating a Sale with Items

### Flow Summary
1. Generate syncGroupId
2. Insert sale record locally
3. Insert sale_items locally
4. Queue all operations with same syncGroupId

### Frontend Code (SaleService)

```typescript
// packages/app/app/lib/services/sale-service.ts

async createDraft(data: CreateSaleInput): Promise<Sale> {
  const id = this.generateId();
  const syncGroupId = this.generateSyncGroup(); // NEW: Generate group ID

  const sale = {
    id,
    businessId: this.businessId,
    customerId: data.customerId,
    sellerId: data.sellerId,
    type: data.type || "instant_sale",
    saleType: data.saleType || "contado",
    totalAmount: String(data.totalAmount),
    amountPaid: String(data.amountPaid || 0),
    balanceDue: String(data.totalAmount - (data.amountPaid || 0)),
    status: "draft",
    syncStatus: "pending",
    syncAttempts: 0,
    createdAt: this.now(),
    updatedAt: this.now(),
  };

  // Insert locally
  await this.pg.insert(sales).values(sale);

  // Queue with syncGroupId
  await this.queueSync("insert", id, sale, syncGroupId);

  // Create items if provided
  if (data.items && data.items.length > 0) {
    for (const item of data.items) {
      const itemId = this.generateId();
      const itemData = {
        id: itemId,
        saleId: id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
        subtotal: String(item.subtotal),
        syncStatus: "pending",
        syncAttempts: 0,
      };

      await this.pg.insert(saleItems).values(itemData);

      // Queue item with SAME syncGroupId
      await this.queueSync("insert", itemId, itemData, syncGroupId, "sale_items");
    }
  }

  return sale;
}
```

### Backend Processing

```typescript
// packages/backend/src/services/sync/framework/SyncEngine.ts

// 1. OperationSorter sorts operations:
//    - sales (priority 1) comes before sale_items (priority 2)
//    - Same syncGroupId groups them together

// 2. Each operation runs in a SAVEPOINT:
//    for (const operation of sortedOperations) {
//      await tx.execute(sql.raw(`SAVEPOINT sp_${i}`));
//      try {
//        const handler = HandlerRegistry.getHandler(operation.entityType);
//        const result = await handler.execute(operation);
//        results.push(result);
//        await tx.execute(sql.raw(`RELEASE SAVEPOINT sp_${i}`));
//      } catch (error) {
//        await tx.execute(sql.raw(`ROLLBACK TO SAVEPOINT sp_${i}`));
//        // Next operation continues
//      }
//    }
```

## Example 2: Adding Item to Existing Sale

### Flow Summary
1. Find sale's syncGroupId (or generate new one)
2. Insert new item locally
3. Queue item with sale's syncGroupId

### Frontend Code

```typescript
async addItem(saleId: string, item: CreateSaleItemInput): Promise<SaleItem> {
  const itemId = this.generateId();

  // Try to find existing syncGroupId from sale
  const saleResult = await this.pg.query(
    `SELECT sync_group_id FROM sales WHERE id = $1`,
    [saleId]
  );
  const existingGroupId = saleResult.rows[0]?.sync_group_id;
  const syncGroupId = existingGroupId || this.generateSyncGroup();

  const itemData = {
    id: itemId,
    saleId,
    productId: item.productId,
    variantId: item.variantId,
    productName: item.productName,
    variantName: item.variantName,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    subtotal: String(item.subtotal),
    syncStatus: "pending",
    syncAttempts: 0,
  };

  await this.pg.insert(saleItems).values(itemData);

  // Queue with sale's syncGroupId (or new group if sale has none)
  await this.queueSync("insert", itemId, itemData, syncGroupId, "sale_items");

  // If sale had no syncGroupId, update it
  if (!existingGroupId) {
    await this.pg.exec(
      `UPDATE sales SET sync_group_id = $1 WHERE id = $2`,
      [syncGroupId, saleId]
    );
  }

  return itemData;
}
```

## Example 3: Creating Sync Hook

### Flow Summary
1. Define hook condition
2. Hook runs before sync enqueue
3. Can block sync if conditions not met

### Frontend Code

```typescript
// packages/app/app/lib/sync/hooks/sales.ts

import { createHook, type SyncHookContext } from "../create-sync-hook";

export const saleSyncHook = createHook("sales")
  .onBeforeSync(async (context: SyncHookContext, options: { pg: PGlite; businessId: string }) => {
    // Only validate inserts
    if (context.operation !== "insert") {
      return { allow: true };
    }

    // Check if sale has customer OR items
    const hasCustomer = Boolean(context.data.customerId);

    const pg = options.pg;
    const businessId = options.businessId;

    const itemsResult = await pg.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM sale_items WHERE sale_id = $1 AND business_id = $2`,
      [context.entityId, businessId]
    );
    const hasItems = (itemsResult.rows[0]?.count ?? 0) > 0;

    if (hasCustomer || hasItems) {
      return { allow: true };
    }

    return {
      allow: false,
      reason: "Venta vacía: sin cliente ni productos",
    };
  })
  .build();
```

### Registering Hook

```typescript
// packages/app/app/lib/sync/registry.ts

import { saleSyncHook } from "./hooks/sales";

const registeredHooks: SyncHook[] = [
  saleSyncHook,
  // purchaseSyncHook removed - drafts now sync with items
];

export async function runSyncHooks(
  entityType: string,
  context: SyncHookContext,
  options: { pg: PGlite; businessId: string }
): Promise<SyncHookResult> {
  const hooks = registeredHooks.filter((hook) => hook.entityType === entityType);

  for (const hook of hooks) {
    const result = await hook.condition(context, options);
    if (!result.allow) {
      return result;
    }
  }

  return { allow: true };
}
```

## Example 4: Queueing Independent Operations

### When to Use
- Simple entities without children
- Operations that don't need atomicity

### Frontend Code

```typescript
// No syncGroupId needed for independent operations
await this.queueSync("insert", customerId, customerData);
// No third argument = no grouping

// Or explicitly pass undefined
await this.queueSync("insert", customerId, customerData, undefined);
```

## Example 5: Backend Conflict Resolution

### Flow Summary
1. Client sends operation with localVersion
2. Server checks if serverVersion > localVersion
3. If conflict, return conflict with server data
4. Client can resolve (server wins, local wins, or merge)

### Backend Code

```typescript
// packages/backend/src/services/sync/framework/ConflictResolver.ts

async checkConflict(
  ctx: RequestContext,
  operation: SyncOperationInput,
  tx: DbTransaction
): Promise<{ hasConflict: boolean; serverVersion?: number; serverData?: Record<string, unknown> }> {
  const { entityType, entityId, localVersion } = operation;

  // Get current server version
  const handler = HandlerRegistry.getHandler(entityType, this.deps);
  const serverEntity = await handler.getById(ctx, entityId, tx);

  if (!serverEntity) {
    return { hasConflict: false };
  }

  const serverVersion = serverEntity.version || 0;

  // Conflict if server has newer version
  if (serverVersion > localVersion) {
    return {
      hasConflict: true,
      serverVersion,
      serverData: serverEntity,
    };
  }

  return { hasConflict: false };
}
```

### Resolution Strategies

```typescript
// packages/app/app/lib/sync/sync-service.ts

async resolveConflict(
  operationId: string,
  resolution: ConflictStrategy,
  mergedData?: Record<string, unknown>
): Promise<boolean> {
  switch (resolution) {
    case CONFLICT_STRATEGY.SERVER_WINS:
      // Just mark as completed, discard local
      await this.markCompleted(operationId);
      return true;

    case CONFLICT_STRATEGY.CLIENT_WINS:
      // Retry with merged data
      await this.markProcessing(operationId);
      const result = await this.syncOperation({
        ...op,
        payload: mergedData || parsePayload(op.payload),
      });
      if (result.success) {
        await this.markCompleted(operationId);
        return true;
      }
      return false;

    case CONFLICT_STRATEGY.MANUAL:
      // Don't auto-resolve, show UI to user
      return false;
  }
}
```

## Example 6: Manual Sync Trigger

### Frontend Code

```typescript
// Trigger manual sync
async function manualSync() {
  try {
    // Process pending uploads
    const pushResult = await syncService.processPending();
    console.log("Push result:", pushResult);

    // Pull latest from server
    await pullService.pull();
    console.log("Pull completed");

  } catch (error) {
    console.error("Sync failed:", error);
  }
}

// In UI
<Button onClick={manualSync}>
  Sync Now
</Button>
```

## Example 7: Checking Sync Status

### Frontend Code

```typescript
async function checkSyncHealth() {
  // Get queue status
  const status = await syncService.getStatus();
  console.log("Queue status:", status);
  // { pending: 5, processing: 0, completed: 100, failed: 2, ... }

  // Get failed operations
  const failed = await syncService.getFailedOperations();
  console.log("Failed ops:", failed.map(op => ({
    entityType: op.entity_type,
    entityId: op.entity_id,
    error: op.last_error,
    attempts: op.sync_attempts,
  })));

  // Get dead letter queue
  const dlq = await syncService.getDeadLetterOperations();
  console.log("DLQ:", dlq);
}
```

## Example 8: Backend Batch Processing

### API Endpoint

```typescript
// packages/backend/src/api/sync.ts

.post("/batch", async ({ syncService, ctx, body }) => {
  // Enforce max batch size
  if (body.operations.length > MAX_BATCH_SIZE) {
    return {
      success: false,
      error: { code: "BATCH_TOO_LARGE", ... }
    };
  }

  // Validate operations
  for (const op of body.operations) {
    if (!op.idempotencyKey || !op.entityId) {
      return { success: false, error: { code: "INVALID_OPERATION", ... } };
    }
  }

  // Process batch
  const result = await syncService.processBatch(ctx, body.operations);

  return { success: true, data: result };
})
```

### Processing Flow

```typescript
// packages/backend/src/services/sync/sync.service.ts

async processBatch(ctx: RequestContext, operations: SyncOperationInput[]): Promise<SyncBatchResult> {
  // 1. Sort operations by syncGroupId and priority
  const sorter = new OperationSorter();
  const { operations: sortedOps } = sorter.sort(operations);

  const results: SyncOperationResult[] = [];

  // 2. Process with SAVEPOINTs per operation
  await db.transaction(async (tx) => {
    for (let i = 0; i < sortedOps.length; i++) {
      const op = sortedOps[i];
      const savepointName = `sp_op_${i}`;

      try {
        await tx.execute(sql.raw(`SAVEPOINT ${savepointName}`));

        const result = await this.processOperation(ctx, op, tx);
        results.push(result);

        await tx.execute(sql.raw(`RELEASE SAVEPOINT ${savepointName}`));
      } catch (error) {
        await tx.execute(sql.raw(`ROLLBACK TO SAVEPOINT ${savepointName}`));
        results.push({
          idempotencyKey: op.idempotencyKey,
          success: false,
          error: error.message,
        });
      }
    }
  });

  return {
    results,
    summary: {
      total: results.length,
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      conflicts: results.filter(r => r.conflict).length,
    }
  };
}
```
