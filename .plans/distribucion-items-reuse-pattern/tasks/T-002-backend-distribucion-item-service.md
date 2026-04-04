# T-002: Backend - DistribucionItemService

**Status:** pending  
**Priority:** P0  
**Est. Time:** 3 hours  
**Requirements:** FR-002, FR-003, FR-004, FR-005  
**Depends on:** T-001  
**Blocks:** T-003

## Description
Create the backend service for managing distribucion items following PurchaseService pattern exactly.

## File to Create
**packages/backend/src/services/business/distribucion-item.service.ts**

## Methods to Implement

### Core CRUD
```typescript
// Create items with distribucion (atomic)
async createWithItems(
  ctx: RequestContext,
  distribucionId: string,
  items: CreateDistribucionItemInput[]
): Promise<DistribucionItem[]>

// Add single item
async addItem(
  ctx: RequestContext,
  distribucionId: string,
  item: CreateDistribucionItemInput
): Promise<DistribucionItem>

// Update item quantities
async updateItem(
  ctx: RequestContext,
  distribucionId: string,
  itemId: string,
  data: {
    cantidadAsignada?: number;
    cantidadVendida?: number;
  }
): Promise<DistribucionItem>

// Remove item
async removeItem(
  ctx: RequestContext,
  distribucionId: string,
  itemId: string
): Promise<void>
```

### Queries
```typescript
// Get items with variant/product names
async findByDistribucionId(
  ctx: RequestContext,
  distribucionId: string
): Promise<DistribucionItemEnriched[]>

// Get single item
async findById(
  ctx: RequestContext,
  id: string
): Promise<DistribucionItem | null>
```

## Types

```typescript
export interface DistribucionItem {
  id: string;
  businessId: string;
  distribucionId: string;
  variantId: string;
  cantidadAsignada: string;
  cantidadVendida: string;
  unidad: string;
  syncStatus: string;
  syncAttempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface DistribucionItemEnriched extends DistribucionItem {
  variantName: string;
  productName: string;
}

export interface CreateDistribucionItemInput {
  variantId: string;
  cantidadAsignada: number;
  unidad: string;
}
```

## Pattern to Follow (from PurchaseService)

1. **Transactions**: Use `pg.exec("BEGIN")` / `COMMIT` / `ROLLBACK`
2. **Sync**: Queue sync operations with `syncGroupId` from parent distribucion
3. **Validation**: Check distribucion status before modifications
4. **Permissions**: Use `ctx.hasPermission("inventory.write")`

## Key Implementation Details

### Validation Rules
- Distribucion must exist
- Distribucion status must be "activo" or "en_ruta" (not "cerrado")
- Variant must exist
- User must have inventory.write permission

### Sync Pattern
```typescript
// Get parent's sync group
const syncGroupId = await this.getDistribucionSyncGroupId(distribucionId);

// Queue item sync
await this.queueSync("create", itemId, {...}, syncGroupId, "distribucion_items");
```

## Verification Checklist

- [ ] Service created with all methods
- [ ] Transaction handling correct
- [ ] Sync operations queued properly
- [ ] Permission checks in place
- [ ] Status validations working
- [ ] Error handling with rollback
