# PGlite + Electric + Drizzle Examples

> **Real Avileo data flows for the current hybrid sync implementation**

## Example 1: Draft Sale Creation + Items + Confirm

### User Story
The vendor starts a draft sale offline, adds two items, then confirms it. All operations must sync in order when connectivity returns.

### Local Flow

```
T+0ms   User taps "Nueva venta"
        ↓
        INSERT INTO sales (... status='draft', sync_status='pending')
        ↓
        INSERT INTO sync_operations
          (entity_type='sales', operation='create', sync_group_id='G1')

T+50ms  User adds item 1
        ↓
        INSERT INTO sale_items (... sync_status='pending')
        ↓
        INSERT INTO sync_operations
          (entity_type='sale_items', operation='create', sync_group_id='G1')

T+80ms  User adds item 2
        ↓
        INSERT INTO sale_items (... sync_status='pending')
        ↓
        INSERT INTO sync_operations
          (entity_type='sale_items', operation='create', sync_group_id='G1')

T+100ms User confirms sale
        ↓
        UPDATE sales SET status='active', sync_status='pending'
        ↓
        INSERT INTO sync_operations
          (entity_type='sales', operation='update', sync_group_id='G1')
```

### SyncService.processPending()

```typescript
// grouped by sync_group_id
G1 => [sale create, item create, item create, sale update]
```

Then the client sends one batch:

```json
[
  { "entityType": "sales", "operation": "create", "entityId": "sale-uuid", "syncGroupId": "G1" },
  { "entityType": "sale_items", "operation": "create", "entityId": "item-1-uuid", "syncGroupId": "G1" },
  { "entityType": "sale_items", "operation": "create", "entityId": "item-2-uuid", "syncGroupId": "G1" },
  { "entityType": "sales", "operation": "update", "entityId": "sale-uuid", "syncGroupId": "G1" }
]
```

### Backend Flow

```
POST /api/sync/batch
    ↓
SyncEngine.processBatch()
    ↓
BEGIN
  SAVEPOINT sp_op_0  -> SaleSyncHandler.create()
  RELEASE SAVEPOINT sp_op_0

  SAVEPOINT sp_op_1  -> SaleItemSyncHandler.create()
  RELEASE SAVEPOINT sp_op_1

  SAVEPOINT sp_op_2  -> SaleItemSyncHandler.create()
  RELEASE SAVEPOINT sp_op_2

  SAVEPOINT sp_op_3  -> SaleSyncHandler.update()
  RELEASE SAVEPOINT sp_op_3
COMMIT
```

### Why It Works
- same `syncGroupId` keeps the flow together
- parent sale exists before item inserts are processed
- same `entityId` is preserved on backend
- later status transition targets the same sale row

---

## Example 2: One Operation Fails But Batch Continues

### Scenario
A grouped batch contains one duplicate payment reference, but the rest of the operations are valid.

### Batch Timeline

```
BEGIN

SAVEPOINT sp_op_0
  create sale              -> success
RELEASE SAVEPOINT sp_op_0

SAVEPOINT sp_op_1
  create initial payment   -> fails (duplicate reference_number)
ROLLBACK TO SAVEPOINT sp_op_1

SAVEPOINT sp_op_2
  update customer notes    -> success
RELEASE SAVEPOINT sp_op_2

COMMIT
```

### Result Object

```json
{
  "results": [
    { "idempotencyKey": "k1", "success": true },
    { "idempotencyKey": "k2", "success": false, "error": "duplicate key value violates unique constraint" },
    { "idempotencyKey": "k3", "success": true }
  ],
  "summary": {
    "total": 3,
    "succeeded": 2,
    "failed": 1,
    "conflicts": 0
  }
}
```

### Why SAVEPOINTs Matter
Without SAVEPOINTs, operation 1 would abort the entire transaction and operation 2 would never run.

---

## Example 3: Sale ID Preservation

### Scenario
The client creates a sale locally with ID `550e8400-e29b-41d4-a716-446655440000`. Items and later updates reference that same ID.

### Correct Backend Behavior

```typescript
const saleWithId = {
  ...parsed,
  id: operation.entityId,
};
```

### Why This Is Required

```
Client sale row      -> id = S1
Client item row      -> sale_id = S1
Confirm update       -> entityId = S1

If backend creates S2 instead:
- item sync fails because sale S1 does not exist on server
- confirm sync targets S1, not S2
- local/server graph diverges
```

### Rule
In offline-first sync, the server must usually accept the client-generated UUID as the canonical ID for locally created rows.

---

## Example 4: Draft Sale With Empty Items

### Scenario
The user starts a sale first, then adds items later.

### Valid Payload

```json
{
  "type": "instant_sale",
  "saleType": "contado",
  "totalAmount": 0,
  "amountPaid": 0,
  "items": []
}
```

### Why This Must Pass
Avileo's UX flow is:
1. create draft sale
2. add items one by one
3. confirm sale

Rejecting the initial empty-items insert breaks the entire flow.

### Correct Schema Shape

```typescript
items: z.array(saleItemSchema)
```

An empty array is valid. Do not add a refinement such as `items.length > 0` for draft creation.

---

## Example 5: Sale Item Create Without Double Counting

### Scenario
An item is synced after the parent sale already exists.

### Correct Create Handler

```typescript
await this.saleRepo.addItem(ctx, parsed.saleId, {
  id: operation.entityId,
  productId: parsed.productId,
  subtotal: String(parsed.subtotal),
}, executor);
```

### Incorrect Pattern

```typescript
await this.saleRepo.addItem(...);

await this.saleRepo.update(ctx, parsed.saleId, {
  totalAmount: newTotal,
});
```

### Why Incorrect
If `addItem()` already updates sale totals, updating them again in the handler will duplicate the subtotal.

---

## Example 6: Group Fetch Beyond BATCH_SIZE

### Scenario
`BATCH_SIZE = 50`, but one sync group has 60 operations.

### Wrong Behavior

```
SELECT first 50 pending ops
    ↓
send only 50 rows from group G1
    ↓
group is split across multiple batches
```

### Correct Behavior In Avileo

```
SELECT first 50 pending ops
    ↓
detect G1 present
    ↓
SELECT all rows WHERE sync_group_id = G1
    ↓
send complete sibling set together
```

### Why
Atomic logical units must not be split just because the initial pending query was capped.

---

## Example 7: Credit Sale With Initial Payment

### Scenario
User creates a credit sale with a partial upfront payment.

### Backend Handler Flow

```typescript
const createdSale = await this.saleRepo.create(ctx, saleWithId, tx);

if (parsed.saleType === "credito" && parsed.customerId && Number(parsed.amountPaid || 0) > 0) {
  const initialPaymentReference = `init-sale:${createdSale.id}`;
  await this.paymentRepo.createInitialPayment(ctx, {
    customerId: parsed.customerId,
    amount: Number(parsed.amountPaid || 0).toFixed(2),
    referenceNumber: initialPaymentReference,
  }, tx);
}
```

### Why The Reference Must Be Stable
- retries should be idempotent
- repeated sync attempts must not create duplicate initial payments
- `abonos.reference_number` is unique, so a stable value prevents duplication

---

## Example 8: Conflict Result Returned To Client

### Scenario
The server has a newer version of a sale than the local operation expects.

### Backend Flow

```typescript
const conflict = await conflictResolver.checkConflict(ctx, operation, tx);

if (conflict.hasConflict) {
  return {
    idempotencyKey: operation.idempotencyKey,
    success: false,
    conflict: {
      serverVersion: conflict.serverVersion!,
      serverData: conflict.serverData!,
    },
  };
}
```

### Client Reaction

```
batch result says conflict
    ↓
mark local operation as conflict
    ↓
surface conflict UI or retry decision later
```

This is different from a generic failed operation.

---

## Example 9: Mental Model Of The Whole System

```
Writes:
UI
  ↓
Service layer
  ↓
PGlite local entity tables + sync_operations
  ↓
SyncService.processPending()
  ↓
POST /api/sync/batch
  ↓
SyncEngine + handlers
  ↓
PostgreSQL

Reads:
PostgreSQL
  ↓
ElectricSQL
  ↓
PGlite
  ↓
useLiveQuery / UI
```

### Rule Of Thumb
- write path is custom and queue-based
- read path is Electric-based
- do not mix their responsibilities in documentation or code

---

## Testing Scenarios To Prioritize

1. **Draft -> item add -> confirm** with same `syncGroupId`
2. **Offline -> online replay** with full grouped batch
3. **One failing op inside batch** and later ops still succeed
4. **Credit sale retry** does not duplicate initial payment
5. **Client UUID preservation** across sale + sale items
6. **Conflict result** is marked as conflict, not generic failed
