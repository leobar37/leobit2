# Sales Item Editing Feature - Avileo Project

## Context

This conversation was about the Avileo (PollosPro) project - an offline-first chicken sales management system built with React Router v7, PGlite, and ElysiaJS. The task started with analyzing the sales creation flow.

## The Problem / Objective

The original analysis revealed that users could add and remove items from a sale, but there was **no way to edit existing items**. The backend had the `updateItem` method, but the frontend lacked:
- A hook to call it
- UI to trigger editing
- Calculator integration for edit mode

## Key Decisions

- **Implemented item editing instead of creating new route**: The system uses drafts (created from `/ventas` list), so we extended the existing flow rather than adding a new route
- **Used context for edit state**: Added `editingItem` to `NewSaleContext` rather than passing through props
- **Reused CalculatorContent for edit mode**: Modified existing component to handle both add and edit modes instead of creating separate component

## Files Modified or Created

- `app/lib/services/sale-service.ts` - Added `updateItem()` method for PGlite
- `app/hooks/use-sales-db.ts` - Added `useUpdateSaleItem()` hook
- `app/components/sales/new-sale-context.tsx` - Extended with `editingItem` state and `setEditingItem` function
- `app/components/sales/new-sale.tsx` - Modified CartItemRow (edit button) and CalculatorContent (edit mode)

## Issues Found & Fixed

1. **useEffect dependencies**: Fixed missing deps (`setSelectedProductId`, `setSelectedVariantId`)
2. **Race condition**: Removed setTimeout, now waits for variants to load
3. **initializedRef reset**: Now resets when editing different item

## Next Step

The react-fix analysis revealed that `new-sale.tsx` is 915 lines and should be split into 6 separate component files. A plan was created:
1. Extract CustomerSection → `customer-section.tsx`
2. Extract PaymentModeSection → `payment-mode-section.tsx`
3. Extract SaleSummaryCard → `sale-summary-card.tsx`
4. Extract CartSection + CartItemRow → `cart-section.tsx`
5. Extract CalculatorContent → `calculator-content.tsx`
6. Keep new-sale.tsx as barrel exports only

Awaiting approval to proceed with the refactoring.

---

Document generated from this conversation
