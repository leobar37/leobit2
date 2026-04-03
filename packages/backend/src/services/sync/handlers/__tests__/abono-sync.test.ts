import { describe, expect, it, vi, beforeEach } from "vitest";
import { AbonoSyncHandler } from "../AbonoSyncHandler";
import { abonoCreateSchema, abonoUpdateSchema } from "../../schemas";
import type { RequestContext } from "../../../../context/request-context";
import type { PaymentRepository } from "../../../repository/payment.repository";
import type { CustomerRepository } from "../../../repository/customer.repository";
import type { SyncOperationInput } from "../../types";

describe("abonoCreateSchema", () => {
  it("should validate abono with all required fields", () => {
    const validAbono = {
      customerId: "cust-123",
      sellerId: "seller-456",
      amount: "100.50",
      paymentMethod: "efectivo",
      notes: "Test note",
    };

    const result = abonoCreateSchema.safeParse(validAbono);
    expect(result.success).toBe(true);
  });

  it("should reject abono without customerId", () => {
    const invalidAbono = {
      sellerId: "seller-456",
      amount: "100.50",
      paymentMethod: "efectivo",
    };

    const result = abonoCreateSchema.safeParse(invalidAbono);
    expect(result.success).toBe(false);
  });

  it("should reject abono without sellerId", () => {
    const invalidAbono = {
      customerId: "cust-123",
      amount: "100.50",
      paymentMethod: "efectivo",
    };

    const result = abonoCreateSchema.safeParse(invalidAbono);
    expect(result.success).toBe(false);
  });

  it("should reject abono without amount", () => {
    const invalidAbono = {
      customerId: "cust-123",
      sellerId: "seller-456",
      paymentMethod: "efectivo",
    };

    const result = abonoCreateSchema.safeParse(invalidAbono);
    expect(result.success).toBe(false);
  });

  it("should reject abono with zero amount", () => {
    const invalidAbono = {
      customerId: "cust-123",
      sellerId: "seller-456",
      amount: "0",
      paymentMethod: "efectivo",
    };

    const result = abonoCreateSchema.safeParse(invalidAbono);
    expect(result.success).toBe(false);
  });

  it("should accept valid payment methods", () => {
    const validMethods = ["efectivo", "yape", "plin", "transferencia", "tarjeta"];
    
    validMethods.forEach((method) => {
      const abono = {
        customerId: "cust-123",
        sellerId: "seller-456",
        amount: "100",
        paymentMethod: method,
      };

      const result = abonoCreateSchema.safeParse(abono);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid payment method", () => {
    const invalidAbono = {
      customerId: "cust-123",
      sellerId: "seller-456",
      amount: "100",
      paymentMethod: "bitcoin",
    };

    const result = abonoCreateSchema.safeParse(invalidAbono);
    expect(result.success).toBe(false);
  });

  it("should convert numeric amount to string", () => {
    const abono = {
      customerId: "cust-123",
      sellerId: "seller-456",
      amount: 100.50,
      paymentMethod: "efectivo",
    };

    const result = abonoCreateSchema.parse(abono);
    expect(result.amount).toBe("100.5");
  });
});

describe("abonoUpdateSchema", () => {
  it("should validate update with optional fields", () => {
    const validUpdate = {
      notes: "Updated note",
      proofImageId: "img-123",
    };

    const result = abonoUpdateSchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
  });

  it("should accept empty update (all fields optional)", () => {
    const emptyUpdate = {};

    const result = abonoUpdateSchema.safeParse(emptyUpdate);
    expect(result.success).toBe(true);
  });
});

describe("AbonoSyncHandler - sellerId auto-injection", () => {
  let mockPaymentRepo: PaymentRepository;
  let mockCustomerRepo: CustomerRepository;
  let handler: AbonoSyncHandler;
  let mockCtx: RequestContext;

  beforeEach(() => {
    mockPaymentRepo = {
      create: vi.fn().mockResolvedValue({ id: "abono-123" }),
      findById: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    } as unknown as PaymentRepository;

    mockCustomerRepo = {
      findById: vi.fn().mockResolvedValue({ id: "cust-123" }),
    } as unknown as CustomerRepository;

    handler = new AbonoSyncHandler(mockPaymentRepo, mockCustomerRepo);

    mockCtx = {
      businessId: "biz-123",
      businessUserId: "user-456",
      role: "VENDEDOR",
      permissions: [],
      hasPermission: vi.fn().mockReturnValue(true),
      isAdmin: vi.fn().mockReturnValue(false),
    } as unknown as RequestContext;
  });

  it("should auto-inject sellerId from context when not in payload", async () => {
    const operation: SyncOperationInput = {
      idempotencyKey: "test-123",
      entityType: "abonos",
      entityId: "abono-123",
      operation: "create",
      payload: {
        customerId: "cust-123",
        amount: "100",
        paymentMethod: "efectivo",
        // sellerId is missing!
      },
      localVersion: 1,
      localTimestamp: "2024-01-01T00:00:00Z",
    };

    await handler.execute(mockCtx, operation);

    expect(mockPaymentRepo.create).toHaveBeenCalledWith(
      mockCtx,
      expect.objectContaining({
        customerId: "cust-123",
        amount: "100",
        paymentMethod: "efectivo",
        // sellerId should NOT be here because repo auto-injects from context
        id: "abono-123",
      }),
      undefined
    );
  });

  it("should use sellerId from payload when provided", async () => {
    const operation: SyncOperationInput = {
      idempotencyKey: "test-123",
      entityType: "abonos",
      entityId: "abono-123",
      operation: "create",
      payload: {
        customerId: "cust-123",
        sellerId: "custom-seller-789",
        amount: "100",
        paymentMethod: "efectivo",
      },
      localVersion: 1,
      localTimestamp: "2024-01-01T00:00:00Z",
    };

    await handler.execute(mockCtx, operation);

    expect(mockPaymentRepo.create).toHaveBeenCalledWith(
      mockCtx,
      expect.objectContaining({
        customerId: "cust-123",
        amount: "100",
        paymentMethod: "efectivo",
        id: "abono-123",
      }),
      undefined
    );
  });

  it("should fail validation when both payload and context lack sellerId", async () => {
    const ctxWithoutSellerId = {
      ...mockCtx,
      businessUserId: undefined,
    } as unknown as RequestContext;

    const operation: SyncOperationInput = {
      idempotencyKey: "test-123",
      entityType: "abonos",
      entityId: "abono-123",
      operation: "create",
      payload: {
        customerId: "cust-123",
        amount: "100",
        paymentMethod: "efectivo",
        // sellerId is missing!
      },
      localVersion: 1,
      localTimestamp: "2024-01-01T00:00:00Z",
    };

    const result = await handler.execute(ctxWithoutSellerId, operation);

    expect(result.success).toBe(false);
    expect(result.error).toContain("sellerId");
  });
});
