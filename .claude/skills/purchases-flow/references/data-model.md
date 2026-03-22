# Purchases Data Model

## Database Schema

### `purchases` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Primary key |
| `businessId` | `uuid` | NOT NULL, FK to businesses | Multi-tenancy |
| `supplierId` | `uuid` | FK to suppliers | Supplier reference |
| `purchaseDate` | `date` | NOT NULL | Date of purchase |
| `totalAmount` | `decimal(12,2)` | NOT NULL, default 0 | Calculated total |
| `status` | `purchase_status` | NOT NULL, default 'pending' | State machine state |
| `invoiceNumber` | `varchar(50)` | NULLABLE | Optional invoice |
| `receiptImageId` | `uuid` | FK to files, NULLABLE | Receipt photo |
| `notes` | `text` | NULLABLE | Optional notes |
| `syncStatus` | `sync_status_type` | NOT NULL, default 'pending' | Sync state |
| `syncAttempts` | `integer` | NOT NULL, default 0 | Retry counter |
| `createdAt` | `timestamp` | NOT NULL, default now | Creation time |
| `updatedAt` | `timestamp` | NOT NULL, default now | Last update |

**Indexes:** `businessId`, `supplierId`, `purchaseDate`, `status`, `receiptImageId`

**Enums:**

```typescript
type purchase_status = 'pending' | 'received' | 'cancelled';
type sync_status_type = 'synced' | 'pending' | 'error';
```

### `purchase_items` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Primary key |
| `businessId` | `uuid` | NOT NULL | Multi-tenancy |
| `purchaseId` | `uuid` | FK to purchases (CASCADE DELETE) | Parent purchase |
| `productId` | `uuid` | NOT NULL, FK to products | Product reference |
| `variantId` | `uuid` | FK to productVariants, NULLABLE | Optional variant |
| `unitId` | `uuid` | FK to productUnits, NULLABLE | Unit measurement |
| `quantity` | `decimal(10,3)` | NOT NULL | Quantity in base units |
| `unitCost` | `decimal(10,2)` | NOT NULL | Cost per unit |
| `totalCost` | `decimal(12,2)` | NOT NULL | quantity × unitCost |
| `syncStatus` | `sync_status_type` | NOT NULL, default 'pending' | Sync state |
| `syncAttempts` | `integer` | NOT NULL, default 0 | Retry counter |
| `createdAt` | `timestamp` | NOT NULL, default now | Creation time |
| `updatedAt` | `timestamp` | NOT NULL, default now | Last update |

**Indexes:** `purchaseId`, `productId`, `variantId`

## Entity Relations (Drizzle)

```typescript
// purchases relations
purchases: {
  inner: [suppliers, files],
  hasMany: [purchaseItems],
}

// purchase_items relations
purchaseItems: {
  inner: [products, productVariants, productUnits],
  belongsTo: [purchases],
}
```

## TypeScript Types

### API Request/Response Types

```typescript
// POST /purchases - Create purchase
interface CreatePurchaseInput {
  supplierId: string;
  purchaseDate: string; // ISO date
  invoiceNumber?: string;
  receiptImageId?: string;
  notes?: string;
  items: CreatePurchaseItemInput[];
}

interface CreatePurchaseItemInput {
  productId: string;
  variantId?: string;
  unitId?: string;
  packs?: number; // for unit-based products
  quantity: number; // min 0.001
  unitCost: number; // min 0
}

// PUT /purchases/:id/status - Update status
interface UpdatePurchaseStatusInput {
  status: 'pending' | 'received' | 'cancelled';
}

// GET /purchases - Query filters
interface PurchaseFilters {
  supplierId?: string;
  status?: 'pending' | 'received' | 'cancelled';
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}
```

### Frontend Service Types

```typescript
// Local purchase with enriched data
interface EnrichedPurchase extends Purchase {
  supplier?: Supplier;
  receiptImage?: File;
  items: EnrichedPurchaseItem[];
  totalAmount: number;
}

interface EnrichedPurchaseItem extends PurchaseItem {
  productName?: string;
  variantName?: string;
  unitName?: string;
}

// Purchase with calculated fields for calculator
interface CalculatorItem {
  productId: string;
  variantId?: string;
  unitId?: string;
  productName: string;
  variantName?: string;
  unitName?: string;
  baseUnitQuantity: number; // e.g., 30 for "Maple (30un)"
  quantity: number; // in base units
  unitCost: number;
  totalCost: number;
  // Calculator-specific
  tara?: number;
  kilos?: number;
  pricePerKilo?: number;
  packs?: number;
  pricePerPack?: number;
}
```

## Sync Group

Purchases and purchase_items share a `syncGroupId` to maintain consistency:

```
purchase + purchase_items → syncGroupId
```

All mutations queue sync operations for both entities together.
