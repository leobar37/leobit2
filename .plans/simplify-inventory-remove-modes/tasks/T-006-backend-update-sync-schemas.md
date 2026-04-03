# T-006: Backend - Update sync schemas

**Status:** pending  
**Priority:** P1  
**Est. Time:** 1 hour  
**Requirements:** FR-001, NFR-003  

## Description
Update the sync operation schemas to remove the `modo` field from distribution create/update operations. This ensures offline-first clients sync correctly without mode data.

## Files to Modify

### 1. Sync Schemas
**File:** `packages/backend/src/services/sync/schemas/index.ts`

**Changes:**

**a) Remove modo from distribucionCreateSchema (around line 185):**
```typescript
// BEFORE:
export const distribucionCreateSchema = z.object({
  vendedorId: z.string().min(1, "vendedorId es requerido"),
  puntoVenta: z.string().min(1, "puntoVenta es requerido"),
  puntoVentaId: z.string().optional(),
  notaCreacion: z.string().optional(),
  fecha: z.string().optional(),
  modo: z.enum(["estricto", "acumulativo", "libre"]).optional(),  // REMOVE
  confiarEnVendedor: z.boolean().optional(),  // REMOVE
  groupId: z.string().optional(),
  items: z.array(distribucionItemSchema).min(1, "La distribución requiere items"),
});

// AFTER:
export const distribucionCreateSchema = z.object({
  vendedorId: z.string().min(1, "vendedorId es requerido"),
  puntoVenta: z.string().min(1, "puntoVenta es requerido"),
  puntoVentaId: z.string().optional(),
  notaCreacion: z.string().optional(),
  fecha: z.string().optional(),
  groupId: z.string().optional(),
  items: z.array(distribucionItemSchema).optional(), // Now optional
});
```

**b) Remove modo from distribucionBaseSchema (around line 193):**
```typescript
// BEFORE:
const distribucionBaseSchema = z.object({
  vendedorId: z.string().optional(),
  puntoVenta: z.string().optional(),
  puntoVentaId: z.string().optional(),
  notaCreacion: z.string().optional(),
  notaCierre: z.string().optional(),
  fecha: z.string().optional(),
  modo: z.enum(["estricto", "acumulativo", "libre"]).optional(),  // REMOVE
  confiarEnVendedor: z.boolean().optional(),  // REMOVE
  items: z.array(distribucionItemSchema).optional(),
});

// AFTER:
const distribucionBaseSchema = z.object({
  vendedorId: z.string().optional(),
  puntoVenta: z.string().optional(),
  puntoVentaId: z.string().optional(),
  notaCreacion: z.string().optional(),
  notaCierre: z.string().optional(),
  fecha: z.string().optional(),
  items: z.array(distribucionItemSchema).optional(),
});
```

### 2. Sync Handler
**File:** `packages/backend/src/services/sync/handlers/DistribucionSyncHandler.ts`

**Changes:**

**a) Remove modo from create call (around line 70):**
```typescript
// BEFORE:
await this.distribucionService.createDistribucion(ctx, {
  vendedorId: parsed.vendedorId,
  puntoVenta: parsed.puntoVenta,
  puntoVentaId: parsed.puntoVentaId,
  notaCreacion: parsed.notaCreacion,
  fecha: parsed.fecha ?? getToday(),
  modo: parsed.modo,  // REMOVE
  confiarEnVendedor: parsed.confiarEnVendedor,  // REMOVE
  groupId: parsed.groupId,
  items: parsed.items.map(item => ({...})),
});

// AFTER:
await this.distribucionService.createDistribucion(ctx, {
  vendedorId: parsed.vendedorId,
  puntoVenta: parsed.puntoVenta,
  puntoVentaId: parsed.puntoVentaId,
  notaCreacion: parsed.notaCreacion,
  fecha: parsed.fecha ?? getToday(),
  groupId: parsed.groupId,
  items: parsed.items?.map(item => ({...})),
});
```

## Add New Cierre Items Schema

**File:** `packages/backend/src/services/sync/schemas/index.ts`

**Add after distribucionUpdateSchema:**
```typescript
// Distribution cierre item schema for close-time registration
export const distribucionCierreItemSchema = z.object({
  variantId: z.string(),
  cantidadLlevada: numericStringTransform,
  cantidadVendida: numericStringTransform,
  cantidadDevuelta: optionalNumericStringTransform,
  montoVentas: optionalNumericStringTransform,
});

export const distribucionCloseSchema = z.object({
  notaCierre: z.string().optional(),
  items: z.array(distribucionCierreItemSchema),
});

export type DistribucionCloseInput = z.infer<typeof distribucionCloseSchema>;
```

## Implementation Steps

1. Update distribucionCreateSchema - remove modo and confiarEnVendedor
2. Update distribucionBaseSchema - remove modo and confiarEnVendedor
3. Update DistribucionSyncHandler - don't pass modo to service
4. Add distribucionCierreItemSchema for close sync support
5. Test sync operations

## Verification Checklist

- [ ] modo field removed from distribucionCreateSchema
- [ ] modo field removed from distribucionBaseSchema
- [ ] confiarEnVendedor removed from schemas
- [ ] DistribucionSyncHandler updated
- [ ] New cierre item schemas added
- [ ] Sync operations validate successfully

## Dependencies

**Blocks:** T-010  
**Depends on:** T-003

## Notes

- Sync schemas must match frontend schemas (see T-007)
- Items array is now optional in create (reflecting optional product assignment)
- New cierre schemas needed for T-009 frontend close flow
