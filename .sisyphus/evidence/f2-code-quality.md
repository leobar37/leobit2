# F2. Code Quality Review Evidence

**Reviewer**: Sisyphus-Junior  
**Date**: 2026-04-28  
**Scope**: Post-migration code quality review (offline-first → online-first)  
**Files reviewed**: `packages/app/app/components/sales/new-sale.tsx`, `packages/app/app/hooks/use-sales.ts`, `packages/backend/src/api/public-sales.ts`, `packages/backend/src/db/schema/index.ts`, plus cross-file pattern searches across the app package.

---

## Verdict: REJECT

The migration from offline-first to online-first introduces **systemic type safety regressions**, **production debug noise**, and **incomplete cleanup of offline patterns**. While LSP diagnostics are clean (no type errors), the codebase relies heavily on `as any` casts and compatibility shims that mask underlying type mismatches. These are not acceptable for production code.

---

## 1. Dead Imports

**Status**: PASS

All 4 key files were inspected for unused imports:

| File | Result |
|------|--------|
| `new-sale.tsx` | All 21 imports are referenced. No dead imports. |
| `use-sales.ts` | All 7 imports are referenced. No dead imports. |
| `public-sales.ts` | All imports are referenced. No dead imports. |
| `schema/index.ts` | Barrel file; all exports are intentional. |

---

## 2. Compatibility Shims

**Status**: FAIL — 10 `as any` casts found

### `as any` Casts (Type Safety Regression)

| File | Line | Code | Issue |
|------|------|------|-------|
| `new-sale.tsx` | 46 | `useSaleCalculations(sale as any, items)` | `sale` from context doesn't match `Sale \| null` expected by hook |
| `new-sale.tsx` | 71 | `(sale as any)?.customer_id` | Accessing snake_case DB property through `as any` — type inconsistency between DB schema and frontend types |
| `new-sale.tsx` | 134 | `useSaleCalculations(sale as any, items)` | Same as line 46 — repeated 4× total |
| `new-sale.tsx` | 340 | `useSaleCalculations(sale as any, items)` | Same pattern |
| `new-sale.tsx` | 412 | `useSaleCalculations(sale as any, items)` | Same pattern |
| `new-sale.tsx` | 572 | `product: selectedProduct as any` | Bypassing product type for calculator |
| `new-sale.tsx` | 573 | `variant: selectedVariant as any` | Bypassing variant type for calculator |
| `use-sales.ts` | 390 | `} as any)` | API payload cast hiding Eden Treaty type mismatch |
| `use-sales.ts` | 432 | `} as any)` | Same pattern — second mutation payload |
| `use-sales-db.ts` | 202 | `} as any)` | API payload cast for sale item creation |

**Root cause**: The `Sale` type defined in `use-sales.ts` (camelCase: `customerId`) does not align with the runtime shape coming from context/hooks, which sometimes carries snake_case (`customer_id`). Rather than fixing the type at the source, the agent papered over it with `as any`. This is a **systemic type safety regression**.

### TODO / FIXME / HACK / @ts-ignore

- No `TODO`, `FIXME`, `HACK`, `xxx`, `@ts-ignore`, or `@ts-expect-error` found in changed files.
- **However**, the `as any` casts serve the same purpose as `@ts-ignore` — they suppress type errors without documenting why.

---

## 3. Half-Online Cache Leftovers

**Status**: PARTIAL — Core infra clean, but sync-status shims remain in UI and types

### Clean ✅

| Check | File | Result |
|-------|------|--------|
| No sync cursor keys | `session-storage.ts` | PASS — only `bearer_token`, `current_business_id`, `current_business_user_id` |
| No `networkMode: "offlineFirst"` | `query/client.ts` | PASS — uses standard `staleTime`, `retry`, `gcTime` |
| No `PGlite` references | App production code | PASS — no matches found |

### Remaining Shims ⚠️

| File | Evidence | Severity |
|------|----------|----------|
| `use-sales.ts:285-303` | `useSaleSyncStatus` hook — "Simplified for API-based architecture — always reports synced". Returns hardcoded `isSynced: true`, `syncStatus: "synced"`. | Medium — dead code carrying offline abstraction |
| `use-customers.ts` | Type still includes `syncStatus: string` and `syncAttempts: number` | Medium — type pollution |
| `use-purchases.ts` | Type still includes `syncAttempts?: number` and `syncStatus?: string` | Medium — type pollution |
| `sale-card.tsx:16` | `type SaleWithOptionalSync = Sale & { syncStatus?: string }` — extends type to re-add sync field | Medium — UI shim |
| `sale-card.tsx:133-145` | Renders sync status badge UI based on `syncStatus` | Low — UI shows "Sincronizado" unconditionally |
| `sale-detail-summary-card.tsx:6` | Same `SaleWithOptionalSync` pattern | Medium — UI shim |
| `customer-card.tsx:40` | `const isPending = customer.syncStatus === "pending"` | Medium — logic assumes offline sync states |
| `_protected.clientes._index.tsx:85` | `syncStatus: group.syncStatus` | Low — group sync status referenced |
| `_protected.grupos.$id._index.tsx:147` | `<SyncBadge status={group.syncStatus as ...} />` | Low — sync badge rendered |

**Assessment**: The core query client and storage are clean, but **sync status concepts leak into types and UI components** across 8+ files. These are compatibility shims that should be removed now that the app is online-only.

---

## 4. Unnecessary Broad Refactors

**Status**: CONCERN

### Scope Assessment

| Aspect | Finding |
|--------|---------|
| Sales flow redesign | `new-sale.tsx` is 981 lines with 7 exported components (CustomerSection, PaymentModeSection, CartItemRow, CartSection, SaleSummaryCard, SaleSubmitBar, CalculatorContent). This is **well beyond** a reasonable single-file component size. |
| Calculator content | CalculatorContent alone handles product selection, variant selection, kg/unit calculator modes, auto-calculation toggles, and edit-mode population — ~400 lines. |
| Beyond offline-blocking | The sales UI was fully redesigned (new card styles, gradient summary, bottom submit bar, inline calculator) rather than just adding an "offline = block sale" message. This is **scope creep**. |
| Overall migration | ~100+ files changed (per git status). For an offline→online migration, this volume is expected (hooks, services, routes, components all need updates). |

**Conclusion**: While the overall migration scope is defensible, the decision to **rebuild the entire sales UI in a single 981-line file** without splitting into smaller components is a maintainability regression. The agent should have added the online check to existing components rather than redesigning them.

---

## 5. AI Slop

**Status**: FAIL

### Console Statements in Production Code

| File | Line | Statement | Issue |
|------|------|-----------|-------|
| `new-sale.tsx` | 63 | `console.error("[CustomerSection] Error updating customer:", error)` | Production debug noise. Errors are already shown via `toast.error()`. |
| `new-sale.tsx` | 457 | `console.error("[SaleSubmitBar] Error finalizing sale:", error)` | Same — duplicate error reporting. |
| `new-sale.tsx` | 650 | `console.error("[CalculatorContent] Error saving item:", error)` | Same — duplicate error reporting. |
| `use-sales.ts` | 435 | `console.log("[Perf][useCreateDraftSale] mutationFn", {...})` | Performance logging left in production hook. Should be behind a debug flag or removed. |

**Total**: 4 console statements in production paths.

### Type Assertions

- **10 `as any` casts** (documented in Section 2). These are incorrect type assertions that hide real type mismatches.
- **3 `as { name: string } \| null`** and **`as unknown as SaleItem`** in `use-sales-db.ts` (lines 189-191, 204, 283). Less severe than `as any` but still bypassing type safety.

### Empty Catch Blocks

- No truly empty catch blocks found.
- `new-sale.tsx:176` has `catch {` (no error binding), but it does call `toast.error()` inside — acceptable pattern.

### Unused Variables

- No unused variables found in the 4 key files.

---

## LSP Diagnostics

All 4 key files pass TypeScript type checking with **zero diagnostics**:

| File | Errors | Warnings | Hints |
|------|--------|----------|-------|
| `new-sale.tsx` | 0 | 0 | 0 |
| `use-sales.ts` | 0 | 0 | 0 |
| `public-sales.ts` | 0 | 0 | 0 |
| `schema/index.ts` | 0 | 0 | 0 |

> Note: Clean diagnostics do **not** indicate clean code when `as any` is used to suppress errors.

---

## Summary Table

| Category | Status | Severity | Fix Required |
|----------|--------|----------|--------------|
| Dead imports | PASS | — | None |
| Compatibility shims (`as any`) | FAIL | High | Fix type mismatches, remove all `as any` |
| Half-online cache leftovers | PARTIAL | Medium | Remove syncStatus from types and UI |
| Unnecessary broad refactors | CONCERN | Medium | Split `new-sale.tsx` into smaller files |
| AI slop (console statements) | FAIL | Medium | Remove 4 console statements |
| AI slop (type assertions) | FAIL | High | Remove 10 `as any` + 3 weaker assertions |
| LSP diagnostics | PASS | — | None |

---

## Recommended Fixes (Priority Order)

1. **High**: Remove all `as any` casts and fix underlying type mismatches:
   - Align `Sale` type from `use-sales.ts` with the shape returned by context/hooks
   - Fix Eden Treaty payload types for `useCreateSale` and `useCreateDraftSale`
   - Fix `useSmartCalculator` product/variant types

2. **High**: Remove 4 console statements from production code.

3. **Medium**: Clean up sync status shims:
   - Remove `useSaleSyncStatus` hook or replace with no-op
   - Remove `syncStatus`/`syncAttempts` from `use-customers.ts`, `use-purchases.ts`
   - Remove `SaleWithOptionalSync` from `sale-card.tsx` and `sale-detail-summary-card.tsx`
   - Remove sync badge rendering from customer/group cards

4. **Medium**: Split `new-sale.tsx` into focused component files:
   - `sale-customer-section.tsx`
   - `sale-payment-section.tsx`
   - `sale-cart-section.tsx`
   - `sale-calculator-content.tsx`
   - `sale-submit-bar.tsx`

---

*Evidence compiled from direct file reads, grep searches, and LSP diagnostics. No code changes were made during this review.*
