# Purchases Backend

## API Routes

**File:** `packages/backend/src/api/purchases.ts`

### Endpoints

| Method | Path | Handler | Response | Description |
|--------|------|---------|----------|-------------|
| `GET` | `/purchases/` | `getPurchases` | 200 | List purchases |
| `GET` | `/purchases/:id` | `getPurchase` | 200 | Get single |
| `POST` | `/purchases/` | `createPurchase` | 201 | Create new |
| `PUT` | `/purchases/:id/status` | `updatePurchaseStatus` | 200 | Change status |
| `DELETE` | `/purchases/:id` | `deletePurchase` | 204 | Delete |

### Query Parameters (GET /purchases/)

```typescript
{
  supplierId?: string;
  status?: 'pending' | 'received' | 'cancelled';
  startDate?: string;  // ISO date
  endDate?: string;    // ISO date
  limit?: number;
  offset?: number;
}
```

### Request Bodies

**POST /purchases/**
```typescript
{
  supplierId: string;
  purchaseDate: string;
  invoiceNumber?: string;
  receiptImageId?: string;
  notes?: string;
  items: Array<{
    productId: string;
    variantId?: string;
    unitId?: string;
    packs?: number;
    quantity: number;
    unitCost: number;
  }>;
}
```

**PUT /purchases/:id/status**
```typescript
{ status: 'pending' | 'received' | 'cancelled' }
```

## State Machine

**File:** `packages/backend/src/services/transitions/purchase.ts`

### Transitions

| From | To | Action |
|------|----|--------|
| `pending` | `received` | `handleReceive` - adds inventory |
| `pending` | `cancelled` | `handleCancel` - no-op |
| `received` | `cancelled` | `handleCancel` - reverses inventory |

### Transition Hooks

```typescript
// pending → received
async function handleReceive(purchase, items, ctx, tx) {
  for (const item of items) {
    const existing = await variantRepo.findInventory(ctx, item.variantId, tx);
    if (existing) {
      await variantRepo.updateInventory(
        ctx,
        item.variantId,
        { quantity: existing.quantity + item.quantity },
        tx
      );
    } else {
      await variantRepo.createInventory(
        ctx,
        item.variantId,
        { quantity: item.quantity },
        tx
      );
    }
  }
}

// received → cancelled
async function handleCancel(purchase, items, ctx, tx) {
  for (const item of items) {
    const existing = await variantRepo.findInventory(ctx, item.variantId, tx);
    if (existing) {
      await variantRepo.updateInventory(
        ctx,
        item.variantId,
        { quantity: Math.max(0, existing.quantity - item.quantity) },
        tx
      );
    }
  }
}
```

## Service Layer

**File:** `packages/backend/src/services/business/purchase.service.ts`

### Class: `PurchaseService`

**Dependencies:** `PurchaseRepository`, `SupplierRepository`, `ProductVariantRepository`, `ProductUnitRepository`, `FileRepository`

**Methods:**

| Method | Signature | Permission |
|--------|-----------|------------|
| `getPurchases` | `(ctx, filters) => Promise<Purchase[]>` | `purchases.read` |
| `getPurchase` | `(ctx, id) => Promise<PurchaseWithItems>` | `purchases.read` |
| `createPurchase` | `(ctx, data) => Promise<Purchase>` | `purchases.write` |
| `updatePurchaseStatus` | `(ctx, id, status) => Promise<Purchase>` | `purchases.write` |
| `deletePurchase` | `(ctx, id) => Promise<void>` | admin |
| `countPurchases` | `(ctx) => Promise<number>` | `purchases.read` |

### Validations

1. **Create:**
   - Supplier must exist (if provided)
   - At least one item required
   - Receipt image must exist (if provided)
   - Negative quantities/costs rejected
   - Item quantity min: 0.001

2. **Update Status:**
   - Target state must be valid from current state
   - Cancelled purchases cannot be modified

3. **Delete:**
   - Cannot delete received purchases (must cancel first)
   - Admin permission required

## Repository Layer

**File:** `packages/backend/src/services/repository/purchase.repository.ts`

### Class: `PurchaseRepository`

**CRUD Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `findMany` | `(ctx, filters) => Promise<Purchase[]>` | List with filters |
| `findById` | `(ctx, id, tx?) => Promise<PurchaseWithRelations>` | Single with supplier, items |
| `create` | `(ctx, data, items) => Promise<Purchase>` | Insert + items in tx |
| `updateStatus` | `(ctx, id, status, tx?) => Promise<void>` | Update status |
| `delete` | `(ctx, id) => Promise<void>` | Cascade delete items |
| `count` | `(ctx) => Promise<number>` | Count for business |

**Item Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `addItem` | `(ctx, purchaseId, item, tx?) => Promise<PurchaseItem>` | Add item |
| `findItemById` | `(ctx, purchaseId, itemId, tx?) => Promise<PurchaseItem>` | Get item |
| `updateItem` | `(ctx, purchaseId, itemId, data, tx?) => Promise<void>` | Update qty/cost |
| `deleteItem` | `(ctx, purchaseId, itemId, tx?) => Promise<void>` | Remove item |
| `updateTotal` | `(ctx, purchaseId, tx?) => Promise<void>` | Recalc from items |

### Query Patterns

```typescript
// Multi-tenancy - ALWAYS filter by businessId
where(eq(purchases.businessId, ctx.businessId))

// findById eager-loads relations
const purchase = await repo.findById(ctx, id);
const items = purchase.items; // already loaded
```

## RequestContext Pattern

**CRITICAL:** `ctx` MUST be the first parameter in ALL repository and service methods.

```typescript
// ✅ CORRECT
async findById(ctx: RequestContext, id: string)

// ❌ INCORRECT
async findById(id: string, ctx: RequestContext)
```

## Permission Matrix

| Permission | Actions |
|------------|---------|
| `purchases.read` | List, view, count |
| `purchases.write` | Create, update status, manage items |
| `admin` | Delete purchases |
