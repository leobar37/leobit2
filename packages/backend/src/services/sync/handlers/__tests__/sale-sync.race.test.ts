import { describe, test, expect, beforeEach, vi } from "vitest";
import { SaleSyncHandler } from "../SaleSyncHandler";
import type { SyncOperationInput } from "../../types";
import type { RequestContext } from "../../../../context/request-context";

// Mock repositories
const mockSaleRepo = {
  findById: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  confirmPreOrder: vi.fn(),
  deliverPreOrder: vi.fn(),
  updateWithItems: vi.fn(),
  delete: vi.fn(),
  findByIdWithItems: vi.fn(),
};

const mockPaymentRepo = {
  createInitialPayment: vi.fn(),
};

const mockCtx: RequestContext = {
  businessId: "test-business-id",
  businessUserId: "test-user-id",
  userId: "test-auth-user-id",
  user: { id: "test-auth-user-id" } as any,
};

describe("SaleSyncHandler - Race Conditions", () => {
  let handler: SaleSyncHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new SaleSyncHandler(mockSaleRepo as any, mockPaymentRepo as any);
  });

  test("should detect version conflict on concurrent updates", async () => {
    const saleId = "sale-123";

    // Setup: Server has version 2, client sends update with version 1
    // This simulates the scenario where another device already updated the sale
    mockSaleRepo.findById.mockResolvedValue({
      id: saleId,
      status: "draft",
      saleType: "contado",
      version: 2, // Server is at version 2
      totalAmount: "100.00",
    });

    // Simulate concurrent update with stale version
    const result = await handler.execute(mockCtx, {
      idempotencyKey: "op-1",
      entityType: "sales",
      entityId: saleId,
      operation: "update",
      payload: {
        totalAmount: "150.00",
      },
      localVersion: 1, // Client thinks it's at version 1
      localTimestamp: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Version conflict");
  });

  test("should allow sequential updates with correct version", async () => {
    const saleId = "sale-123";

    // Setup: Server has version 1, client sends update with version 1
    mockSaleRepo.findById.mockResolvedValue({
      id: saleId,
      status: "draft",
      saleType: "contado",
      version: 1,
      totalAmount: "100.00",
    });

    // First update succeeds
    mockSaleRepo.update.mockResolvedValueOnce({
      id: saleId,
      version: 2,
    });

    const result1 = await handler.execute(mockCtx, {
      idempotencyKey: "op-1",
      entityType: "sales",
      entityId: saleId,
      operation: "update",
      payload: {
        totalAmount: "150.00",
      },
      localVersion: 1,
      localTimestamp: new Date().toISOString(),
    });

    expect(result1.success).toBe(true);

    // Now server has version 2, client sends update with version 2
    mockSaleRepo.findById.mockResolvedValueOnce({
      id: saleId,
      status: "draft",
      saleType: "contado",
      version: 2, // Updated to version 2
      totalAmount: "150.00",
    });

    mockSaleRepo.update.mockResolvedValueOnce({
      id: saleId,
      version: 3,
    });

    const result2 = await handler.execute(mockCtx, {
      idempotencyKey: "op-2",
      entityType: "sales",
      entityId: saleId,
      operation: "update",
      payload: {
        totalAmount: "200.00",
      },
      localVersion: 2, // Client knows it's at version 2
      localTimestamp: new Date().toISOString(),
    });

    expect(result2.success).toBe(true);
  });

  test("should handle version check in updateWithItems", async () => {
    const saleId = "sale-123";

    // Setup: Server has version 2, client sends version 1
    mockSaleRepo.findById.mockResolvedValue({
      id: saleId,
      status: "draft",
      saleType: "contado",
      version: 2, // Server is at version 2
      totalAmount: "100.00",
    });

    // Try to update with items using stale version (1)
    const result = await handler.execute(mockCtx, {
      idempotencyKey: "op-1",
      entityType: "sales",
      entityId: saleId,
      operation: "update",
      payload: {
        items: [
          {
            id: "item-new",
            productId: "product-1",
            productName: "New Product",
            variantId: "variant-1",
            variantName: "New Variant",
            quantity: "2",
            unitPrice: "50.00",
            subtotal: "100.00",
          },
        ],
      },
      localVersion: 1, // Stale version - server is at 2
      localTimestamp: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Version conflict");
  });
});
