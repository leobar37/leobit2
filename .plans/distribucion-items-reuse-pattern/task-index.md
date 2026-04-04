# Task Index: Distribución Items (Reusing Sales/Purchases Pattern)

## Overview
Implement item management for distribuciones following the established architectural patterns from sales (SaleService) and purchases (PurchaseService).

## Task Flow

```
T-001 (DB Schema)
    ↓
T-002 (Backend Service)
    ↓
T-003 (Backend API)
    ↓
T-004 (Frontend Service) ← Reuses patterns from sale-service.ts
    ↓
T-005 (Frontend Hooks)   ← Reuses patterns from use-sales.ts
    ↓
T-006 (UI Components)
    ↓
T-007 (Integration)
    ↓
T-008 (Verification)
```

## Task Summary

| ID | Title | Priority | Est. Hours | Dependencies |
|----|-------|----------|------------|--------------|
| T-001 | DB Schema - Create distribucion_items table | P0 | 1 | None |
| T-002 | Backend - DistribucionItemService | P0 | 3 | T-001 |
| T-003 | Backend - API endpoints for items | P0 | 2 | T-002 |
| T-004 | Frontend - DistribucionService with items | P0 | 3 | T-001 |
| T-005 | Frontend - Hooks for distribucion items | P0 | 2 | T-004 |
| T-006 | Frontend - Item editor component | P1 | 3 | T-005 |
| T-007 | Integration - Create form with items | P1 | 2 | T-006 |
| T-008 | Verification - Test coverage | P1 | 2 | T-007 |

## Pattern References

### Backend Pattern (from PurchaseService)
- `create()` with optional items
- `addItem()` - Add single item
- `updateItem()` - Update quantities
- `removeItem()` - Delete item
- `recalculateTotal()` - Recalculate if needed

### Frontend Pattern (from SaleService)
- `createWithItems()` - Atomic create with items
- `addItem()` - Add to existing
- `updateItem()` - Modify item
- `removeItem()` - Remove item
- `findById()` - Get with items joined

### Hook Pattern (from use-sales.ts)
- `useCreateDistribucion()` - Create with items
- `useAddDistribucionItem()` - Add item mutation
- `useUpdateDistribucionItem()` - Update item mutation
- `useRemoveDistribucionItem()` - Remove item mutation

## Open Questions

1. **Should items be editable by vendedores or only admin?**
   - Answer: Admin can assign items, vendedor can update sold quantities during closure

2. **What happens to items when distribution is closed?**
   - Items remain as historical record
   - Cierre creates separate cierre_items if needed

3. **Should we allow items without variants (generic products)?**
   - No, follow same pattern as sales: always require variantId

## Key Implementation Notes

### Critical: Reuse Existing Patterns
- Copy-paste-adapt from `sale-service.ts` and `purchase-service.ts`
- Use identical transaction patterns
- Use identical sync patterns (syncGroupId)
- Use identical hook patterns with TanStack Query

### Critical: No Stock Impact
- This is informational only
- No inventory adjustments on create/update/delete
- Validation is advisory (warnings, not blocks)
