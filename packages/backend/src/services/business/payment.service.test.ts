import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentService } from "./payment.service";
import { db } from "../../lib/db";
import { ValidationError } from "../../errors";

vi.mock("../../lib/db", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

describe("PaymentService", () => {
  const transactionMock = db.transaction as ReturnType<typeof vi.fn>;
  const ctx = {
    hasPermission: vi.fn().mockReturnValue(true),
    businessId: "biz-1",
    businessUserId: "seller-1",
  };

  beforeEach(() => {
    transactionMock.mockReset();
    ctx.hasPermission.mockReturnValue(true);
  });

  it("allows sale-linked payments for credit sales with no initial payment", async () => {
    const tx = {
      execute: vi.fn().mockResolvedValue([]),
    };
    transactionMock.mockImplementation(async (callback) => callback(tx as never));

    const repository = {
      getTotalBySale: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({
        id: "payment-1",
        customerId: "customer-1",
        relatedSaleId: "sale-1",
        amount: "25",
      }),
    };
    const saleRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "sale-1",
        customerId: "customer-1",
        totalAmount: "100.00",
        amountPaid: "0.00",
      }),
    };

    const service = new PaymentService(
      repository as never,
      {} as never,
      saleRepository as never
    );

    const result = await service.createPayment(ctx as never, {
      customerId: "customer-1",
      relatedSaleId: "sale-1",
      amount: 25,
      paymentMethod: "efectivo",
    });

    expect(repository.getTotalBySale).toHaveBeenCalledWith(ctx, "sale-1");
    expect(repository.create).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        customerId: "customer-1",
        relatedSaleId: "sale-1",
        amount: "25",
      }),
      tx
    );
  });

  it("rejects sale-linked overpayments against the remaining sale debt", async () => {
    const repository = {
      getTotalBySale: vi.fn().mockResolvedValue(80),
      create: vi.fn(),
    };
    const saleRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "sale-1",
        customerId: "customer-1",
        totalAmount: "100.00",
        amountPaid: "0.00",
      }),
    };

    const service = new PaymentService(
      repository as never,
      {} as never,
      saleRepository as never
    );

    await expect(
      service.createPayment(ctx as never, {
        customerId: "customer-1",
        relatedSaleId: "sale-1",
        amount: 25,
        paymentMethod: "efectivo",
      })
    ).rejects.toThrow(ValidationError);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("uses the initial sale payment when linked payment records are missing", async () => {
    const repository = {
      getTotalBySale: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
    };
    const saleRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "sale-1",
        customerId: "customer-1",
        totalAmount: "100.00",
        amountPaid: "40.00",
      }),
    };

    const service = new PaymentService(
      repository as never,
      {} as never,
      saleRepository as never
    );

    await expect(
      service.createPayment(ctx as never, {
        customerId: "customer-1",
        relatedSaleId: "sale-1",
        amount: 70,
        paymentMethod: "efectivo",
      })
    ).rejects.toThrow(ValidationError);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("does not double count the initial sale payment when it also has a linked payment record", async () => {
    const tx = {
      execute: vi.fn().mockResolvedValue([]),
    };
    transactionMock.mockImplementation(async (callback) => callback(tx as never));

    const repository = {
      getTotalBySale: vi.fn().mockResolvedValue(40),
      create: vi.fn().mockResolvedValue({
        id: "payment-2",
        customerId: "customer-1",
        relatedSaleId: "sale-1",
        amount: "60",
      }),
    };
    const saleRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "sale-1",
        customerId: "customer-1",
        totalAmount: "100.00",
        amountPaid: "40.00",
      }),
    };

    const service = new PaymentService(
      repository as never,
      {} as never,
      saleRepository as never
    );

    const result = await service.createPayment(ctx as never, {
      customerId: "customer-1",
      relatedSaleId: "sale-1",
      amount: 60,
      paymentMethod: "efectivo",
    });

    expect(repository.create).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        customerId: "customer-1",
        relatedSaleId: "sale-1",
        amount: "60",
      }),
      tx
    );
  });

  it("rejects a second linked payment when the sale is already fully paid", async () => {
    const repository = {
      getTotalBySale: vi.fn().mockResolvedValue(100),
      create: vi.fn(),
    };
    const saleRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "sale-1",
        customerId: "customer-1",
        totalAmount: "100.00",
        amountPaid: "40.00",
      }),
    };

    const service = new PaymentService(
      repository as never,
      {} as never,
      saleRepository as never
    );

    await expect(
      service.createPayment(ctx as never, {
        customerId: "customer-1",
        relatedSaleId: "sale-1",
        amount: 1,
        paymentMethod: "efectivo",
      })
    ).rejects.toThrow(ValidationError);

    expect(repository.create).not.toHaveBeenCalled();
  });
});
