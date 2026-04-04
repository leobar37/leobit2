# T-006: Frontend - Item Editor Component

**Status:** pending  
**Priority:** P1  
**Est. Time:** 3 hours  
**Requirements:** FR-003, FR-004, FR-005  
**Depends on:** T-005  
**Blocks:** T-007

## Description
Create reusable components for editing distribucion items following the purchase/sale item editor patterns.

## Components to Create

### 1. DistribucionItemEditor
**File:** `packages/app/app/components/distribucion/distribucion-item-editor.tsx`

```typescript
interface DistribucionItemEditorProps {
  distribucionId: string;
  items: DistribucionItemEnriched[];
  readOnly?: boolean;
  onItemsChange?: () => void;
}

export function DistribucionItemEditor({
  distribucionId,
  items,
  readOnly = false,
  onItemsChange,
}: DistribucionItemEditorProps)
```

**Features:**
- Table showing: Producto, Variante, Asignado, Vendido, Acciones
- Inline editing of cantidadAsignada
- Delete button for each item
- "Agregar Producto" button opening selector
- Summary row: Total asignado, Total vendido

### 2. DistribucionItemSelector
**File:** `packages/app/app/components/distribucion/distribucion-item-selector.tsx`

```typescript
interface DistribucionItemSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: CreateDistribucionItemInput) => void;
  excludeVariantIds?: string[]; // Already added variants
}
```

**Features:**
- Searchable list of product variants
- Show product name + variant name + unit
- Quick quantity input
- Prevent duplicates (filter excludeVariantIds)

### 3. DistribucionItemsSummary (Read-only)
**File:** `packages/app/app/components/distribucion/distribucion-items-summary.tsx`

```typescript
interface DistribucionItemsSummaryProps {
  items: DistribucionItemEnriched[];
}
```

**Features:**
- Compact view for closed distributions
- Show: Producto | Llevó | Vendió | Devolvió
- Calculated: Devolvió = Asignado - Vendido

## UI Design

### Item Table (Editor Mode)
```
┌─────────────────┬───────────┬──────────┬──────────┐
│ Producto        │ Asignado  │ Vendido  │          │
├─────────────────┼───────────┼──────────┼──────────┤
│ Pollo Entero    │    20     │    18    │  ✏️  🗑️  │
│ 2.5kg aprox     │   [kg]    │   [kg]   │          │
├─────────────────┼───────────┼──────────┼──────────┤
│ Pollo Entero    │    15     │    12    │  ✏️  🗑️  │
│ 3.0kg aprox     │   [kg]    │   [kg]   │          │
├─────────────────┼───────────┼──────────┼──────────┤
│                 │   [+ Add] │          │          │
└─────────────────┴───────────┴──────────┴──────────┘
Total: 35 kg asignados | 30 kg vendidos | 5 kg disponibles
```

### Item Selector Modal
```
┌─────────────────────────────────────┐
│  Agregar Producto              [X]  │
├─────────────────────────────────────┤
│  [🔍 Buscar producto...      ]      │
├─────────────────────────────────────┤
│  Pollo Entero - 2.5kg          S/12 │
│  Pollo Entero - 3.0kg    ✓     S/15 │
│  Filete Pechuga - 1kg          S/18 │
│  Alitas BBQ - 1kg              S/14 │
├─────────────────────────────────────┤
│  Cantidad: [  20  ] kg              │
├─────────────────────────────────────┤
│  [Cancelar]        [Agregar]        │
└─────────────────────────────────────┘
```

## Implementation Notes

### Use Existing Components
- Use `ProductVariantSelect` if exists (from purchases)
- Use same table styles as purchase-item-editor
- Use same modal/dialog patterns

### State Management
- Local state for editing quantities
- Optimistic updates with TanStack Query
- Rollback on error

### Validation
- cantidadAsignada > 0
- Prevent duplicate variants
- Show warning if vendido > asignado

## Files to Create

1. `packages/app/app/components/distribucion/distribucion-item-editor.tsx`
2. `packages/app/app/components/distribucion/distribucion-item-selector.tsx`
3. `packages/app/app/components/distribucion/distribucion-items-summary.tsx`

## Verification Checklist

- [ ] Item editor shows items in table
- [ ] Can edit cantidadAsignada inline
- [ ] Can delete items
- [ ] Item selector prevents duplicates
- [ ] Summary view calculates correctly
- [ ] Responsive design (mobile-first)
- [ ] Loading states handled
- [ ] Error states handled
