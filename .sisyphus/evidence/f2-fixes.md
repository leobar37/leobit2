# F2 Code Quality Review Fixes

**Date:** 2026-04-28
**Build Status:** PASS
**TypeCheck Status:** PASS

## Summary

Fixed all F2 reviewer blockers across the sales module and related files. Build and typecheck both pass.

---

## Fix 1: Removed `as any` Casts (HIGH PRIORITY)

### `packages/app/app/components/sales/new-sale.tsx`
- **Line 46, 134, 340, 412**: Removed `sale as any` from `useSaleCalculations(sale as any, items)` calls.
  - Root cause: `sale` type in `new-sale-context.tsx` was typed as `ReturnType<typeof useSale>["data"]`, which resolved loosely.
  - Fix: Explicitly typed `sale` as `SaleWithItems | null` in `NewSaleContextType`.
- **Line 71**: Removed `(sale as any)?.customer_id` fallback.
  - Fix: Changed to `sale?.customerId ?? null` only. API-based architecture uses camelCase exclusively.
- **Lines 572-573**: Removed `selectedProduct as any` and `selectedVariant as any`.
  - Fix: Changed `useSmartCalculator` hook to accept a minimal `CalculatorProduct` interface (`{ id, unit }`) instead of the full `@avileo/shared` `Product` type, which had extra fields (`version`, `syncStatus`, `syncAttempts`) not present in the frontend `Product` interface.

### `packages/app/app/hooks/use-sales.ts`
- **Line 390**: Removed `} as any)` in `useCreateSale`.
  - Fix: Removed `id: undefined` from the payload (optional field should be omitted, not set to `undefined`).
- **Line 432**: Removed `} as any)` in `useCreateDraftSale`.
  - Fix: Removed `as any`; the payload already matches the API schema.

### `packages/app/app/hooks/use-sales-db.ts`
- **Line 202**: Removed `} as any)` in `useAddSaleItem`.
  - Fix: Removed `as any`; the payload matches the API schema.

### `packages/app/app/lib/mappers/entity-mapper.ts`
- Replaced 6 occurrences of `as any` with `as unknown as SnakeCaseKeysToCamelCase<T>` and `Record<string, unknown>` for the accumulator variable.
- This is a generic recursive mapper where TypeScript cannot prove type preservation; `unknown` is safer than `any`.

### `packages/app/app/hooks/use-purchases.ts`
- **Line 141**: Removed `input as any` in `useCreatePurchase`.
- **Line 183**: Removed `{ status } as any` in `useUpdatePurchaseStatus`.

---

## Fix 2: Removed console.log/console.error Statements (HIGH PRIORITY)

Removed from production code paths while preserving `toast.error()` calls for user feedback:

### `packages/app/app/components/sales/new-sale.tsx`
- Line 63: `console.error("[CustomerSection] Error updating customer:", error)` → removed
- Line 457: `console.error("[SaleSubmitBar] Error finalizing sale:", error)` → removed
- Line 650: `console.error("[CalculatorContent] Error saving item:", error)` → removed

### `packages/app/app/hooks/use-sales.ts`
- Line 435: `console.log("[Perf][useCreateDraftSale] mutationFn", {...})` → removed
- Also removed unused `perfStart` variable and `useCallback` import.

### `packages/app/app/components/sales/sale-card.tsx`
- Line 67: `console.error("Error deleting sale:", error)` → removed

### `packages/app/app/components/sales/create-sale-type-sheet.tsx`
- Line 67: `console.log("[Perf][CreateSaleTypeSheet] direct draft created", {...})` → removed
- Line 140: `console.log("[Perf][CreateSaleTypeSheet] pre-order draft created", {...})` → removed
- Also removed unused `perfStart` variables.

### `packages/app/app/components/sales/confirm-delivery-dialog.tsx`
- Line 97: `console.error("Error confirming delivery:", error)` → removed

### `packages/app/app/components/sales/reschedule-sale-dialog.tsx`
- Line 76: `console.error(error)` → removed

### `packages/app/app/components/sales/deliver-sale-dialog.tsx`
- Line 55: `console.error("Error delivering sale:", error)` → removed

---

## Fix 3: Cleaned Up Sync Status Shims (MEDIUM PRIORITY)

### `packages/app/app/hooks/use-sales.ts`
- **Lines 285-303**: Removed `useSaleSyncStatus` stub hook entirely.
  - It always returned `isSynced: true` since the app is now online-first.
  - Removed unused `useCallback` import.

### `packages/app/app/components/sales/sale-share-drawer.tsx`
- Removed `useSaleSyncStatus` import.
- Removed `isSynced` / `ensureSynced` usage in `handleGenerate`.
- Token generation now proceeds directly when online (no dead sync check).

### `packages/app/app/components/sales/sale-card.tsx`
- Removed `SaleWithOptionalSync` type alias.
- Changed `SaleCardProps.sale` to use plain `Sale`.
- Removed `syncStatusLabel` map.
- Removed sync status badge rendering block.

### `packages/app/app/components/sales/sale-detail-summary-card.tsx`
- Removed `SaleWithOptionalSync` type alias.
- Changed `SaleDetailSummaryCardProps.sale` to use plain `Sale`.
- Removed sync status UI block (Wifi/WifiOff icons + labels).
- Removed unused `Wifi` and `WifiOff` imports.

### `packages/app/app/components/customers/customer-card.tsx`
- Removed `isPending` variable (`customer.syncStatus === "pending"`).
- Removed sync status badge rendering ("Sin sincronizar" with CloudOff icon).
- Removed unused `CloudOff` import.

### `packages/app/app/hooks/use-purchases.ts`
- Removed `syncAttempts?: number` and `syncStatus?: string` from `Purchase` interface (optional fields, safe to remove).

---

## Remaining Technical Debt (Documented)

The following items were **intentionally NOT changed** to avoid build breakage or cascading refactors:

1. **`use-customers.ts` `CustomerTagSummary` interface**: Still has `syncStatus: string` and `syncAttempts: number`. This type represents API responses for customer tag assignments. Removing these would require verifying the backend no longer returns them.

2. **`@avileo/shared` schema `products` table**: Still defines `version`, `syncStatus`, `syncAttempts` columns in the database schema. These are backend schema fields, not frontend types. The task explicitly stated: "Do NOT remove sync status from backend types/schema."

3. **Pre-existing `as any` in untouched files**: Files like `use-distribuciones.ts`, `use-stock-alerts.ts`, `use-suppliers.ts`, etc. have pre-existing `as any` casts that were not introduced by this migration. Per instructions: "Focus on files that were MODIFIED during Tasks 2-10. Don't fix pre-existing `as any` in untouched files."

---

## Verification

```bash
# From packages/app
bun run typecheck     # PASS — no TS errors

# From repo root
bun run build         # PASS — all packages build successfully
```
