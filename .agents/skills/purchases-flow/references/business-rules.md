# Purchases Business Rules

## Purchase Creation

| Rule | Details |
|------|---------|
| **Supplier** | Required for submission (though UI shows "opcional" label) |
| **Items** | At least one item required |
| **Initial Status** | Always `pending` |
| **Total Amount** | Calculated from items: `sum(item.quantity * item.unitCost)` |
| **Inventory** | NOT updated at creation (only on `received`) |

## Status Transitions

### Valid Transitions

| From | To | Allowed | Inventory Effect |
|------|----|---------|-----------------|
| `pending` | `received` | ✅ Yes | +stock (adds quantity) |
| `pending` | `cancelled` | ✅ Yes | None (nothing was received) |
| `received` | `cancelled` | ✅ Yes | -stock (reverses inventory) |
| `received` | `pending` | ❌ No | - |
| `cancelled` | `pending` | ❌ No | - |
| `cancelled` | `received` | ❌ No | - |

### Transition Details

#### `pending` → `received`
- **Hook:** `handleReceive`
- **Effect:** Inventory increases by item quantity
- **Behavior:** Creates inventory record if none exists, otherwise updates existing

#### `pending` → `cancelled`
- **Hook:** `handleCancel`
- **Effect:** No-op (nothing to reverse)
- **Use case:** Supplier couldn't fulfill, or purchase was in error

#### `received` → `cancelled`
- **Hook:** `handleCancel` (called again)
- **Effect:** Inventory decreases by item quantity
- **Behavior:** Uses `Math.max(0, currentQty - quantity)` to prevent negative stock

## Item Management

| Rule | Condition |
|------|-----------|
| **Add items** | Only on `pending` purchases |
| **Update items** | Only on `pending` purchases |
| **Remove items** | Only on `pending` purchases |
| **Edit cancelled** | ❌ Not allowed |
| **Edit received** | ❌ Not allowed |

### Item Calculations

When `unitId` is provided (unit-based products):
```
quantity = packs * baseUnitQuantity
unitCost = pricePerPack / baseUnitQuantity
```

When using weight (kg-based products):
```
totalCost = kilos * pricePerKilo
quantity = kilos (in base units, e.g., grams)
```

## Deletion Rules

| Condition | Allowed | Notes |
|-----------|---------|-------|
| Admin permission | ✅ Yes | Required |
| Status is `pending` | ✅ Yes | Can delete |
| Status is `received` | ❌ No | Must cancel first |
| Status is `cancelled` | ✅ Yes | Can delete |

## Validation Rules

### Create Purchase
1. `supplierId` must exist in `suppliers` table
2. `items` array must have at least 1 element
3. Each item must have `quantity >= 0.001`
4. Each item must have `unitCost >= 0`
5. `receiptImageId` must exist (if provided)

### Update Status
1. Target status must be valid from current status
2. Cannot modify `cancelled` purchases

### Update Item
1. Item must belong to the purchase
2. Purchase must be `pending`
3. Quantity must be >= 0.001

## Offline Behavior

| Action | Online | Offline |
|--------|--------|---------|
| Create purchase | API call + queueSync | queueSync only |
| Update status | API call + queueSync | queueSync only |
| Delete purchase | API call + queueSync | queueSync only |
| Add item | API call + queueSync | queueSync only |

**Sync:** All mutations set `sync_status = 'pending'` and queue with shared `syncGroupId` for purchases + items consistency.

## Permission Requirements

| Action | Permission |
|--------|------------|
| List/View purchases | `purchases.read` |
| Create purchase | `purchases.write` |
| Update status | `purchases.write` |
| Manage items | `purchases.write` |
| Delete purchase | `admin` |
