# T-004: Frontend - DistribucionService with Items

**Status:** pending  
**Priority:** P0  
**Est. Time:** 3 hours  
**Requirements:** FR-002, FR-003, FR-004, FR-005, FR-006  
**Depends on:** T-001  
**Blocks:** T-005

## Description
Extend the existing DistribucionService to support items following SaleService pattern.

## File to Modify
**packages/app/app/lib/services/distribucion-service.ts**

## Methods to Add/Modify

### Update Existing Methods

```typescript
// Modify create() to accept optional items
async create(
  input: CreateDistribucionInput & { items?: CreateDistribucionItemInput[] }
): Promise<Distribucion>

// Modify findById() to include items
async findById(id: string): Promise<DistribucionWithItems | null>
```

### New Methods

```typescript
// Add item to existing distribucion
async addItem(
  distribucionId: string,
  item: CreateDistribucionItemInput
): Promise<DistribucionItem>

// Update item quantities
async updateItem(
  distribucionId: string,
  itemId: string,
  data: {
    cantidadAsignada?: number;
    cantidadVendida?: number;
  }
): Promise<DistribucionItem>

// Remove item
async removeItem(
  distribucionId: string,
  itemId: string
): Promise<void>
```

## Types to Add

```typescript
// In packages/app/app/lib/services/distribucion-service.ts

export interface DistribucionItem {
  id: string;
  distribucionId: string;
  variantId: string;
  cantidadAsignada: string;
  cantidadVendida: string;
  unidad: string;
  syncStatus: string;
  syncAttempts: number;
  createdAt: string;
}

export interface DistribucionItemEnriched extends DistribucionItem {
  variantName: string;
  productName: string;
}

export interface DistribucionWithItems extends Distribucion {
  items: DistribucionItemEnriched[];
}

export interface CreateDistribucionItemInput {
  variantId: string;
  cantidadAsignada: number;
  unidad: string;
}

// Update CreateDistribucionInput
export interface CreateDistribucionInput {
  vendedorId: string;
  puntoVenta: string;
  puntoVentaId?: string;
  notaCreacion?: string;
  fecha?: string;
  groupId?: string;
  items?: CreateDistribucionItemInput[];  // NEW - Optional
}
```

## Pattern to Follow (from SaleService)

### Transaction Pattern
```typescript
async createWithItems(
  distribucionInput: CreateDistribucionInput,
  items: CreateDistribucionItemInput[]
): Promise<Distribucion> {
  const syncGroupId = this.generateSyncGroup();
  
  await this.pg.exec("BEGIN");
  try {
    // 1. Create distribucion
    // 2. Create all items
    // 3. Queue sync operations
    await this.pg.exec("COMMIT");
  } catch (err) {
    await this.pg.exec("ROLLBACK");
    throw err;
  }
}
```

### Add Item Pattern
```typescript
async addItem(distribucionId: string, item: CreateDistribucionItemInput): Promise<DistribucionItem> {
  // 1. Validate distribucion exists and is editable
  // 2. Generate syncGroupId from parent
  // 3. Insert item
  // 4. Queue sync
}
```

## Key Implementation Notes

### Enrich Items with Product Names
```typescript
private async enrichItemsWithNames(
  items: DistribucionItem[]
): Promise<DistribucionItemEnriched[]> {
  // Join with products and product_variants
  // Return items with productName and variantName
}
```

### Sync Pattern
- Use parent's syncGroupId for all item operations
- Queue sync for distribucion first, then items
- Entity type: "distribucion_items"

## Verification Checklist

- [ ] create() accepts optional items
- [ ] findById() returns distribucion with items
- [ ] addItem() adds item with sync
- [ ] updateItem() updates quantities
- [ ] removeItem() deletes item
- [ ] Transaction handling correct
- [ ] Sync operations queued properly
