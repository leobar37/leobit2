# T-009: Frontend - Create cierre flow

**Status:** pending  
**Priority:** P1  
**Est. Time:** 3-4 hours  
**Requirements:** FR-003  

## Description
Implement the new close-time registration UI where vendors input the products they took, sold, and returned when closing a distribution.

## Files to Create/Modify

### 1. Cierre Form Component (New)
**File:** `packages/app/app/components/distribucion/close-distribucion-form.tsx`

**Component structure:**
```typescript
interface CloseDistribucionFormProps {
  distribucionId: string;
  onSubmit: (data: CloseDistribucionInput) => void;
  onCancel: () => void;
  isPending?: boolean;
}

interface CierreItemRow {
  variantId: string;
  variantName: string;
  productName: string;
  cantidadLlevada: number;
  cantidadVendida: number;
  cantidadDevuelta: number;
}

export function CloseDistribucionForm({
  distribucionId,
  onSubmit,
  onCancel,
  isPending,
}: CloseDistribucionFormProps) {
  // State for cierre items
  // Product selector to add items
  // Table of items with editable quantities
  // Notas de cierre textarea
  // Submit/Cancel buttons
}
```

**Features:**
- Product selector (variant selector) to add items
- Table showing: Producto, Llevó, Vendió, Devolvió
- Auto-calculate Devolvió = Llevó - Vendió (editable override)
- Remove item button
- Notas de cierre textarea
- Validation: at least one item required

### 2. Update Distribution Service
**File:** `packages/app/app/lib/services/distribucion-service.ts`

**Add new method:**
```typescript
async closeWithItems(input: CloseDistribucionInput): Promise<Distribucion> {
  // 1. Get current distribucion
  // 2. Validate it's active
  // 3. Insert cierre items
  // 4. Update distribucion status to cerrado
  // 5. Queue sync operation
  // 6. Return updated distribucion
}
```

### 3. Update Hooks
**File:** `packages/app/app/hooks/use-distribuciones.ts`

**Add new hook:**
```typescript
export function useCloseDistribucion() {
  const queryClient = useQueryClient();
  const { distribucionService } = useServices();

  return useMutation({
    mutationFn: (input: CloseDistribucionInput) =>
      distribucionService.closeWithItems(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribuciones"] });
    },
  });
}
```

### 4. Update Mi Distribucion Page
**File:** `packages/app/app/routes/_protected.mi-distribucion.tsx`

**Changes:**
- Replace simple close button with close flow
- Show CloseDistribucionForm modal when closing
- Display cierre items summary after close

### 5. Update API Routes
**File:** `packages/backend/src/api/distribuciones.ts`

**Add new endpoint:**
```typescript
.patch(
  "/:id/close-with-items",
  async ({ ctx, params, body, distribucionService }) => {
    const distribucion = await distribucionService.closeDistribucionWithItems(
      ctx,
      params.id,
      {
        notaCierre: body.notaCierre,
        items: body.items,
      }
    );
    return { success: true, data: distribucion };
  },
  {
    body: t.Object({
      notaCierre: t.Optional(t.String()),
      items: t.Array(
        t.Object({
          variantId: t.String(),
          cantidadLlevada: t.Number({ minimum: 0 }),
          cantidadVendida: t.Number({ minimum: 0 }),
          cantidadDevuelta: t.Optional(t.Number({ minimum: 0 })),
        })
      ),
    }),
  }
)
```

## UI Flow

### Step 1: Vendor clicks "Cerrar Distribución"
- Show CloseDistribucionForm modal

### Step 2: Vendor adds products
- Select product variant
- Input: cantidadLlevada
- Input: cantidadVendida
- System calculates: cantidadDevuelta

### Step 3: Vendor reviews and submits
- See summary of all items
- Add notaCierre if needed
- Submit to close distribution

### Step 4: System processes
- Validates data
- Creates cierre_items
- Updates distribucion estado to cerrado
- Syncs to server

## Implementation Steps

1. **Create CloseDistribucionForm component**
   - UI with product selector
   - Editable table for quantities
   - Validation logic
2. **Add closeWithItems to DistribucionService**
3. **Add useCloseDistribucion hook**
4. **Add API endpoint in backend**
5. **Update Mi Distribucion page**
6. **Test end-to-end flow**

## Verification Checklist

- [ ] CloseDistribucionForm component created
- [ ] Product selector works
- [ ] Quantities editable
- [ ] Auto-calculate devuelta
- [ ] Validation: at least one item
- [ ] closeWithItems service method works
- [ ] useCloseDistribucion hook works
- [ ] API endpoint accepts close with items
- [ ] Mi Distribucion page updated
- [ ] End-to-end flow tested

## Dependencies

**Blocks:** T-012  
**Depends on:** T-002, T-008

## Notes

- This is the key UX change - vendors now register at close time
- Make the UI mobile-friendly (vendors use phones)
- Consider quick-add buttons for common quantities
- Show running totals for verification
