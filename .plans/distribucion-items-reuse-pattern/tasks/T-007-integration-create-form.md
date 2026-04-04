# T-007: Integration - Create Form with Items

**Status:** pending  
**Priority:** P1  
**Est. Time:** 2 hours  
**Requirements:** FR-002  
**Depends on:** T-006  
**Blocks:** T-008

## Description
Integrate the item editor into the distribucion creation form with toggle for optional item assignment.

## File to Modify
**packages/app/app/components/distribucion/create-distribucion-form.tsx**

## Changes Required

### 1. Add Toggle for Items

```typescript
const [assignItems, setAssignItems] = useState(false);
const [items, setItems] = useState<CreateDistribucionItemInput[]>([]);
```

### 2. Toggle UI

```tsx
<div className="border rounded-lg p-4">
  <div className="flex justify-between items-center">
    <div>
      <Label className="font-medium">Asignar productos (opcional)</Label>
      <p className="text-sm text-muted-foreground">
        Controlar qué productos lleva el vendedor
      </p>
    </div>
    <Switch
      checked={assignItems}
      onCheckedChange={setAssignItems}
    />
  </div>
</div>
```

### 3. Conditional Item Editor

```tsx
{assignItems && (
  <DistribucionItemEditor
    items={items}
    onItemsChange={setItems}
    readOnly={false}
  />
)}
```

### 4. Update Submit Handler

```typescript
const handleSubmit = () => {
  onSubmit({
    vendedorId: selectedVendedor.id,
    puntoVenta: selectedPuntoVenta.name,
    puntoVentaId: selectedPuntoVenta.id,
    groupId: selectedGroup?.id,
    notaCreacion: notaCreacion.trim() || undefined,
    items: assignItems ? items : undefined, // Only if toggle enabled
  });
};
```

## File to Modify
**packages/app/app/routes/_protected.distribuciones.nueva.tsx**

## Changes Required

### Update Mutation Usage

```typescript
const createDistribucion = useCreateDistribucionWithItems();

const handleCreate = async (data: CreateDistribucionInput) => {
  await createDistribucion.mutateAsync({
    distribucion: {
      vendedorId: data.vendedorId,
      puntoVenta: data.puntoVenta,
      puntoVentaId: data.puntoVentaId,
      groupId: data.groupId,
      notaCreacion: data.notaCreacion,
    },
    items: data.items,
  });
};
```

## UX Flow

### Flow A: Sin Items (Libre)
1. User fills vendedor, punto de venta
2. Toggle "Asignar productos" = OFF
3. Submit → Creates distribucion without items
4. Vendedor sells freely

### Flow B: Con Items (Control)
1. User fills vendedor, punto de venta
2. Toggle "Asignar productos" = ON
3. Item editor appears
4. User adds products with quantities
5. Submit → Creates distribucion with items
6. Vendedor sees assigned products

## Edge Cases

### Toggle Off with Items
- If user turns toggle OFF after adding items
- Clear items array or show warning
- Decision: Clear items (simpler)

### Empty Items with Toggle On
- Validation: If toggle ON, require at least 1 item
- Show error: "Agrega al menos un producto"

## Verification Checklist

- [ ] Toggle appears in create form
- [ ] Item editor shows/hides based on toggle
- [ ] Form submits with items when toggle ON
- [ ] Form submits without items when toggle OFF
- [ ] Validation: items required when toggle ON
- [ ] Loading state during submission
- [ ] Success redirects to distribucion list
- [ ] Error handling with toast messages
