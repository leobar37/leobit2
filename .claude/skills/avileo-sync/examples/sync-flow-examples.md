# Sync Flow Examples

## Example 1: Creating a Sale with Items (Push)

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
    version: 1,
    createdAt: this.now(),
    updatedAt: this.now(),
  };

  // Insert locally
  await this.pg.insert(sales).values(sale);

  // Queue with syncGroupId
  await this.queueSync("create", id, sale, syncGroupId);

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
      await this.queueSync("create", itemId, itemData, syncGroupId, "sale_items");
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
for (let i = 0; i < sortedOperations.length; i++) {
  const operation = sortedOperations[i];
  const savepointName = `sp_op_${i}`;

  await tx.execute(sql.raw(`SAVEPOINT ${savepointName}`));
  try {
    const result = await this.processOperation(ctx, operation, correlationId, batchCorrelationId, tx, nowIso, registry);
    results.push(result);
    await tx.execute(sql.raw(`RELEASE SAVEPOINT ${savepointName}`));
  } catch (opError) {
    await tx.execute(sql.raw(`ROLLBACK TO SAVEPOINT ${savepointName}`));
    results.push({ success: false, error: opError.message, ... });
  }
}
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
  await this.queueSync("create", itemId, itemData, syncGroupId, "sale_items");

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

## Example 3: Queuing Independent Operations

### When to Use
- Simple entities without children
- Operations that don't need atomicity

### Frontend Code

```typescript
// No syncGroupId needed for independent operations
await this.queueSync("create", customerId, customerData);
// No third argument = no grouping

// Or explicitly pass undefined
await this.queueSync("create", customerId, customerData, undefined);
```

## Example 4: Conflict Resolution

### Flow Summary
1. Client sends operation with localVersion
2. Server detects serverVersion > localVersion
3. Conflict persisted, returned to client
4. Client offers UI: keep server / keep local / merge

### Backend Conflict Detection

```typescript
// packages/backend/src/services/sync/framework/SyncEngine.ts:230-271

const conflictResolver = ConflictResolverRegistry.getResolver(operation.entityType);
const conflict = await conflictResolver.checkConflict(ctx, operation, tx);

if (conflict.hasConflict) {
  // Persist for admin resolution
  await this.syncConflictRepo.create(ctx, {
    operationId: operation.idempotencyKey,
    entityType: operation.entityType,
    entityId: operation.entityId,
    localData: operation.payload,
    serverData: conflict.serverData!,
    localVersion: operation.localVersion,
    serverVersion: conflict.serverVersion!,
    sourceDeviceId: operation.deviceId,
    sourceFingerprint: operation.sourceFingerprint,
  }, tx);

  return {
    idempotencyKey: operation.idempotencyKey,
    success: false,
    conflict: {
      serverVersion: conflict.serverVersion!,
      serverData: conflict.serverData!,
    },
    serverTimestamp: nowIso,
  };
}
```

### Client Resolution

```typescript
// packages/app/app/lib/sync/sync-service.ts

async resolveConflict(
  operationId: string,
  resolution: ConflictStrategy,
  mergedData?: Record<string, unknown>
): Promise<boolean> {
  switch (resolution) {
    case CONFLICT_STRATEGY.SERVER_WINS:
      // Mark completed, discard local
      await this.markCompleted(operationId);
      return true;

    case CONFLICT_STRATEGY.CLIENT_WINS:
      // Retry with local/mixed data
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

    case CONFLICT_STRATEGY.FIELD_MERGE:
      // Apply UI-merged data
      await this.markProcessing(operationId);
      const result = await this.syncOperation({ ...op, payload: mergedData });
      if (result.success) {
        await this.markCompleted(operationId);
        return true;
      }
      return false;

    case CONFLICT_STRATEGY.MANUAL:
      return false;
  }
}
```

## Example 5: Pull Sync (Server → Client)

### Frontend Code

```typescript
// Trigger pull manually
const result = await pullService.pull();
console.log("Pull result:", result);
// { success: true, changesApplied: 5, hasMore: false, error: undefined }

// Force pull now (wait for completion)
const forceResult = await pullService.forcePullNow();

// Check status
const status = pullService.getStatus();
console.log("Pull status:", status);
// { isPulling: false, lastPullTime: Date, lastError: null,
//   consecutiveFailures: 0, cursor: "...", isStuck: false, consecutiveStalePulls: 0 }
```

### Backend: GET /sync/changes

```typescript
// packages/backend/src/services/sync/sync.service.ts:111-192

async getChanges(ctx, since?, limit=100, syncGroupId?, entityTypes?, cursorOperationId?) {
  const effectiveLimit = Math.min(limit, 500);

  // Build where clause with filters
  const baseConditions = [
    eq(syncOperations.businessId, ctx.businessId),
    eq(syncOperations.status, "processed"),
  ];

  if (syncGroupId) {
    baseConditions.push(or(
      eq(syncOperations.syncGroupId, syncGroupId),
      isNull(syncOperations.syncGroupId)
    )!);
  }

  if (since) {
    if (cursorOperationId) {
      baseConditions.push(or(
        gt(syncOperations.processedAt, since),
        and(eq(syncOperations.processedAt, since), gt(syncOperations.operationId, cursorOperationId))
      )!);
    } else {
      baseConditions.push(gt(syncOperations.processedAt, since));
    }
  }

  if (entityTypes && entityTypes.length > 0) {
    baseConditions.push(inArray(syncOperations.entity, entityTypes));
  }

  const operations = await db.query.syncOperations.findMany({
    where: and(...baseConditions),
    orderBy: [asc(syncOperations.processedAt), asc(syncOperations.operationId)],
    limit: effectiveLimit + 1,
  });

  const hasMore = operations.length > effectiveLimit;
  const results = hasMore ? operations.slice(0, effectiveLimit) : operations;

  const nextSince = last?.processedAt && last.operationId
    ? `${last.processedAt.toISOString()}_${last.operationId}`
    : serverTimestamp;

  return {
    changes: results.map(item => ({
      idempotencyKey: item.operationId,
      entityType: item.entity,
      operation: item.action,
      entityId: item.entityId,
      payload: item.payload,
      localTimestamp: item.clientTimestamp.toISOString(),
      processedAt: item.processedAt?.toISOString(),
    })),
    nextSince,
    serverTimestamp,
    hasMore,
  };
}
```

## Example 6: Staged Pull (Initial Sync)

### Frontend Code

```typescript
// packages/app/app/lib/sync/staged-pull-coordinator.ts

async executeStagedPull(): Promise<void> {
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
  const sevenDaysAgo = subDays(new Date(), 7).toISOString();

  // Stage 1: CRITICAL - block UI
  console.log("Stage 1: Loading CRITICAL entities...");
  const stage1 = await pullService.pullWithOptions({
    entityTypes: ["customers", "products", "product_variants"],
    since: thirtyDaysAgo,
  });
  console.log(`CRITICAL done: ${stage1.changesApplied} changes`);

  // Stage 2: RECENT_SALES - block UI
  console.log("Stage 2: Loading RECENT_SALES...");
  const stage2 = await pullService.pullWithOptions({
    entityTypes: ["sales", "sale_items"],
    since: sevenDaysAgo,
  });
  console.log(`RECENT_SALES done: ${stage2.changesApplied} changes`);

  // Stage 3: HISTORICAL - background
  console.log("Stage 3: Loading HISTORICAL in background...");
  pullService.pullWithOptions({
    entityTypes: ["abonos", "purchases", "purchase_items", "distribuciones",
                  "suppliers", "visitas", "tags", "customer_tags",
                  "customer_groups", "customer_group_members"],
    // No since = full history
  });
}
```

## Example 7: Force Sync and Reset

### Frontend Code

```typescript
// Force full sync (push then pull)
await coordinator.forceSync();

// Force reset when stuck
await coordinator.forceResetSync();

// Manual push only
const pushResult = await syncService.processPending(true); // true = ignoreOnlineCheck

// Check if sync is running
console.log("Push running:", syncService.isRunning());
console.log("Pull running:", pullService.isRunning());
```

## Example 8: Backend Handler Pattern (Current)

```typescript
// packages/backend/src/services/sync/handlers/SaleSyncHandler.ts

export class SaleSyncHandler extends BaseSyncHandler {
  readonly entityType = "sales";

  async execute(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<SyncHandlerResult> {
    try {
      if (operation.operation === "create") {
        await this.handleCreate(ctx, operation, tx);
      } else if (operation.operation === "update") {
        await this.handleUpdate(ctx, operation, tx);
      } else if (operation.operation === "delete") {
        await this.handleDelete(ctx, operation, tx);
      } else {
        throw new Error(`Unsupported action: ${operation.operation}`);
      }
      this.logSuccess(ctx, operation);
      return this.createSuccessResult(operation);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logError(ctx, operation, err);
      return this.createErrorResult(operation, err.message);
    }
  }

  async validateBusinessRules(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    operation?: string
  ): Promise<void> {
    this.validatePayload(payload, saleCreateSchema, saleUpdateSchema, operation);
  }

  private async handleCreate(ctx, operation, tx) {
    const parsed = saleCreateSchema.parse(operation.payload);
    // ... create logic using repo
  }

  private async handleUpdate(ctx, operation, tx) {
    const parsed = saleUpdateSchema.parse(operation.payload);
    // ... update logic with version check
    if (existing.version > clientExpectedVersion) {
      throw new Error(`Version conflict: expected ${clientExpectedVersion} but server has ${existing.version}`);
    }
    // ... update logic
  }
}
```
