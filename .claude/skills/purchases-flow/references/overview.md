# Purchases Flow Overview

## Workflow Summary

Purchases (compras) represent stock replenishment from suppliers. The flow spans:

1. **Creation** → add items, supplier, optional receipt image
2. **Status transitions** → pending → received/cancelled
3. **Editing** → modify items on pending purchases
4. **Deletion** → admin only, cannot delete received purchases

## State Machine Diagram

```
                         ┌──────────────────────────────────────┐
                         │                                      │
                         │   Inventory side effects on          │
                         │   transition are handled by          │
                         │   purchaseMachine.executeTransition() │
                         │                                      │
                         └──────────────────────────────────────┘

┌─────────────┐    receive()    ┌────────────┐
│   pending   │ ───────────────►│  received  │
│   (initial) │                 │            │
└─────────────┘                 └────────────┘
      │                               │
      │ cancel()                      │ cancel()
      │ (no inventory effect)         │ (inventory reversed)
      ▼                               ▼
┌─────────────┐                 ┌─────────────┐
│ cancelled   │                 │ cancelled   │
└─────────────┘                 └─────────────┘
```

## Purchase Lifecycle

### 1. Creation Phase
- User selects supplier (required)
- User adds one or more items via calculator
- Each item: product/variant + quantity + unit cost
- Optional: invoice number, receipt photo, notes
- Initial status: `pending`
- Inventory: NOT updated at creation (only on `received`)

### 2. Receive Phase
- Status changes `pending` → `received`
- Inventory updated: `variantRepo.updateInventory()` or `createInventory()` adds stock
- Each item contributes `quantity` to variant's stock

### 3. Cancellation Phase
- **From pending**: No inventory effect (nothing was received)
- **From received**: Inventory reversed with `Math.max(0, currentQty - quantity)`

### 4. Edit Phase
- Only `pending` purchases can be edited
- Items can be added, updated, or removed
- Total recalculates automatically
- Cannot edit cancelled purchases

### 5. Delete Phase
- Admin only permission
- Cannot delete `received` purchases (must cancel first)
- Cascade deletes all `purchase_items`

## Key Files

| Layer | File | Purpose |
|-------|------|---------|
| DB Schema | `packages/backend/src/db/schema/purchases.ts` | Table definitions |
| Transitions | `packages/backend/src/services/transitions/purchase.ts` | State machine + hooks |
| Repository | `packages/backend/src/services/repository/purchase.repository.ts` | Data access |
| Service | `packages/backend/src/services/business/purchase.service.ts` | Business logic |
| API | `packages/backend/src/api/purchases.ts` | HTTP endpoints |
| FE Hooks | `packages/app/app/hooks/use-purchases.ts` | Data fetching |
| FE Service | `packages/app/app/lib/services/purchase-service.ts` | Offline-first logic |
| FE Context | `packages/app/app/components/purchases/purchase-form-context.tsx` | New purchase form |
| FE Context | `packages/app/app/components/purchases/purchase-edit-context.tsx` | Edit purchase form |

## Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend                               │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │ PurchaseForm│  │PurchaseEdit│  │ PurchaseCalculator    │  │
│  │ Provider    │  │ Provider    │  │ Content              │  │
│  └──────┬──────┘  └──────┬─────┘  └──────────┬───────────┘  │
│         │                 │                    │              │
│         ▼                 ▼                    ▼              │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              PurchaseService (offline-first)           │   │
│  │  - findById, findByBusiness, create, updateStatus     │   │
│  │  - addItem, updateItem, deleteItem                   │   │
│  │  - queueSync() for all mutations                     │   │
│  └─────────────────────┬────────────────────────────────┘   │
│                        │                                    │
│  ┌─────────────────────▼────────────────────────────────┐    │
│  │              TanStack Query Hooks                    │    │
│  │  usePurchases, usePurchase, useCreatePurchase, etc.  │    │
│  └─────────────────────┬────────────────────────────────┘    │
└────────────────────────┼────────────────────────────────────┘
                         │ isOnline()
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                      Backend                                 │
│  ┌──────────────────▼──────────────────┐                     │
│  │       API Routes (ElysiaJS)         │                     │
│  │  GET/POST /purchases                │                     │
│  │  GET/PUT/DELETE /purchases/:id      │                     │
│  └──────────────────┬──────────────────┘                     │
│                     │                                        │
│  ┌──────────────────▼──────────────────┐                     │
│  │       PurchaseService                │                     │
│  │  - Business validations              │                     │
│  │  - Permission checks                 │                     │
│  │  - Calls state machine               │                     │
│  └──────────────────┬──────────────────┘                     │
│                     │                                        │
│  ┌──────────────────▼──────────────────┐                     │
│  │       PurchaseRepository            │                     │
│  │  - Drizzle ORM queries              │                     │
│  │  - Transaction support              │                     │
│  └──────────────────┬──────────────────┘                     │
│                     │                                        │
│  ┌──────────────────▼──────────────────┐                     │
│  │       purchaseMachine                │                     │
│  │  - Transitions: pending→received     │                     │
│  │  - pending→cancelled                 │                     │
│  │  - received→cancelled               │                     │
│  │  - Inventory side effects           │                     │
│  └──────────────────────────────────────┘                     │
└──────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                    PostgreSQL                                │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │   purchases     │  │         purchase_items           │  │
│  │  - id, business │  │  - id, purchase_id (FK)         │  │
│  │  - supplier_id  │  │  - product_id, variant_id        │  │
│  │  - status       │  │  - quantity, unit_cost          │  │
│  │  - total_amount │  │  - total_cost                   │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```
