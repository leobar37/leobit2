# T-004: Backend - Simplify sale validation

**Status:** pending  
**Priority:** P0  
**Est. Time:** 2 hours  
**Requirements:** FR-004  

## Description
Remove all distribution mode-based stock validation from SaleService. Sales should proceed without checking distribution stock allocations.

## Files to Modify

### 1. Sale Service
**File:** `packages/backend/src/services/business/sale.service.ts`

**Changes:**

**a) Remove modoDistribucion check (lines 148-154):**
```typescript
// BEFORE:
const business = await this.businessRepository.findById(ctx, ctx.businessId);
if (!ctx.isAdmin() && business?.modoDistribucion !== "libre") {
  throw new ValidationError("No tiene distribución asignada para hoy");
}

// AFTER:
// Remove this check entirely - vendores can sell with or without distribucion
```

**b) Remove validarStockEstricto call (lines 196-201):**
```typescript
// REMOVE:
if (!isEmptyDraft && distribucion && distribucion.modo !== "libre" && !isPreOrder) {
  const distribucionItems = await this.distribucionItemRepository.findByDistribucionId(
    ctx,
    distribucion.id
  );
  // ... rest of stock validation
}
```

**c) Remove validarStockEstricto method (find and remove entire method):**
```typescript
// REMOVE entire method:
private async validarStockEstricto(
  ctx: RequestContext,
  distribucionId: string,
  items: Array<...>
): Promise<void> {
  // ... method body
}
```

**d) Remove modo-based sale item tracking (around line 196):**
```typescript
// BEFORE:
if (!isEmptyDraft && distribucion && distribucion.modo !== "libre" && !isPreOrder) {
  // Update distribucion item vendida counts
}

// AFTER:
// Remove this block - sales don't affect distribution items anymore
```

### 2. Remove unused imports
**File:** `packages/backend/src/services/business/sale.service.ts`

Remove imports that were only used for modo validation:
- Check if `DistribucionItemRepository` is still needed
- Keep if used elsewhere, remove if only for stock validation

## Simplified Flow

### Before:
1. Check if vendor has distribucion
2. Check modoDistribucion business setting
3. If modo !== "libre", validate stock against distribucion items
4. Update distribucion item vendida counts after sale
5. Throw errors if stock insufficient

### After:
1. Check if vendor has distribucion (optional reference)
2. Create sale directly
3. No distribucion item updates
4. No stock validation against distribucion

## Implementation Steps

1. Locate all modo-related validation in SaleService
2. Remove modoDistribucion check
3. Remove validarStockEstricto method
4. Remove distribucion item updates
5. Verify imports are still needed
6. Run type check

## Verification Checklist

- [ ] modoDistribucion check removed (line ~150)
- [ ] validarStockEstricto method removed
- [ ] validarStockEstricto call removed (line ~196)
- [ ] Distribucion item updates removed
- [ ] Sale creation works without distribucion
- [ ] Sale creation works with distribucion (as reference)
- [ ] TypeScript compiles

## Dependencies

**Blocks:** T-010  
**Depends on:** T-003

## Notes

- Sales still reference distribucion for reporting/tracking
- No stock is deducted from anywhere on sale creation
- Stock management becomes purely admin responsibility
- May need to update sale tests that relied on modo validation errors
