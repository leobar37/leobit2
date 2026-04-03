# T-003: Backend - Remove distribucion modo

**Status:** pending  
**Priority:** P0  
**Est. Time:** 2-3 hours  
**Requirements:** FR-001, FR-002  

## Description
Simplify the DistribucionService by removing all mode-related logic. This includes:
- Removing modo parameter from create/update methods
- Removing modo validation
- Simplifying item handling (items now only for reference, not stock management)

## Files to Modify

### 1. Distribucion Service
**File:** `packages/backend/src/services/business/distribucion.service.ts`

**Changes:**

**a) Remove modo from createDistribucion signature (line 81-98):**
```typescript
// BEFORE:
async createDistribucion(
  ctx: RequestContext,
  data: {
    vendedorId: string;
    puntoVenta: string;
    puntoVentaId?: string;
    notaCreacion?: string;
    fecha?: string;
    modo?: "estricto" | "acumulativo" | "libre";  // REMOVE
    confiarEnVendedor?: boolean;  // REMOVE
    groupId?: string;
    items: Array<{...}>;  // Make optional
  }
)

// AFTER:
async createDistribucion(
  ctx: RequestContext,
  data: {
    vendedorId: string;
    puntoVenta: string;
    puntoVentaId?: string;
    notaCreacion?: string;
    fecha?: string;
    groupId?: string;
    items?: Array<{...}>;  // Optional - for reference only
  }
)
```

**b) Remove modo validation (lines 111-115):**
```typescript
// REMOVE:
if (!data.items || data.items.length === 0) {
  if (data.modo !== "libre") {
    throw new ValidationError("La distribución debe tener al menos un item");
  }
}
```

**c) Remove stock validation for items (lines 117-134):**
```typescript
// REMOVE entire block that checks variant.inventory.quantity
```

**d) Remove modo from repository call (line 160):**
```typescript
// BEFORE:
modo: data.modo || "estricto",

// AFTER:
// Remove modo field entirely
```

**e) Remove state machine transition call (line 257):**
```typescript
// REMOVE:
await distribucionMachine.executeTransition(ctx, distribucionWithItems, null, "activo");
```

**f) Update closeDistribucion (lines 317-375):**
```typescript
// REMOVE state machine transition (lines 340-341):
// await distribucionMachine.executeTransition(...)

// Simplified close just updates status and timestamps
```

**g) Remove modo check from replaceDistribucionItems (lines 569-571):**
```typescript
// REMOVE:
if (distribucion.modo !== "libre") {
  throw new ValidationError("Solo se pueden modificar items en distribuciones con modo libre");
}
```

### 2. Distribucion Repository
**File:** `packages/backend/src/services/repository/distribucion.repository.ts`

**Changes:**
- Remove modo from create/update type definitions
- Ensure queries don't reference modo column

### 3. Distribucion Item Repository
**File:** `packages/backend/src/services/repository/distribucion-item.repository.ts`

**Changes:**
- Keep for now (used for reference items if needed)
- Or deprecate if cierre_items replaces it completely

## New Methods to Add

**File:** `packages/backend/src/services/business/distribucion.service.ts`

Add method to handle close-time registration:
```typescript
async closeDistribucionWithItems(
  ctx: RequestContext,
  id: string,
  data: {
    notaCierre?: string;
    items: Array<{
      variantId: string;
      cantidadLlevada: number;
      cantidadVendida: number;
      cantidadDevuelta?: number;
    }>;
  }
): Promise<Distribucion> {
  // 1. Validate distribucion exists and belongs to user
  // 2. Validate all items have valid variants
  // 3. Calculate cantidadDevuelta if not provided
  // 4. Calculate montoVentas from actual sales
  // 5. Insert cierre_items
  // 6. Update distribucion status to cerrado
  // 7. Return updated distribucion
}
```

## Implementation Steps

1. Update DistribucionService signatures
2. Remove modo validation logic
3. Remove state machine integration
4. Remove stock validation from create
5. Add new closeDistribucionWithItems method
6. Update DistribucionRepository types
7. Test service methods

## Verification Checklist

- [ ] modo parameter removed from createDistribucion
- [ ] modo validation removed
- [ ] Stock validation on create removed
- [ ] State machine transition on create removed
- [ ] State machine transition on close removed
- [ ] replaceDistribucionItems modo check removed
- [ ] closeDistribucionWithItems method added
- [ ] All existing tests compile (will fail until T-010)

## Dependencies

**Blocks:** T-004, T-005, T-006, T-010  
**Depends on:** T-001

## Notes

- The state machine transitions are being removed entirely in T-005
- Items on creation are now purely optional reference data
- The heavy lifting moves to closeDistribucionWithItems
