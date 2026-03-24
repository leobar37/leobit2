import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHook, type SyncHookContext, type SyncOperation } from "./create-sync-hook";

// Mock PGlite
const mockPg = {
  query: vi.fn(),
} as unknown as PGlite;

describe("createHook", () => {
  describe("builder API", () => {
    it("should create a hook with entity type", () => {
      const hook = createHook("sales").build();

      expect(hook.entityType).toBe("sales");
    });

    it("should allow adding onBeforeSync condition", async () => {
      const mockCondition = vi.fn().mockResolvedValue({ allow: true });

      const hook = createHook("sales")
        .onBeforeSync(mockCondition)
        .build();

      const context: SyncHookContext = {
        operation: "create" as SyncOperation,
        entityId: "test-id",
        data: { name: "test" },
      };

      const result = await hook.condition(context, {
        pg: mockPg,
        businessId: "biz-1",
      });

      expect(mockCondition).toHaveBeenCalledWith(context, {
        pg: mockPg,
        businessId: "biz-1",
      });
      expect(result).toEqual({ allow: true });
    });

    it("should return allow: true by default when no condition is set", async () => {
      const hook = createHook("sales").build();

      const context: SyncHookContext = {
        operation: "create" as SyncOperation,
        entityId: "test-id",
        data: {},
      };

      const result = await hook.condition(context, {
        pg: mockPg,
        businessId: "biz-1",
      });

      expect(result).toEqual({ allow: true });
    });

    it("should support chaining multiple conditions", async () => {
      const condition1 = vi.fn().mockResolvedValue({ allow: true });
      const condition2 = vi.fn().mockResolvedValue({ allow: false, reason: "Blocked by condition 2" });

      const hook = createHook("sales")
        .onBeforeSync(condition1)
        .onBeforeSync(condition2)
        .build();

      const context: SyncHookContext = {
        operation: "create" as SyncOperation,
        entityId: "test-id",
        data: {},
      };

      const result = await hook.condition(context, {
        pg: mockPg,
        businessId: "biz-1",
      });

      // Only the last condition is stored
      expect(condition2).toHaveBeenCalled();
      expect(result).toEqual({ allow: false, reason: "Blocked by condition 2" });
    });
  });

  describe("condition logic", () => {
    it("should allow sync when condition returns allow: true", async () => {
      const hook = createHook("sales")
        .onBeforeSync(async () => ({ allow: true }))
        .build();

      const context: SyncHookContext = {
        operation: "create" as SyncOperation,
        entityId: "sale-1",
        data: { customerId: "cust-1" },
      };

      const result = await hook.condition(context, {
        pg: mockPg,
        businessId: "biz-1",
      });

      expect(result.allow).toBe(true);
    });

    it("should block sync when condition returns allow: false", async () => {
      const hook = createHook("sales")
        .onBeforeSync(async () => ({ allow: false, reason: "Test reason" }))
        .build();

      const context: SyncHookContext = {
        operation: "create" as SyncOperation,
        entityId: "sale-1",
        data: {},
      };

      const result = await hook.condition(context, {
        pg: mockPg,
        businessId: "biz-1",
      });

      expect(result.allow).toBe(false);
      expect(result.reason).toBe("Test reason");
    });

    it("should have access to operation type in context", async () => {
      let capturedOperation: SyncOperation | undefined;

      const hook = createHook("sales")
        .onBeforeSync(async (ctx) => {
          capturedOperation = ctx.operation;
          return { allow: true };
        })
        .build();

      const context: SyncHookContext = {
        operation: "update" as SyncOperation,
        entityId: "sale-1",
        data: {},
      };

      await hook.condition(context, {
        pg: mockPg,
        businessId: "biz-1",
      });

      expect(capturedOperation).toBe("update");
    });

    it("should have access to entityId in context", async () => {
      let capturedEntityId: string | undefined;

      const hook = createHook("sales")
        .onBeforeSync(async (ctx) => {
          capturedEntityId = ctx.entityId;
          return { allow: true };
        })
        .build();

      const context: SyncHookContext = {
        operation: "delete" as SyncOperation,
        entityId: "sale-123",
        data: {},
      };

      await hook.condition(context, {
        pg: mockPg,
        businessId: "biz-1",
      });

      expect(capturedEntityId).toBe("sale-123");
    });

    it("should have access to data payload in context", async () => {
      let capturedData: Record<string, unknown> | undefined;

      const hook = createHook("sales")
        .onBeforeSync(async (ctx) => {
          capturedData = ctx.data;
          return { allow: true };
        })
        .build();

      const testData = { customerId: "cust-1", totalAmount: 100 };
      const context: SyncHookContext = {
        operation: "create" as SyncOperation,
        entityId: "sale-1",
        data: testData,
      };

      await hook.condition(context, {
        pg: mockPg,
        businessId: "biz-1",
      });

      expect(capturedData).toEqual(testData);
    });

    it("should support sync options (pg and businessId)", async () => {
      let capturedOptions: { pg: PGlite; businessId: string } | undefined;

      const hook = createHook("sales")
        .onBeforeSync(async (_ctx, options) => {
          capturedOptions = options;
          return { allow: true };
        })
        .build();

      const context: SyncHookContext = {
        operation: "create" as SyncOperation,
        entityId: "sale-1",
        data: {},
      };

      await hook.condition(context, {
        pg: mockPg,
        businessId: "business-xyz",
      });

      expect(capturedOptions?.pg).toBe(mockPg);
      expect(capturedOptions?.businessId).toBe("business-xyz");
    });
  });

  describe("edge cases", () => {
    it("should handle sync condition that throws error gracefully", async () => {
      // Note: Error handling should be done by the registry when calling hooks
      // This test documents current behavior - errors propagate
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const hook = createHook("sales")
        .onBeforeSync(async () => {
          throw new Error("Test error");
        })
        .build();

      const context: SyncHookContext = {
        operation: "create" as SyncOperation,
        entityId: "sale-1",
        data: {},
      };

      // Currently errors propagate - the registry should handle this
      await expect(
        hook.condition(context, {
          pg: mockPg,
          businessId: "biz-1",
        })
      ).rejects.toThrow("Test error");

      consoleSpy.mockRestore();
    });

    it("should work with different entity types", () => {
      const customerHook = createHook("customers").build();
      const productHook = createHook("products").build();
      const paymentHook = createHook("abonos").build();

      expect(customerHook.entityType).toBe("customers");
      expect(productHook.entityType).toBe("products");
      expect(paymentHook.entityType).toBe("abonos");
    });
  });
});
