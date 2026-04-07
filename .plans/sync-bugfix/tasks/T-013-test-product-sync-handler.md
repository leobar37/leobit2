# T-013: Test ProductSyncHandler

**Requirement**: FR-008

## Action

Create `packages/backend/src/services/sync/handlers/__tests__/product-sync.test.ts`.

Follow the same pattern as T-012 but for products.

### Key test cases

```typescript
describe("ProductSyncHandler", () => {
  describe("create", () => {
    it("should create product with type and unit", async () => {
      const operation = createSyncOperation({
        entityType: "products",
        operation: "create",
        payload: {
          name: "Pollo entero",
          type: "pollo",
          unit: "kg",
          basePrice: "12.50",
        },
      });
      const result = await handler.handleOperation(ctx, operation);
      expect(result.success).toBe(true);
    });

    it("should reject product with invalid type", async () => {
      const operation = createSyncOperation({
        payload: { name: "Bad", type: "invalid_type" },
      });
      await expect(handler.handleOperation(ctx, operation)).rejects.toThrow();
    });
  });

  describe("variants", () => {
    it("should create variant linked to product", async () => {
      // First create product
      const productOp = createSyncOperation({ entityType: "products", entityId: "prod-1" });
      await handler.handleOperation(ctx, productOp);

      // Then create variant
      const variantOp = createSyncOperation({
        entityType: "product_variants",
        operation: "create",
        entityId: "var-1",
        payload: {
          productId: "prod-1",
          name: "Grande",
          price: "25.00",
        },
        syncGroupId: "group-1",  // same group
      });

      const result = await handler.handleOperation(ctx, variantOp);
      expect(result.success).toBe(true);
    });
  });
});
```

## Files Modified
- `packages/backend/src/services/sync/handlers/__tests__/product-sync.test.ts` (create)

## Verification

Run: `cd packages/backend && bun test src/services/sync/handlers/__tests__/product-sync.test.ts --run`

## Dependencies

None — can run in parallel with T-012.
