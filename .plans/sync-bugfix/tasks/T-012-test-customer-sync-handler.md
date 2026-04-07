# T-012: Test CustomerSyncHandler

**Requirement**: FR-008

## Action

Create `packages/backend/src/services/sync/handlers/__tests__/customer-sync.test.ts`:

## Test Structure

Follow the pattern from `packages/backend/src/services/sync/handlers/__tests__/abono-sync.test.ts`:

### Tests to include

```typescript
describe("CustomerSyncHandler", () => {
  describe("create", () => {
    it("should create customer with required fields", async () => {
      // Arrange
      const ctx = createMockContext(businessId);
      const handler = new CustomerSyncHandler();

      const operation = createSyncOperation({
        entityType: "customers",
        operation: "create",
        entityId: "cust-new",
        payload: { name: "Juan Pérez", phone: "999-111-222" },
        localVersion: 1,
      });

      // Act
      const result = await handler.handleOperation(ctx, operation);

      // Assert
      expect(result.success).toBe(true);
      const customer = await ctx.db.select().from(customers).where(eq(customers.id, "cust-new"));
      expect(customer.name).toBe("Juan Pérez");
    });

    it("should reject customer without name", async () => {
      // Arrange — name is required
      const operation = createSyncOperation({
        payload: { phone: "999-111-222" }, // missing name
      });

      // Act & Assert
      await expect(handler.handleOperation(ctx, operation)).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("should update existing customer", async () => {
      // Pre-condition: customer exists
      await createTestCustomer(ctx, "cust-1", { name: "Original" });

      const operation = createSyncOperation({
        entityType: "customers",
        operation: "update",
        entityId: "cust-1",
        payload: { name: "Updated" },
        localVersion: 2,
      });

      const result = await handler.handleOperation(ctx, operation);
      expect(result.success).toBe(true);

      const customer = await ctx.db.select().from(customers).where(eq(customers.id, "cust-1"));
      expect(customer.name).toBe("Updated");
    });

    it("should convert update to insert if customer not found (self-heal)", async () => {
      const operation = createSyncOperation({
        operation: "update",
        entityId: "nonexistent",
        payload: { name: "Self-healed" },
      });

      // Should succeed by converting to create
      const result = await handler.handleOperation(ctx, operation);
      expect(result.success).toBe(true);
    });
  });

  describe("delete", () => {
    it("should delete existing customer", async () => {
      await createTestCustomer(ctx, "cust-to-delete");

      const operation = createSyncOperation({
        entityType: "customers",
        operation: "delete",
        entityId: "cust-to-delete",
      });

      const result = await handler.handleOperation(ctx, operation);
      expect(result.success).toBe(true);

      const customer = await ctx.db.select().from(customers).where(eq(customers.id, "cust-to-delete"));
      expect(customer).toBeUndefined();
    });
  });

  describe("conflict resolution", () => {
    it("should detect version conflict on update", async () => {
      // Server version is 3, client sends 1
      const operation = createSyncOperation({
        operation: "update",
        entityId: "cust-1",
        payload: { name: "Client version" },
        localVersion: 1,  // stale
      });

      // Pre-condition: server has version 3
      await updateTestCustomerVersion(ctx, "cust-1", 3);

      const result = await handler.handleOperation(ctx, operation);
      expect(result.conflict).toBeDefined();
      expect(result.conflict?.serverVersion).toBe(3);
    });
  });
});
```

## Files Modified
- `packages/backend/src/services/sync/handlers/__tests__/customer-sync.test.ts` (create)

## Verification

Run: `cd packages/backend && bun test src/services/sync/handlers/__tests__/customer-sync.test.ts --run`

## Dependencies

None — can run in parallel with T-013.
