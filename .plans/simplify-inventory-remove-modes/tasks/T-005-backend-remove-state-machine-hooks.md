# T-005: Backend - Remove state machine hooks

**Status:** pending  
**Priority:** P0  
**Est. Time:** 1-2 hours  
**Requirements:** FR-002  

## Description
Remove the stock reservation and return hooks from the distribucion state machine transitions. The state machine can remain for status tracking, but inventory-related side effects must be eliminated.

## Files to Modify

### 1. State Machine Transitions
**File:** `packages/backend/src/services/transitions/distribucion.ts`

**Current code to remove:**
```typescript
// REMOVE ENTIRE FILE CONTENT - or simplify to empty transitions

// These hooks are being removed:
// 1. null → "activo": Reserve stock from inventory
// 2. "activo" → "cerrado": Return unsold stock to inventory
// 3. "en_ruta" → "cerrado": Return unsold stock to inventory
```

**Option A - Remove entire file (recommended):**
- Delete `packages/backend/src/services/transitions/distribucion.ts`
- Delete `packages/backend/src/services/transitions/distribucion.test.ts`

**Option B - Simplify to no-ops:**
```typescript
export function setupDistribucionTransitions(
  machine: StateMachine<DistribucionWithItems, DistribucionState>,
  variantRepo: ProductVariantRepository
): void {
  // State transitions without side effects
  machine
    .onTransition(null, "activo", async () => {
      // No-op: Stock no longer reserved on activation
    })
    .onTransition("activo", "cerrado", async () => {
      // No-op: Stock no longer returned on close
    })
    .onTransition("activo", "en_ruta", async () => {
      // No-op
    })
    .onTransition("en_ruta", "cerrado", async () => {
      // No-op: Stock no longer returned on close
    });
}
```

### 2. Distribucion Service
**File:** `packages/backend/src/services/business/distribucion.service.ts`

**Remove state machine imports and calls:**
```typescript
// REMOVE import:
import { distribucionMachine } from "../transitions";

// REMOVE call in createDistribucion (around line 257):
await distribucionMachine.executeTransition(ctx, distribucionWithItems, null, "activo");

// REMOVE call in closeDistribucion (around line 341):
await distribucionMachine.executeTransition(ctx, existing, previousState, "cerrado");
```

### 3. Transition Index
**File:** `packages/backend/src/services/transitions/index.ts`

**Remove distribucion exports:**
```typescript
// REMOVE:
export * from "./distribucion";
```

## Impact Analysis

| Component | Before | After |
|-----------|--------|-------|
| Create distribucion | Reserves stock | No side effect |
| Close distribucion | Returns stock | No side effect |
| State machine | Has inventory hooks | Empty/no-ops or removed |
| Tests | Test stock movements | Test status changes only |

## Implementation Steps

1. **Option decision:** Choose A (remove) or B (simplify)
2. If Option A:
   - Delete distribucion.ts
   - Delete distribucion.test.ts
   - Remove imports from index.ts
   - Remove imports from distribucion.service.ts
3. If Option B:
   - Replace hook implementations with no-ops
   - Update tests to not expect stock changes
4. Update DistribucionService to not call state machine
5. Run tests

## Verification Checklist

- [ ] State machine hooks removed or no-op
- [ ] distribucionMachine.executeTransition calls removed from service
- [ ] Stock not modified on createDistribucion
- [ ] Stock not modified on closeDistribucion
- [ ] Tests updated or removed
- [ ] No references to distribucion transitions

## Dependencies

**Blocks:** T-010  
**Depends on:** T-003

## Notes

- Option A (remove) is cleaner - less code to maintain
- State machine pattern may be useful for other features; keep the framework
- If keeping the file (Option B), add comments explaining why empty
- Update any docs that reference these hooks
