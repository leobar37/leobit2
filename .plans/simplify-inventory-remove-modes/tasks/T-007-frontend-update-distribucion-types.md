# T-007: Frontend - Update distribucion types

**Status:** pending  
**Priority:** P0  
**Est. Time:** 1 hour  
**Requirements:** FR-001  

## Description
Update TypeScript types and Zod schemas in the frontend to remove the `modo` field from distribution types.

## Files to Modify

### 1. Frontend Schema
**File:** `packages/app/app/lib/db/schema.ts`

**Changes:**

**a) Remove modo from distribucionSchema (around line 158):**
```typescript
// BEFORE:
export const distribucionSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  vendedorId: z.string(),
  puntoVenta: z.string(),
  montoRecaudado: z.string().default("0"),
  fecha: z.string(),
  estado: z.enum(["activo", "cerrado", "en_ruta"]).default("activo"),
  modo: z.string().default("estricto"),  // REMOVE
  syncStatus: z.enum(["pending", "synced", "error"]).default("pending"),
  createdAt: z.coerce.date(),
  items: z.array(distribucionItemSchema).optional(),
});

// AFTER:
export const distribucionSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  vendedorId: z.string(),
  puntoVenta: z.string(),
  puntoVentaId: z.string().optional(),
  montoRecaudado: z.string().default("0"),
  notaCreacion: z.string().nullable().optional(),
  notaCierre: z.string().nullable().optional(),
  fecha: z.string(),
  estado: z.enum(["activo", "cerrado", "en_ruta"]).default("activo"),
  syncStatus: z.enum(["pending", "synced", "error"]).default("pending"),
  createdAt: z.coerce.date(),
  items: z.array(distribucionItemSchema).optional(),
});
```

### 2. Distribucion Service
**File:** `packages/app/app/lib/services/distribucion-service.ts`

**Changes:**

**a) Update CreateDistribucionInput interface (around line 14):**
```typescript
// BEFORE:
export interface CreateDistribucionInput {
  vendedorId: string;
  puntoVenta: string;
  puntoVentaId?: string;
  notaCreacion?: string;
  fecha?: string;
  modo?: "estricto" | "acumulativo" | "libre";  // REMOVE
  groupId?: string;
  items: Array<{...}>;
}

// AFTER:
export interface CreateDistribucionInput {
  vendedorId: string;
  puntoVenta: string;
  puntoVentaId?: string;
  notaCreacion?: string;
  fecha?: string;
  groupId?: string;
  items?: Array<{...}>;  // Now optional
}
```

**b) Update create method (around line 123):**
```typescript
// BEFORE:
modo: input.modo || "estricto",

// AFTER:
// Remove modo field entirely
```

**c) Update sync payload (around line 140):**
```typescript
// BEFORE:
modo: input.modo || "estricto",

// AFTER:
// Remove modo from payload
```

### 3. Add Cierre Item Types

**File:** `packages/app/app/lib/db/schema.ts`

**Add after distribucionItemSchema:**
```typescript
export const distribucionCierreItemSchema = z.object({
  id: z.string(),
  distribucionId: z.string(),
  variantId: z.string(),
  cantidadLlevada: z.string(),
  cantidadVendida: z.string(),
  cantidadDevuelta: z.string().default("0"),
  montoVentas: z.string().optional(),
  syncStatus: z.enum(["pending", "synced", "error"]).default("pending"),
  createdAt: z.coerce.date(),
});

export type DistribucionCierreItem = z.infer<typeof distribucionCierreItemSchema>;

export interface CreateCierreItemInput {
  variantId: string;
  cantidadLlevada: number;
  cantidadVendida: number;
  cantidadDevuelta?: number;
}

export interface CloseDistribucionInput {
  distribucionId: string;
  notaCierre?: string;
  items: CreateCierreItemInput[];
}
```

## Implementation Steps

1. Update distribucionSchema - remove modo field
2. Update CreateDistribucionInput interface
3. Update DistribucionService.create method
4. Add cierre item schemas and types
5. Run TypeScript type check

## Verification Checklist

- [ ] modo field removed from distribucionSchema
- [ ] modo field removed from CreateDistribucionInput
- [ ] modo removed from DistribucionService
- [ ] New cierre item types added
- [ ] TypeScript compiles without errors
- [ ] No remaining modo references in frontend types

## Dependencies

**Blocks:** T-008  
**Depends on:** T-001

## Notes

- This is a prerequisite for T-008 (form updates)
- Ensure types match backend sync schemas (T-006)
- Items are now optional in create input
