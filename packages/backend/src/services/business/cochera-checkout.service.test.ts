import { beforeEach, describe, expect, it, vi } from "vitest";
import { CocheraCheckoutService } from "./cochera-checkout.service";
import { ForbiddenError, ValidationError } from "../../errors";
import { db } from "../../lib/db";
import { createCocheraPricingSnapshot } from "@avileo/shared";

vi.mock("../../lib/db", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

describe("CocheraCheckoutService", () => {
  const transactionMock = db.transaction as ReturnType<typeof vi.fn>;
  const ctx = {
    businessId: "biz-1",
    businessUserId: "operator-1",
    businessMode: "cochera",
  };

  const createDeps = () => {
    const sessionRepo = {
      findById: vi.fn(),
      update: vi.fn(),
    };
    const settingsRepo = {
      findByBusinessId: vi.fn(),
    };
    const subscriptionService = {
      checkAndRecordUsage: vi.fn(),
    };
    const customerRepo = {
      findById: vi.fn().mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
        name: "Cliente Demo",
        phone: "999999999",
      }),
    };
    const customerVehicleRepo = {
      findById: vi.fn(),
      findActiveByPlate: vi.fn().mockResolvedValue(undefined),
      create: vi.fn(),
    };

    return { sessionRepo, settingsRepo, subscriptionService, customerRepo, customerVehicleRepo };
  };

  beforeEach(() => {
    vi.useRealTimers();
    transactionMock.mockReset();
    transactionMock.mockImplementation(async (callback) => callback({ tx: true } as never));
  });

  it("applies grace period before billing starts", () => {
    const service = new CocheraCheckoutService({} as never, {} as never, {} as never, {} as never, {} as never);

    const result = service.calculateCheckout(
      new Date("2026-05-07T10:00:00.000Z"),
      new Date("2026-05-07T10:09:59.000Z"),
      createCocheraPricingSnapshot({ hourlyRate: "5.00", graceMinutes: 10 })
    );

    expect(result.durationMinutes).toBe(9);
    expect(result.billableMinutes).toBe(0);
    expect(result.billableHours).toBe(0);
    expect(result.totalAmount).toBe("0.00");
  });

  it("rounds billable time up to the next hour", () => {
    const service = new CocheraCheckoutService({} as never, {} as never, {} as never, {} as never, {} as never);

    const result = service.calculateCheckout(
      new Date("2026-05-07T10:00:00.000Z"),
      new Date("2026-05-07T11:01:00.000Z"),
      createCocheraPricingSnapshot({ hourlyRate: "5.00", graceMinutes: 0 })
    );

    expect(result.billableHours).toBe(2);
    expect(result.totalAmount).toBe("10.00");
  });

  it("does not allow discounts to make checkout total negative", () => {
    const service = new CocheraCheckoutService({} as never, {} as never, {} as never, {} as never, {} as never);

    const result = service.calculateCheckout(
      new Date("2026-05-07T10:00:00.000Z"),
      new Date("2026-05-07T11:00:00.000Z"),
      createCocheraPricingSnapshot({ hourlyRate: "5.00", graceMinutes: 0 }),
      0,
      20
    );

    expect(result.discountAmount).toBe("20.00");
    expect(result.totalAmount).toBe("0.00");
  });

  it("calculates base plus extra hours and subtracts entry payment", () => {
    const service = new CocheraCheckoutService({} as never, {} as never, {} as never, {} as never, {} as never);

    const result = service.calculateCheckout(
      new Date("2026-05-07T10:00:00.000Z"),
      new Date("2026-05-07T12:05:00.000Z"),
      createCocheraPricingSnapshot({
        hourlyBillingEnabled: true,
        hourlyBaseRate: "5.00",
        hourlyBaseHours: 1,
        extraHourRate: "1.00",
      }),
      "5.00"
    );

    expect(result.billableHours).toBe(3);
    expect(result.extraHours).toBe(2);
    expect(result.totalAmount).toBe("7.00");
    expect(result.entryAmountPaid).toBe("5.00");
    expect(result.remainingAmount).toBe("2.00");
  });

  it("rejects payment methods not accepted by settings", async () => {
    const deps = createDeps();
    deps.settingsRepo.findByBusinessId.mockResolvedValue({
      hourlyRate: "5.00",
      graceMinutes: 10,
      acceptedPaymentMethods: ["efectivo"],
    });
    deps.sessionRepo.findById.mockResolvedValue({
      id: "session-1",
      status: "dentro",
      entryAt: new Date("2026-05-07T10:00:00.000Z"),
    });

    const service = new CocheraCheckoutService(
      deps.sessionRepo as never,
      deps.settingsRepo as never,
      deps.subscriptionService as never,
      { findById: vi.fn().mockResolvedValue({ id: "customer-1", name: "Cliente Demo", phone: "999999999" }) } as never,
      deps.customerVehicleRepo as never
    );

    await expect(
      service.checkout(ctx as never, "session-1", {
        paymentMethod: "yape",
      })
    ).rejects.toThrow(ValidationError);

    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects checkout outside cochera mode", async () => {
    const deps = createDeps();
    const service = new CocheraCheckoutService(
      deps.sessionRepo as never,
      deps.settingsRepo as never,
      deps.subscriptionService as never,
      { findById: vi.fn().mockResolvedValue({ id: "customer-1", name: "Cliente Demo", phone: "999999999" }) } as never,
      deps.customerVehicleRepo as never
    );

    await expect(
      service.checkout(
        { ...ctx, businessMode: "polleria" } as never,
        "session-1",
        { paymentMethod: "efectivo" }
      )
    ).rejects.toThrow(ForbiddenError);
  });

  it("records subscription usage and closes the session atomically", async () => {
    const fixedDate = new Date();
    const entryAt = new Date(Date.now() - 150 * 60 * 1000);

    const deps = createDeps();
    deps.settingsRepo.findByBusinessId.mockResolvedValue({
      hourlyRate: "5.00",
      graceMinutes: 10,
      acceptedPaymentMethods: ["efectivo", "yape", "plin"],
    });
    deps.sessionRepo.findById.mockResolvedValue({
      id: "session-1",
      plate: "ABC-123",
      vehicleType: "auto",
      status: "dentro",
      entryAt,
    });
    deps.sessionRepo.update.mockImplementation(async (_ctx, _id, data) => ({
      id: "session-1",
      plate: "ABC-123",
      vehicleType: "auto",
      entryAt,
      exitAt: data.exitAt ?? fixedDate,
      checkoutAt: data.checkoutAt ?? fixedDate,
      checkoutBy: "operator-1",
      totalAmount: data.totalAmount ?? "15.00",
      discountAmount: data.discountAmount ?? "0.00",
      amountPaid: data.amountPaid ?? "15.00",
      balanceDue: data.balanceDue ?? "0.00",
      paymentMode: data.paymentMode ?? "pago_total",
      paymentMethod: data.paymentMethod ?? "plin",
      responsibleName: data.responsibleName ?? null,
      responsiblePhone: data.responsiblePhone ?? null,
      businessId: "biz-1",
      notes: null,
      status: data.status ?? "fuera",
      createdAt: fixedDate,
      updatedAt: fixedDate,
    }));

    const service = new CocheraCheckoutService(
      deps.sessionRepo as never,
      deps.settingsRepo as never,
      deps.subscriptionService as never,
      { findById: vi.fn().mockResolvedValue({ id: "customer-1", name: "Cliente Demo", phone: "999999999" }) } as never,
      deps.customerVehicleRepo as never
    );

    const result = await service.checkout(ctx as never, "session-1", {
      paymentMethod: "plin",
    });

    expect(deps.subscriptionService.checkAndRecordUsage).toHaveBeenCalledWith(ctx, { tx: true });
    expect(deps.sessionRepo.update).toHaveBeenCalledWith(
      ctx,
      "session-1",
      expect.objectContaining({
        status: "fuera",
        paymentMethod: "plin",
        amountPaid: "15.00",
        balanceDue: "0.00",
        paymentMode: "pago_total",
      }),
      { tx: true }
    );
    expect(result.totalAmount).toBe("15.00");
    expect(result.amountPaid).toBe("15.00");
    expect(result.balanceDue).toBe("0.00");
  });

  it("closes a session with partial payment and pending balance", async () => {
    const fixedDate = new Date();
    const entryAt = new Date(Date.now() - 150 * 60 * 1000);

    const deps = createDeps();
    deps.settingsRepo.findByBusinessId.mockResolvedValue({
      hourlyRate: "5.00",
      graceMinutes: 10,
      acceptedPaymentMethods: ["efectivo"],
    });
    deps.sessionRepo.findById.mockResolvedValue({
      id: "session-1",
      plate: "ABC-123",
      vehicleType: "auto",
      status: "dentro",
      entryAt,
    });
    deps.sessionRepo.update.mockImplementation(async (_ctx, _id, data) => ({
      id: "session-1",
      plate: "ABC-123",
      vehicleType: "auto",
      entryAt,
      exitAt: data.exitAt ?? fixedDate,
      checkoutAt: data.checkoutAt ?? fixedDate,
      checkoutBy: "operator-1",
      totalAmount: data.totalAmount,
      discountAmount: data.discountAmount,
      amountPaid: data.amountPaid,
      balanceDue: data.balanceDue,
      paymentMode: data.paymentMode,
      paymentMethod: data.paymentMethod,
      responsibleName: data.responsibleName,
      responsiblePhone: data.responsiblePhone,
    }));

    const service = new CocheraCheckoutService(
      deps.sessionRepo as never,
      deps.settingsRepo as never,
      deps.subscriptionService as never,
      { findById: vi.fn().mockResolvedValue({ id: "customer-1", name: "Cliente Demo", phone: "999999999" }) } as never,
      deps.customerVehicleRepo as never
    );

    const result = await service.checkout(ctx as never, "session-1", {
      paymentMode: "a_cuenta",
      amountPaid: 5,
      paymentMethod: "efectivo",
      responsibleCustomerId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result.paymentMode).toBe("a_cuenta");
    expect(result.amountPaid).toBe("5.00");
    expect(result.balanceDue).toBe("10.00");
    expect(result.responsibleName).toBe("Cliente Demo");
  });

  it("closes a session as debt without treating debt as a payment method", async () => {
    const fixedDate = new Date();
    const entryAt = new Date(Date.now() - 150 * 60 * 1000);

    const deps = createDeps();
    deps.settingsRepo.findByBusinessId.mockResolvedValue({
      hourlyRate: "5.00",
      graceMinutes: 10,
      acceptedPaymentMethods: ["efectivo"],
    });
    deps.sessionRepo.findById.mockResolvedValue({
      id: "session-1",
      plate: "ABC-123",
      vehicleType: "auto",
      status: "dentro",
      entryAt,
    });
    deps.sessionRepo.update.mockImplementation(async (_ctx, _id, data) => ({
      id: "session-1",
      plate: "ABC-123",
      vehicleType: "auto",
      entryAt,
      exitAt: data.exitAt ?? fixedDate,
      checkoutAt: data.checkoutAt ?? fixedDate,
      checkoutBy: "operator-1",
      totalAmount: data.totalAmount,
      discountAmount: data.discountAmount,
      amountPaid: data.amountPaid,
      balanceDue: data.balanceDue,
      paymentMode: data.paymentMode,
      paymentMethod: data.paymentMethod,
      responsibleName: data.responsibleName,
      responsiblePhone: data.responsiblePhone,
    }));

    const service = new CocheraCheckoutService(
      deps.sessionRepo as never,
      deps.settingsRepo as never,
      deps.subscriptionService as never,
      { findById: vi.fn().mockResolvedValue({ id: "customer-1", name: "Cliente Demo", phone: "999999999" }) } as never,
      deps.customerVehicleRepo as never
    );

    const result = await service.checkout(ctx as never, "session-1", {
      paymentMode: "debe_todo",
      responsibleCustomerId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result.paymentMode).toBe("debe_todo");
    expect(result.amountPaid).toBe("0.00");
    expect(result.balanceDue).toBe("15.00");
    expect(result.paymentMethod).toBeNull();
  });

  it("rejects partial payment without responsible customer", async () => {
    const deps = createDeps();
    deps.settingsRepo.findByBusinessId.mockResolvedValue({
      hourlyRate: "5.00",
      graceMinutes: 10,
      acceptedPaymentMethods: ["efectivo"],
    });
    deps.sessionRepo.findById.mockResolvedValue({
      id: "session-1",
      status: "dentro",
      entryAt: new Date("2026-05-07T10:00:00.000Z"),
    });

    const service = new CocheraCheckoutService(
      deps.sessionRepo as never,
      deps.settingsRepo as never,
      deps.subscriptionService as never,
      { findById: vi.fn().mockResolvedValue({ id: "customer-1", name: "Cliente Demo", phone: "999999999" }) } as never,
      deps.customerVehicleRepo as never
    );

    await expect(
      service.checkout(ctx as never, "session-1", {
        paymentMode: "a_cuenta",
        amountPaid: 5,
        paymentMethod: "efectivo",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("rejects partial payment with a customer from another business", async () => {
    const deps = createDeps();
    deps.customerRepo.findById.mockResolvedValue(undefined);
    deps.settingsRepo.findByBusinessId.mockResolvedValue({
      hourlyRate: "5.00",
      graceMinutes: 10,
      acceptedPaymentMethods: ["efectivo"],
    });
    deps.sessionRepo.findById.mockResolvedValue({
      id: "session-1",
      status: "dentro",
      entryAt: new Date("2026-05-07T10:00:00.000Z"),
    });

    const service = new CocheraCheckoutService(
      deps.sessionRepo as never,
      deps.settingsRepo as never,
      deps.subscriptionService as never,
      deps.customerRepo as never,
      deps.customerVehicleRepo as never
    );

    await expect(
      service.checkout(ctx as never, "session-1", {
        paymentMode: "a_cuenta",
        amountPaid: 5,
        paymentMethod: "efectivo",
        responsibleCustomerId: "22222222-2222-4222-8222-222222222222",
      })
    ).rejects.toThrow(ValidationError);
  });
});
