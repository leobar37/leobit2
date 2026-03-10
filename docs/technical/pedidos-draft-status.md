# Pedidos Draft Implementation Status

> **Date**: March 2026  
> **Status**: REFACTOR REQUIRED  
> **Reason**: Incomplete migration causing runtime failures

## Executive Summary

The pedidos (orders) draft system is in a **broken mid-migration state**. An attempted migration from Zustand store to TanStack Query hooks was started but not completed, leaving incompatible APIs that cause runtime failures. Incremental patching cannot fix this—the architecture must be consolidated.

## Problem Statement

### What Was Attempted

The original implementation used a Zustand store (`draft-order.store.ts`) for managing order drafts:

```typescript
// OLD - Zustand store pattern
const activeDraftId = useDraftOrderStore((state) => state.activeDraftId);
```

The migration goal was to replace this with TanStack Query hooks for offline-first consistency with the rest of the app.

### What Actually Happened

1. **Entry point changed**: `/pedidos/nuevo` now creates a local draft via `createLocalOrder()` and navigates to `/pedidos/nuevo/:draftId`

2. **Store broken**: `useDraftOrderStore()` was rewritten to return a plain object, but components still call it with Zustand selectors:
   ```typescript
   // COMPONENT (calculator): useDraftOrderStore((state) => state.activeDraftId)
   // STORE: export function useDraftOrderStore(draftId: string) { return { ... }; }
   // RESULT: TypeError - selector is not a function
   ```

3. **Form stubbed**: `use-draft-order-form.ts` returns hardcoded defaults—all operations are no-ops

4. **No persistence**: Both `orders.ts` and `order-items.ts` use in-memory `Map`, losing data on refresh

## Affected Components

| Component | File | Issue |
|-----------|------|-------|
| Calculator page | `routes/_protected.pedidos.nuevo.$draftId.calculadora.tsx` | Broken store selectors |
| Calculator modal | `components/orders/calculator-modal.tsx` | Broken store selectors |
| Draft selector | `components/orders/draft-selector.tsx` | Broken store selectors |
| Draft form | `components/orders/draft-order-form.tsx` | Uses stub hook |
| Order hook | `hooks/use-draft-order-form.ts` | Returns inert defaults |
| E2E tests | `e2e/tests/06-order.spec.ts` | Flaky redirect timing |

## Why Bugs Persist

### 1. Type Error vs Runtime Error

The store export has a type that accepts `draftId: string`, but callers pass selectors. TypeScript may not catch this if types aren't strict, so it compiles but fails at runtime:

```typescript
// draft-order.store.ts line 9
export function useDraftOrderStore(draftId: string) { ... }

// calculator line 33
const activeDraftId = useDraftOrderStore((state) => state.activeDraftId);
```

When React renders, it passes a function where a string is expected.

### 2. Stub Masking Real Issues

The form hook returns defaults that make the form appear to work (no errors) but do nothing:

```typescript
// use-draft-order-form.ts lines 36-55
return {
  drafts: {},           // Empty - no drafts
  activeDraftId: null,  // Null - no selection
  handleSubmit: () => {}, // No-op
  items: [],            // Empty - can't add items
  // ...
};
```

This masks the underlying data layer issues.

### 3. In-Memory Only Storage

```typescript
// collections/orders.ts line 7
const localOrders = new Map<string, Order>();

// collections/order-items.ts line 6
const localOrderItems = new Map<string, OrderItem[]>();
```

These Maps exist only in memory. Page refresh = complete data loss.

## Why Refactor Is Needed

### Patching Cannot Fix API Incompatibility

The selector pattern is fundamentally incompatible with the function pattern:

| Approach | Usage | Can Patch? |
|----------|-------|------------|
| Zustand | `useStore(selector)` | Yes - same API |
| Function | `useStore(draftId)` returns object | Yes - same API |
| **Broken** | `useStore(selector)` where store is function | **No** |

Adding another compatibility layer would increase complexity without solving root cause.

### Multiple Sources of Truth

Currently:
- Entry point writes to `localOrders` Map
- Store reads via hooks from same Map
- Form hook returns stub values
- Calculator tries to use broken store

Consolidation to single pattern (TanStack Query) is the only maintainable path.

## Recommended Fix Path

### Phase 1: Fix Store API Mismatch (Priority: Critical)

**Option A**: Restore Zustand store fully
- Revert `draft-order.store.ts` to Zustand implementation
- Keep navigation flow as-is
- Risk: Duplicates state management patterns

**Option B**: Migrate components to TanStack Query
- Remove `useDraftOrderStore` entirely
- Update calculator to use `useOrder(draftId)` and `useOrderItems(draftId)`
- Update other components similarly
- Risk: Medium - requires careful testing

**Recommendation**: Option B - aligns with rest of app

### Phase 2: Add Persistence (Priority: High)

Replace in-memory Maps with IndexedDB:

```typescript
// Target: collections/orders.ts
// Use existing sync infrastructure from lib/sync/
import { syncClient } from "~/lib/sync/client";
```

### Phase 3: Implement Form Hook (Priority: High)

Replace stub with real implementation:

```typescript
// Target: hooks/use-draft-order-form.ts
// Use useOrder, useOrderItems, useUpdateOrder hooks
// Connect to form handlers properly
```

### Phase 4: Stabilize E2E (Priority: Medium)

Update tests to handle new flow:

```typescript
// Current: await page.goto("/pedidos/nuevo");
// Issue: Redirects to /pedidos/nuevo/:draftId
// Fix: Wait for redirect or navigate directly
```

## Files That Need Changes

### Must Modify
- `app/stores/draft-order.store.ts` - Remove or fix
- `app/routes/_protected.pedidos.nuevo.$draftId.calculadora.tsx` - Fix hook usage
- `app/components/orders/calculator-modal.tsx` - Fix hook usage
- `app/components/orders/draft-selector.tsx` - Fix hook usage
- `app/hooks/use-draft-order-form.ts` - Implement properly
- `app/lib/db/collections/orders.ts` - Add persistence
- `app/lib/db/collections/order-items.ts` - Add persistence

### May Need Updates
- `e2e/page-objects/NewOrderPage.ts` - Adjust navigation
- `e2e/tests/06-order.spec.ts` - Adjust assertions

## Success Criteria

After refactor:
- [ ] Calculator page loads without errors
- [ ] Adding items to draft works
- [ ] Page refresh preserves draft data
- [ ] E2E tests pass consistently
- [ ] No Zustand-style selectors in new code

## Timeline Estimate

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 1 | Short (2h) | Medium |
| Phase 2 | Medium (4h) | Low |
| Phase 3 | Short (2h) | Low |
| Phase 4 | Short (1h) | Low |

**Total**: ~9 hours

## Related Documentation

- [Architecture Overview](../ARCHITECTURE.md)
- [Offline Plan](offline-plan.md)
- [TanStack DB](tanstack-db.md)
