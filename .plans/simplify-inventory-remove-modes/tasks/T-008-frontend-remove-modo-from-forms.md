# T-008: Frontend - Remove modo from forms

**Status:** pending  
**Priority:** P0  
**Est. Time:** 2 hours  
**Requirements:** FR-001  

## Description
Simplify the distribution creation and editing forms by removing all mode-related UI elements and logic.

## Files to Modify

### 1. Create Distribution Form
**File:** `packages/app/app/components/distribucion/create-distribucion-form.tsx`

**Changes:**

**a) Remove modo type and state (lines 12, 30-31):**
```typescript
// REMOVE line 12:
type ModoDistribucion = "estricto" | "acumulativo" | "libre";

// REMOVE lines 30-31:
// Modo is always 'libre' - hiding selector temporarily
const modo: ModoDistribucion = "libre";
```

**b) Simplify submit handler (lines 44-54):**
```typescript
// BEFORE:
onSubmit({
  vendedorId: selectedVendedor.id,
  puntoVenta: selectedPuntoVenta.name,
  puntoVentaId: selectedPuntoVenta.id,
  groupId: selectedGroup?.id,
  notaCreacion: notaCreacion.trim() || undefined,
  modo: modo,  // REMOVE
  items: [], // Empty items for 'libre' mode - products registered on close
});

// AFTER:
onSubmit({
  vendedorId: selectedVendedor.id,
  puntoVenta: selectedPuntoVenta.name,
  puntoVentaId: selectedPuntoVenta.id,
  groupId: selectedGroup?.id,
  notaCreacion: notaCreacion.trim() || undefined,
  // No items - products registered on close
});
```

**c) Remove comments about hidden modo selector (lines 118-119):**
```typescript
// REMOVE:
{/* Modo selector hidden - defaulting to 'libre' mode */}
{/* Product selector hidden for 'libre' mode - products registered on close */}
```

### 2. Edit Distribution Form
**File:** `packages/app/app/components/distribucion/edit-distribucion-form.tsx`

**Changes:**
- Check if this form has modo-related logic
- Remove any modo selector or validation
- Simplify to only editable fields: puntoVenta, notas

### 3. Distribution Table
**File:** `packages/app/app/components/distribucion/distribucion-table.tsx`

**Changes:**
- Remove modo column if present
- Remove modo-based styling or badges

### 4. Update Hooks
**File:** `packages/app/app/hooks/use-distribuciones.ts`

**Changes:**
- Update CreateDistribucionInput type export
- Remove modo from any default values

## UI Simplifications

### Before:
- Form had hidden modo selector (hardcoded to "libre")
- Comments explaining why modo is hidden
- Unused item selector for non-libre modes

### After:
- Clean form: Vendedor, Punto de Venta, Grupo, Notas
- No references to modo
- Clear UX: products registered at close time

## Implementation Steps

1. Update create-distribucion-form.tsx
   - Remove modo type
   - Remove modo state
   - Simplify submit data
   - Clean up comments
2. Update edit-distribucion-form.tsx
   - Remove modo references
3. Update distribucion-table.tsx
   - Remove modo column
4. Update use-distribuciones.ts
   - Clean up types
5. Test forms render correctly

## Verification Checklist

- [ ] modo type removed from create form
- [ ] modo state removed from create form
- [ ] Submit handler simplified
- [ ] Comments about hidden modo removed
- [ ] Edit form cleaned
- [ ] Table column removed (if existed)
- [ ] Forms render without errors
- [ ] Distribution creation works end-to-end

## Dependencies

**Blocks:** T-009  
**Depends on:** T-007

## Notes

- The form becomes much simpler - only essential fields
- Product selection moves to close-time flow (T-009)
- Test both create and edit flows
