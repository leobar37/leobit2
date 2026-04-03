# T-010: Tests - Update distribucion tests

**Status:** pending  
**Priority:** P1  
**Est. Time:** 2-3 hours  
**Requirements:** NFR-002  

## Description
Update all affected tests to work with the simplified inventory system. Remove tests for modo behavior and add tests for the new cierre flow.

## Files to Modify

### 1. State Machine Tests
**File:** `packages/backend/src/services/transitions/distribucion.test.ts`

**Options:**
- **Option A (Remove):** Delete entire file if state machine is removed
- **Option B (Update):** Rewrite tests to verify no side effects

**If updating:**
```typescript
// Test that transitions DON'T modify stock
describe("Distribucion State Machine", () => {
  it("should NOT reserve stock on activo transition", async () => {
    // Create distribucion with items
    // Transition to activo
    // Assert: inventory quantities unchanged
  });

  it("should NOT return stock on cerrado transition", async () => {
    // Create distribucion with items
    // Transition to cerrado
    // Assert: inventory quantities unchanged
  });
});
```

### 2. Distribucion Service Tests
**Find file:** Look for `distribucion.service.test.ts` or similar

**Update tests:**
- Remove modo parameter from create calls
- Remove tests for modo validation
- Remove tests for stock reservation on create
- Add tests for cierre flow

### 3. Sale Service Tests
**File:** `packages/backend/src/services/transitions/sale.test.ts` or similar

**Update tests:**
- Remove tests for modoDistribucion validation
- Remove tests for stock validation in modo estricto
- Remove tests for distribucion item updates on sale
- Sales should work without distribucion

### 4. Sync Handler Tests
**Find file:** Look for `DistribucionSyncHandler.test.ts` or similar

**Update tests:**
- Update test payloads to not include modo
- Remove modo validation tests

### 5. Seed Tests
**File:** `packages/backend/src/seed/__tests__/client2-seed.test.ts`

**Update:**
- Remove modo references in seed data
- Update assertions

### 6. Frontend Tests
**Files to check:**
- `packages/app/app/components/distribucion/__tests__/*.tsx`
- Any tests for create-distribucion-form

**Update:**
- Remove modo from test form data
- Update expectations

## New Tests to Add

### 1. Cierre Flow Tests (Backend)
```typescript
describe("Distribucion Cierre Flow", () => {
  it("should create cierre items on close", async () => {
    // Create active distribucion
    // Close with items
    // Assert: cierre_items created
    // Assert: distribucion estado = cerrado
  });

  it("should calculate devuelta from llevada and vendida", async () => {
    // Close with llevada=10, vendida=8
    // Assert: devuelta=2
  });

  it("should require at least one item on close", async () => {
    // Try close with empty items
    // Assert: validation error
  });
});
```

### 2. Simplified Sale Tests (Backend)
```typescript
describe("Sale Creation (Simplified)", () => {
  it("should create sale without distribucion", async () => {
    // Create sale without distribucionId
    // Assert: sale created successfully
  });

  it("should create sale with distribucion (reference only)", async () => {
    // Create sale with distribucionId
    // Assert: sale references distribucion
    // Assert: no distribucion items modified
  });
});
```

## Implementation Steps

1. **Identify all test files**
   - Search for modo references in tests
   - List affected files
2. **Update backend tests**
   - State machine tests
   - Service tests
   - Sync handler tests
3. **Update frontend tests**
   - Component tests
   - Hook tests
4. **Add new cierre flow tests**
5. **Run full test suite**
6. **Fix any regressions**

## Verification Checklist

- [ ] State machine tests updated/removed
- [ ] Distribucion service tests updated
- [ ] Sale service tests updated
- [ ] Sync handler tests updated
- [ ] Seed tests updated
- [ ] Frontend tests updated
- [ ] New cierre flow tests added
- [ ] All tests passing
- [ ] Test coverage maintained

## Dependencies

**Blocks:** T-012  
**Depends on:** T-004, T-005, T-006

## Notes

- Focus on removing modo-related assertions
- Ensure cierre flow is well-tested (new functionality)
- Check test coverage report
- Integration tests are most important
