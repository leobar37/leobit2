# PGlite + Electric + Drizzle Reference

> **Patterns, anti-patterns, and implementation guidelines for Avileo's current hybrid sync architecture**

## Table of Contents
1. [Core Patterns](#core-patterns)
2. [Current File Map](#current-file-map)
3. [Frontend Write Queue Patterns](#frontend-write-queue-patterns)
4. [Backend Sync Framework Patterns](#backend-sync-framework-patterns)
5. [Anti-Patterns](#anti-patterns)
6. [Schema Design Patterns](#schema-design-patterns)
7. [Read Sync Patterns](#read-sync-patterns)
8. [Error Handling Patterns](#error-handling-patterns)
9. [Lessons Learned](#lessons-learned)

---

## Core Patterns

### PATTERN 1: Shared Schema Definition

**DO THIS:**
- Define schema once, use everywhere
- Keep schema in a shared package or mirrored backend/frontend definitions
- Export types from schema for type safety

```typescript
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
```

---

### PATTERN 2: Tenant-Filtered Shapes

**DO THIS:**
- Always filter Electric shapes by tenant/business
- Use backend tenant filtering for tables that do not carry `business_id`

```typescript
pg.electric.syncShapeToTable({
  shape: {
    table: "customers",
    where: `business_id = '${businessId}'`,
  },
  table: "customers",
  primaryKey: ["id"],
});
```

---

### PATTERN 3: Local-First Writes With PGlite Queue

**DO THIS:**

```
User Action
    ↓
Write entity to local PGlite table
(sync_status = 'pending')
    ↓
Insert operation into sync_operations
    ↓
Show pending UI immediately
    ↓
Auto-sync sends batch to backend
    ↓
Electric read sync brings canonical server state back
```

**Important:** the queue is stored in a PGlite table named `sync_operations`, not IndexedDB.

---

### PATTERN 4: syncGroupId For Atomic Multi-Entity Operations

Use the same `syncGroupId` when multiple local writes must be processed together.

Examples:
- sale insert + sale items insert
- sale insert + sale items insert + confirm
- pre-order insert + confirm + delivery transitions

This is how Avileo preserves ordering and atomicity from client to server.

---

### PATTERN 5: Backend Handler Framework

The backend sync service is now a framework, not a giant switch statement.

```
POST /api/sync/batch
    ↓
sync.service.ts
    ↓
SyncEngine.processBatch()
    ↓
ConflictResolver
    ↓
SyncPipeline.execute()
    ↓
Entity handler (sales, sale_items, customers, abonos, distribuciones)
```

Benefits:
- isolated validation per entity
- isolated execution logic per entity
- clearer extension path for new synced tables
- better debugging with correlation IDs

---

## Current File Map

### Frontend

| File | Purpose |
|------|---------|
| `packages/app/app/lib/sync/sync-service.ts` | Local queue processing, retries, grouping by `sync_group_id` |
| `packages/app/app/lib/sync/pull-service.ts` | Pull reconciliation and local upsert behavior |
| `packages/app/app/lib/sync/registry.ts` | Sync hook registration |
| `packages/app/app/lib/services/base-service.ts` | Common service base, ID generation, `queueSync()` |
| `packages/app/app/lib/services/sale-service.ts` | Draft sale flow, item writes, status transitions, shared `syncGroupId` |

### Backend

| File | Purpose |
|------|---------|
| `packages/backend/src/services/sync/sync.service.ts` | Thin orchestrator |
| `packages/backend/src/services/sync/framework/SyncEngine.ts` | Batch transaction orchestration with SAVEPOINTs |
| `packages/backend/src/services/sync/framework/SyncPipeline.ts` | Validation pipeline |
| `packages/backend/src/services/sync/framework/ConflictResolver.ts` | Conflict checks per entity |
| `packages/backend/src/services/sync/framework/HandlerRegistry.ts` | Maps entity type to handler |
| `packages/backend/src/services/sync/handlers/SaleSyncHandler.ts` | Creates/updates/deletes sales, preserves client IDs |
| `packages/backend/src/services/sync/handlers/SaleItemSyncHandler.ts` | Creates/updates/deletes sale items |
| `packages/backend/src/services/sync/handlers/CustomerSyncHandler.ts` | Customer operations |
| `packages/backend/src/services/sync/handlers/AbonoSyncHandler.ts` | Payment operations |
| `packages/backend/src/services/sync/handlers/DistribucionSyncHandler.ts` | Distribution operations |
| `packages/backend/src/services/sync/schemas/index.ts` | Zod schemas for payload validation |

---

## Frontend Write Queue Patterns

### PATTERN: BaseService Generates UUIDs Only

**CRITICAL:** use UUIDs everywhere.

```typescript
protected generateId(): string {
  return crypto.randomUUID();
}

protected generateSyncGroup(): string {
  return crypto.randomUUID();
}
```

Why:
- backend and Postgres expect UUIDs
- fake IDs like `insert-123` break server inserts

---

### PATTERN: queueSync Supports entityTypeOverride

Avileo needs this for related entities like `sale_items` created from `sale-service.ts`.

```typescript
protected async queueSync(
  action: SyncAction,
  entityId: string,
  payload: Record<string, unknown>,
  syncGroupId?: string,
  entityTypeOverride?: EntityType
): Promise<void> {
  const entityType = entityTypeOverride ?? this.getEntityType();
  // ... enqueue
}
```

Use this when one service owns writes for multiple entity types.

---

### PATTERN: processPending Groups By sync_group_id

`packages/app/app/lib/sync/sync-service.ts` groups operations before sending them.

```typescript
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
```

Then it loads full sibling groups so `BATCH_SIZE` does not split atomic units.

```typescript
SELECT *
FROM sync_operations
WHERE business_id = $1
  AND sync_group_id = $2
  AND status IN ($3, $4)
ORDER BY created_at ASC
```

This is a key correctness pattern.

---

### PATTERN: Sale Flow Uses One syncGroupId

The sale service creates one group ID and reuses it across related operations.

Use this for:
- sale insert
- item insert
- confirm/update transitions
- delivery/cancel operations that must stay attached to the originating draft flow

**Why:** without a shared group, the server can process child rows before the parent sale exists.

---

### PATTERN: Sync Hooks Can Block Invalid Enqueueing

`registry.ts` can register hooks that allow or prevent queueing.

This is useful for:
- suppressing redundant operations
- validating local payload shape before enqueue
- selectively preventing known-bad batches

But hooks must not block valid flows such as draft sale creation with empty items.

---

## Backend Sync Framework Patterns

### PATTERN: SyncEngine Uses One Transaction + SAVEPOINT Per Operation

`packages/backend/src/services/sync/framework/SyncEngine.ts`

```typescript
await db.transaction(async (tx) => {
  for (let i = 0; i < operations.length; i++) {
    const savepointName = `sp_op_${i}`;

    await tx.execute(sql.raw(`SAVEPOINT ${savepointName}`));
    const result = await this.processOperation(ctx, operation, correlationId, batchCorrelationId, tx, nowIso);
    await tx.execute(sql.raw(`RELEASE SAVEPOINT ${savepointName}`));
  }
});
```

On failure:

```typescript
await tx.execute(sql.raw(`ROLLBACK TO SAVEPOINT ${savepointName}`));
```

Why this matters:
- PostgreSQL aborts the full transaction after one unhandled error
- SAVEPOINTs isolate failures and let the rest of the batch continue

---

### PATTERN: Idempotency Stored In Backend sync_operations

Before executing an operation, the backend checks whether the same `idempotencyKey` already succeeded.

```typescript
const existingOp = await tx.query.syncOperations.findFirst({
  where: and(
    eq(syncOperations.businessId, ctx.businessId),
    eq(syncOperations.operationId, operation.idempotencyKey)
  ),
});

if (existingOp?.status === "processed") {
  return { success: true, idempotencyKey: operation.idempotencyKey };
}
```

This prevents duplicate inserts when clients retry.

---

### PATTERN: ConflictResolver Runs Before Handler Execution

```typescript
const conflictResolver = ConflictResolverRegistry.getResolver(operation.entityType);
const conflict = await conflictResolver.checkConflict(ctx, operation, tx);

if (conflict.hasConflict) {
  return {
    success: false,
    conflict: {
      serverVersion: conflict.serverVersion!,
      serverData: conflict.serverData!,
    },
  };
}
```

Use this when entity versions matter and stale local changes should not blindly overwrite server state.

---

### PATTERN: SyncPipeline Separates Structure vs Business Validation

`SyncPipeline.ts` has three clear phases:

1. validate operation structure with Zod
2. validate business rules through the entity handler
3. execute the handler

```typescript
result = validateStructure(context, operation);
if (result) return result;

result = validateBusinessRules(context, operation, handler);
if (result) return result;

return executeHandler(context, operation, handler);
```

This makes failures easier to classify and debug.

---

### PATTERN: SaleSyncHandler Preserves Client Entity IDs

`packages/backend/src/services/sync/handlers/SaleSyncHandler.ts`

```typescript
const saleWithId = {
  ...parsed,
  id: operation.entityId,
};
```

This is mandatory for offline-first systems where related children already point to the local sale ID.

**Never** generate a new sale ID on the backend during sync for offline-created entities.

---

### PATTERN: SaleCreate Schema Allows Empty Items

`packages/backend/src/services/sync/schemas/index.ts`

Current schema:

```typescript
items: z.array(saleItemSchema),
```

This allows an empty array, which is correct for Avileo's draft-first flow:
- create empty draft sale
- add items later
- confirm later

Anti-pattern:
- refining sale creation to require items at insert time

---

### PATTERN: SaleItemSyncHandler Must Not Double-Count Totals On Create

Current create path:

```typescript
await this.saleRepo.addItem(ctx, parsed.saleId, {
  id: operation.entityId,
  productId: parsed.productId,
  subtotal: String(parsed.subtotal),
}, executor);
```

The create path does not manually update sale totals again after `addItem()`.

This avoids double-counting.

Update and delete can adjust totals based on diffs because they are mutating existing rows.

---

### PATTERN: Initial Credit Payments Need Stable References

In `SaleSyncHandler.handleCreate()`, credit sales with upfront payment create an initial payment reference:

```typescript
const initialPaymentReference = `init-sale:${createdSale.id}`;
```

And `abonos.reference_number` is unique in `payments.ts`.

Why:
- idempotent retries should not create duplicate initial payments
- stable reconciliation key prevents duplicate partial-credit inserts

---

## Anti-Patterns

### ❌ ANTI-PATTERN 1: IndexedDB-As-Queue Documentation

**Wrong in Avileo today:**
- "save failed write to IndexedDB queue"

**Correct:**
- queue writes in `sync_operations` inside PGlite

---

### ❌ ANTI-PATTERN 2: Flat Batch Transaction Without SAVEPOINTs

**Wrong:** one bad operation poisons the entire transaction.

**Correct:** SAVEPOINT per operation inside the batch.

---

### ❌ ANTI-PATTERN 3: New Server IDs For Offline Entities

**Wrong:** server creates a fresh sale ID.

**Why it breaks:**
- sale items already reference the local sale ID
- later updates and confirmations target the original ID

**Correct:** preserve `operation.entityId`.

---

### ❌ ANTI-PATTERN 4: Requiring Sale Items On Draft Insert

**Wrong:** blocking empty sale creation.

**Why it breaks:** Avileo creates draft sale first, then items, then confirm.

---

### ❌ ANTI-PATTERN 5: Missing syncGroupId On Related Operations

**Wrong:** child rows can reach backend before their parent.

**Correct:** share one `syncGroupId` across the whole logical flow.

---

### ❌ ANTI-PATTERN 6: Double-Recalculating Sale Totals

**Wrong:** `addItem()` updates totals and handler also updates totals again.

**Correct:** only one layer should own the subtotal-to-total recalculation for create.

---

## Schema Design Patterns

### PATTERN: UUID IDs Everywhere

Use UUIDs for:
- entity IDs
- operation IDs
- idempotency keys
- sync group IDs

```typescript
const id = crypto.randomUUID();
```

---

### PATTERN: Sync Metadata Fields

Offline-capable tables should carry:

```typescript
syncStatus: syncStatusEnum("sync_status").notNull().default("synced"),
syncAttempts: integer("sync_attempts").notNull().default(0),
```

And timestamps for audit and synchronization semantics.

---

### PATTERN: Unique Reference Numbers For Payments

`packages/backend/src/db/schema/payments.ts`

```typescript
referenceNumber: varchar("reference_number", { length: 50 }).unique(),
```

Use unique natural keys when retries could create duplicates.

---

## Read Sync Patterns

### PATTERN: Electric Owns Server -> Client Replication

Reads should be:

```
PostgreSQL
    ↓
Electric
    ↓
PGlite
    ↓
live query / UI
```

The write queue should not be confused with read replication.

---

### PATTERN: Adding A New Synced Table Is Cross-Layer Work

Checklist:
1. shared/backend schema
2. Postgres migration
3. local PGlite table creation
4. Electric tenant filter
5. frontend shape registration
6. sync handler if client writes offline
7. tests for insert/update/delete flow

---

## Error Handling Patterns

### PATTERN: Mark Local Operations By Result Type

Frontend should mark each operation as:
- completed
- failed
- conflict

Grouped operations should update status per operation based on batch response.

---

### PATTERN: Correlation IDs For Batch Debugging

The backend sync logger generates batch and operation correlation IDs.

Use this when:
- tracing a single failing sync flow
- linking logs across pipeline stages
- debugging mixed-success grouped batches

---

## Lessons Learned

### Error 1: `invalid input syntax for type uuid`
- **Cause:** non-UUID IDs
- **Fix:** use `crypto.randomUUID()` only

### Error 2: Draft sale rejected because it had no items
- **Cause:** backend validation or sync hook blocked empty-item sale insert
- **Fix:** allow empty draft sale creation

### Error 3: Child operations processed without the full group
- **Cause:** queue processing used fixed batch query without loading group siblings
- **Fix:** fetch entire `sync_group_id` set before sending

### Error 4: One failed op aborted the whole PostgreSQL batch
- **Cause:** missing SAVEPOINTs
- **Fix:** rollback to SAVEPOINT per failed operation

### Error 5: Duplicate initial credit payments
- **Cause:** retries without stable uniqueness key
- **Fix:** unique `reference_number` + stable payment reference

---

## Links to Official Documentation

- **ElectricSQL Sync**: https://pglite.dev/docs/sync
- **Electric React Hooks**: https://pglite.dev/docs/framework-hooks/react
- **Drizzle PGlite**: https://orm.drizzle.team/docs/connect-pglite
- **Drizzle Schema**: https://orm.drizzle.team/docs/sql-schema-declaration
- **PGlite Examples**: https://pglite.dev/examples
