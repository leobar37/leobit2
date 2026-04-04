# T-008: Verification - Test Coverage

**Status:** pending  
**Priority:** P1  
**Est. Time:** 2 hours  
**Requirements:** All  
**Depends on:** T-007  
**Blocks:** None

## Description
Create tests for distribucion items functionality following existing test patterns.

## Test Files to Create

### 1. Backend Service Tests
**File:** `packages/backend/src/services/business/distribucion-item.service.test.ts`

```typescript
describe("DistribucionItemService", () => {
  describe("createWithItems", () => {
    it("should create distribucion with items atomically");
    it("should rollback on item creation failure");
    it("should sync distribucion and items with same group");
  });

  describe("addItem", () => {
    it("should add item to active distribucion");
    it("should reject adding to closed distribucion");
    it("should validate variant exists");
  });

  describe("updateItem", () => {
    it("should update cantidadAsignada");
    it("should update cantidadVendida");
    it("should reject updates to closed distribucion");
  });

  describe("removeItem", () => {
    it("should remove item from active distribucion");
    it("should reject removal from closed distribucion");
  });
});
```

### 2. API Tests
**File:** `packages/backend/src/api/distribuciones.test.ts` (add to existing)

```typescript
describe("Distribucion Items API", () => {
  describe("POST /:id/items", () => {
    it("should create item and return 201");
    it("should return 404 if distribucion not found");
    it("should return 400 if distribucion closed");
  });

  describe("PATCH /:id/items/:itemId", () => {
    it("should update item quantities");
    it("should return 404 if item not found");
  });

  describe("DELETE /:id/items/:itemId", () => {
    it("should delete item");
    it("should return 403 if no permission");
  });
});
```

### 3. Frontend Service Tests
**File:** `packages/app/app/lib/services/distribucion-service.test.ts`

```typescript
describe("DistribucionService", () => {
  describe("create with items", () => {
    it("should create distribucion with items");
    it("should handle items undefined");
    it("should sync all items with same group");
  });

  describe("addItem", () => {
    it("should add item and invalidate cache");
    it("should handle errors gracefully");
  });
});
```

## Manual Testing Checklist

### Creation Flow
- [ ] Create distribucion without items (toggle OFF)
- [ ] Create distribucion with items (toggle ON)
- [ ] Create distribucion with multiple items
- [ ] Validation: error if toggle ON but no items

### Item Management
- [ ] Add item to existing distribucion
- [ ] Update item quantity
- [ ] Remove item from distribucion
- [ ] Attempt to modify closed distribucion (should fail)

### Sync & Offline
- [ ] Create with items offline - syncs when online
- [ ] Add item offline - syncs when online
- [ ] Update item offline - syncs when online

### UI/UX
- [ ] Item selector filters already-added variants
- [ ] Summary calculates totals correctly
- [ ] Mobile layout works
- [ ] Loading states show correctly

## Integration Tests

### End-to-End Scenario
```typescript
test("Complete distribucion lifecycle with items", async () => {
  // 1. Create distribucion with items
  // 2. Verify items created
  // 3. Update item quantity
  // 4. Add another item
  // 5. Close distribucion
  // 6. Verify items are read-only
});
```

## Performance Tests

- [ ] Create distribucion with 20+ items (should be fast)
- [ ] Query distribucion with items (should use single query)
- [ ] Check no N+1 queries in item fetching

## Verification Summary

| Component | Unit Tests | Integration | E2E |
|-----------|------------|-------------|-----|
| Backend Service | ✅ | ✅ | - |
| Backend API | ✅ | ✅ | - |
| Frontend Service | ✅ | - | - |
| Frontend Hooks | ✅ | ✅ | - |
| UI Components | - | ✅ | ✅ |
| Full Flow | - | - | ✅ |

## Sign-off Criteria

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Manual testing complete
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Bundle size acceptable
