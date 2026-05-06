# Purchases Frontend

## Route Hierarchy

**Files:** `packages/app/app/routes/_protected.compras*.tsx`

| Route Path | File | Component | Purpose |
|------------|------|-----------|---------|
| `/compras` | `compras._index.tsx` | `ComprasPage` | List all purchases |
| `/compras/nueva` | `compras.nueva.tsx` | `NuevaCompraLayout` | Layout with `PurchaseFormProvider` |
| `/compras/nueva` | `compras.nueva._index.tsx` | `NuevaCompraIndexPage` | Create form |
| `/compras/nueva/calculadora` | `compras.nueva.calculadora.tsx` | `ComprasCalculadoraPage` | Calculator for adding items |
| `/compras/:id` | `compras.$id.tsx` | `PurchaseDetailPage` | View detail + status actions |
| `/compras/:id/editar` | `compras.$id.editar.tsx` | `CompraEditorLayout` | Layout with `PurchaseEditProvider` |
| `/compras/:id/editar` | `compras.$id.editar._index.tsx` | `CompraEditarIndexPage` | Edit form |
| `/compras/:id/editar/calculadora` | `compras.$id.editar.calculadora.tsx` | `CompraEditorCalculadoraPage` | Calculator for editing items |

## Context Providers

### PurchaseFormProvider

**File:** `packages/app/app/components/purchases/purchase-form-context.tsx`

**Purpose:** Manages state for creating a new purchase.

**State:**
```typescript
{
  supplier: Supplier | null;
  items: CalculatorItem[];
  receiptFile: File | null;
  receiptPreview: string | null;
  fileUploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  purchaseError: string | null;
  // Form values
  purchaseDate: string;
  invoiceNumber: string;
  notes: string;
}
```

**Computed:**
```typescript
totalAmount: number;        // sum of item totalCosts
cartItemsCount: number;     // items.length
isFormValid: boolean;       // items > 0 AND supplier selected
```

**Key Functions:**
```typescript
addItem(item: CalculatorItem): void;
removeItem(index: number): void;
updateItem(index: number, item: CalculatorItem): void;
clearItems(): void;
handleReceiptSelect(file: File): void;
handleReceiptClear(): void;
onSubmit(): Promise<void>;
```

### PurchaseEditProvider

**File:** `packages/app/app/components/purchases/purchase-edit-context.tsx`

**Purpose:** Manages state for editing an existing purchase.

**State:**
```typescript
{
  items: CalculatorItem[];       // loaded from existing purchase
  editingItemId: string | null;  // from URL via usePurchaseEditorState
  purchaseId: string;            // from route params
}
```

**Key Functions:**
```typescript
addItem(item: CalculatorItem): void;
updateItem(index: number, item: CalculatorItem): void;
removeItem(index: number): void;
onSave(): Promise<void>;   // syncs local state with backend
onCancel(): void;          // navigates back to detail
```

## Hooks

**File:** `packages/app/app/hooks/use-purchases.ts`

### Query Keys
```typescript
['purchases-new']                    // all purchases
['purchases-new', id]                 // single purchase
['purchases-new', 'supplier', id]    // by supplier
['purchases-new', 'status', status]  // by status
```

### Query Hooks

| Hook | Returns | Description |
|------|---------|-------------|
| `usePurchases()` | `UseQueryResult<Purchase[]>` | All purchases |
| `usePurchase(id)` | `UseQueryResult<PurchaseWithItems>` | Single with items |
| `usePurchasesBySupplier(supplierId)` | `UseQueryResult<Purchase[]>` | Filter by supplier |
| `usePurchasesByStatus(status)` | `UseQueryResult<Purchase[]>` | Filter by status |
| `useCountPurchases()` | `UseQueryResult<number>` | Count for business |

### Mutation Hooks

| Hook | Mutation | Invalidates |
|------|----------|-------------|
| `useCreatePurchase()` | `POST /purchases/` | `['purchases-new']` |
| `useUpdatePurchaseStatus()` | `PUT /purchases/:id/status` | `['purchases-new']`, `['purchases-new', id]` |
| `useDeletePurchase()` | `DELETE /purchases/:id` | `['purchases-new']` |
| `useAddPurchaseItem()` | Internal | `['purchases-new', id]` |
| `useUpdatePurchaseItem()` | Internal | `['purchases-new', id]` |
| `useDeletePurchaseItem()` | Internal | `['purchases-new', id]` |

## Offline-First Service

**File:** `packages/app/app/lib/services/purchase-service.ts`

**Class:** `PurchaseService` extends `BaseService`

**Entity Type:** `purchases` | **Entity Prefix:** `pur`

**Methods:**

| Method | Description | Sync |
|--------|-------------|------|
| `findById(id)` | Get purchase with enriched items | - |
| `findByBusiness()` | Get all for business | - |
| `findBySupplier(supplierId)` | Get by supplier | - |
| `create(input)` | Insert purchase + items | `queueSync()` for both |
| `updateStatus(id, status)` | Update status | `queueSync()` |
| `delete(id)` | Delete | `queueSync()` |
| `updateItem(purchaseId, itemId, data)` | Update item, recalc total | `queueSync()` |
| `deleteItem(purchaseId, itemId)` | Delete item, recalc total | `queueSync()` |
| `addItemToPurchase(purchaseId, item)` | Add item, recalc total | `queueSync()` |

**Sync Integration:** All mutations queue sync operations with `syncGroupId` to maintain consistency between purchases and purchase_items.

## Components

### SupplierSelector

**File:** `packages/app/app/components/purchases/supplier-selector.tsx`

- Card showing selected supplier with clear button
- Opens `AppDrawer` with searchable supplier list
- Uses `useSuppliers` hook

### PurchaseCalculatorContent

**File:** `packages/app/app/components/purchases/calculator/purchase-calculator-content.tsx`

- Product/variant selection grid
- Calculator inputs (tara, kilos, price/kg for kg products; packs, price/pack for unit products)
- Uses `useSmartCalculator` hook
- Supports edit mode when `returnPath` is provided
- Toggle auto-calculate for each field

### PurchaseCartSection

**File:** `packages/app/app/components/purchases/calculator/purchase-cart-section.tsx`

- Displays items: product name, variant, quantity, unit cost, total
- Remove button per item
- Total amount display

## E2E Tests

**File:** `packages/app/e2e/tests/05-purchase.spec.ts`

**Page Object:** `packages/app/e2e/page-objects/NewPurchasePage.ts`

### Test Cases

1. **Create purchase and verify list**
   - Select supplier
   - Fill invoice number
   - Select product/variant
   - Enter quantity/cost
   - Add to cart
   - Save purchase
   - Verify appears in list

2. **Purchase requires supplier validation**
   - Add product without supplier
   - Save button disabled

3. **Purchase with unit measurement**
   - Select product with units (e.g., "Huevos", "Maple (30un)")
   - Enter packs
   - Verify calculated units
