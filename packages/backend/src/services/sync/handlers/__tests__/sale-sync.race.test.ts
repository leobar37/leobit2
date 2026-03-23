import { describe, test, expect, beforeEach } from "bun:test";
import { SaleSyncHandler } from "../SaleSyncHandler";
import { SaleRepository } from "../../../repository/sale.repository";
import { PaymentRepository } from "../../../repository/payment.repository";
import { db } from "../../../../lib/db";
import { sales, saleItems, businesses, businessUsers, user } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import type { RequestContext } from "../../../../context/request-context";

describe("SaleSyncHandler - Race Conditions", () => {
  let handler: SaleSyncHandler;
  let saleRepo: SaleRepository;
  let paymentRepo: PaymentRepository;
  let ctx: RequestContext;
  let businessId: string;
  let userId: string;
  let businessUserId: string;

  beforeEach(async () => {
    // Clean up test data
    await db.delete(saleItems);
    await db.delete(sales);

    // Create test business and user
    businessId = crypto.randomUUID();
    userId = crypto.randomUUID();
    businessUserId = crypto.randomUUID();

    await db.insert(businesses).values({
      id: businessId,
      name: "Test Business",
      ruc: "12345678901",
      address: "Test Address",
      phone: "123456789",
      email: "test@test.com",
    });

    await db.insert(user).values({
      id: userId,
      email: "test@example.com",
      name: "Test User",
      emailVerified: true,
    });

    await db.insert(businessUsers).values({
      id: businessUserId,
      businessId,
      userId,
      role: "admin",
    });

    ctx = {
      businessId,
      userId,
      businessUserId,
      requestId: "test-request",
    };

    saleRepo = new SaleRepository();
    paymentRepo = new PaymentRepository();
    handler = new SaleSyncHandler(saleRepo, paymentRepo);
  });

  test("should detect version conflict on concurrent updates", async () => {
    const saleId = crypto.randomUUID();

    // Create sale
    await handler.execute(ctx, {
      id: crypto.randomUUID(),
      entityId: saleId,
      entityType: "sales",
      operation: "create",
      payload: {
        saleType: "contado",
        totalAmount: "100.00",
        amountPaid: "100.00",
        balanceDue: "0",
        items: [
          {
            productId: crypto.randomUUID(),
            productName: "Test Product",
            variantId: crypto.randomUUID(),
            variantName: "Test Variant",
            quantity: "1",
            unitPrice: "100.00",
            subtotal: "100.00",
          },
        ],
      },
      syncGroupId: null,
      dependencies: [],
      idempotencyKey: crypto.randomUUID(),
      localTimestamp: new Date().toISOString(),
      localVersion: 1,
    });

    // Get created sale
    const sale = await saleRepo.findById(ctx, saleId);
    expect(sale).toBeDefined();
    expect(sale?.version).toBe(1);

    // Simulate two concurrent updates with same base version
    const update1 = handler.execute(ctx, {
      id: crypto.randomUUID(),
      entityId: saleId,
      entityType: "sales",
      operation: "update",
      payload: {
        customerId: "customer-1",
      },
      syncGroupId: null,
      dependencies: [],
      idempotencyKey: crypto.randomUUID(),
      localTimestamp: new Date().toISOString(),
      localVersion: 1,
    });

    const update2 = handler.execute(ctx, {
      id: crypto.randomUUID(),
      entityId: saleId,
      entityType: "sales",
      operation: "update",
      payload: {
        customerId: "customer-2",
      },
      syncGroupId: null,
      dependencies: [],
      idempotencyKey: crypto.randomUUID(),
      localTimestamp: new Date().toISOString(),
      localVersion: 1,
    });

    const [result1, result2] = await Promise.all([update1, update2]);

    // One should succeed, one should fail with version conflict
    const successCount = [result1, result2].filter(r => r.success).length;
    const errorCount = [result1, result2].filter(r => !r.success).length;

    expect(successCount).toBe(1);
    expect(errorCount).toBe(1);

    // The error should mention version conflict
    const errorResult = [result1, result2].find(r => !r.success);
    expect(errorResult?.error).toContain("Version conflict");
  });

  test("should allow sequential updates with correct version", async () => {
    const saleId = crypto.randomUUID();

    // Create sale
    await handler.execute(ctx, {
      id: crypto.randomUUID(),
      entityId: saleId,
      entityType: "sales",
      operation: "create",
      payload: {
        saleType: "contado",
        totalAmount: "100.00",
        amountPaid: "100.00",
        balanceDue: "0",
        items: [
          {
            productId: crypto.randomUUID(),
            productName: "Test Product",
            variantId: crypto.randomUUID(),
            variantName: "Test Variant",
            quantity: "1",
            unitPrice: "100.00",
            subtotal: "100.00",
          },
        ],
      },
      syncGroupId: null,
      dependencies: [],
      idempotencyKey: crypto.randomUUID(),
      localTimestamp: new Date().toISOString(),
      localVersion: 1,
    });

    // First update with version 1
    const result1 = await handler.execute(ctx, {
      id: crypto.randomUUID(),
      entityId: saleId,
      entityType: "sales",
      operation: "update",
      payload: {
        customerId: "customer-1",
      },
      syncGroupId: null,
      dependencies: [],
      idempotencyKey: crypto.randomUUID(),
      localTimestamp: new Date().toISOString(),
      localVersion: 1,
    });

    expect(result1.success).toBe(true);

    // Get updated sale (should be version 2)
    const saleAfterUpdate1 = await saleRepo.findById(ctx, saleId);
    expect(saleAfterUpdate1?.version).toBe(2);

    // Second update with version 2
    const result2 = await handler.execute(ctx, {
      id: crypto.randomUUID(),
      entityId: saleId,
      entityType: "sales",
      operation: "update",
      payload: {
        customerId: "customer-2",
      },
      syncGroupId: null,
      dependencies: [],
      idempotencyKey: crypto.randomUUID(),
      localTimestamp: new Date().toISOString(),
      localVersion: 2,
    });

    expect(result2.success).toBe(true);

    // Final version should be 3
    const saleAfterUpdate2 = await saleRepo.findById(ctx, saleId);
    expect(saleAfterUpdate2?.version).toBe(3);
  });

  test("should handle version check in updateWithItems", async () => {
    const saleId = crypto.randomUUID();

    // Create sale
    await handler.execute(ctx, {
      id: crypto.randomUUID(),
      entityId: saleId,
      entityType: "sales",
      operation: "create",
      payload: {
        saleType: "contado",
        totalAmount: "100.00",
        amountPaid: "100.00",
        balanceDue: "0",
        items: [
          {
            id: crypto.randomUUID(),
            productId: crypto.randomUUID(),
            productName: "Test Product",
            variantId: crypto.randomUUID(),
            variantName: "Test Variant",
            quantity: "1",
            unitPrice: "100.00",
            subtotal: "100.00",
          },
        ],
      },
      syncGroupId: null,
      dependencies: [],
      idempotencyKey: crypto.randomUUID(),
      localTimestamp: new Date().toISOString(),
      localVersion: 1,
    });

    // Try to update with items using wrong version
    const result = await handler.execute(ctx, {
      id: crypto.randomUUID(),
      entityId: saleId,
      entityType: "sales",
      operation: "update",
      payload: {
        items: [
          {
            id: crypto.randomUUID(),
            productId: crypto.randomUUID(),
            productName: "New Product",
            variantId: crypto.randomUUID(),
            variantName: "New Variant",
            quantity: "2",
            unitPrice: "50.00",
            subtotal: "100.00",
          },
        ],
      },
      syncGroupId: null,
      dependencies: [],
      idempotencyKey: crypto.randomUUID(),
      localTimestamp: new Date().toISOString(),
      localVersion: 999, // Wrong version
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Version conflict");
  });
});
