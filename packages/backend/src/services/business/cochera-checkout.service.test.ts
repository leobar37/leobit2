import { beforeEach, describe, expect, it, vi } from "vitest";
import { CocheraCheckoutService } from "./cochera-checkout.service";
import { ForbiddenError, ValidationError } from "../../errors";
import { db } from "../../lib/db";

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

    return { sessionRepo, settingsRepo, subscriptionService };
  };

  beforeEach(() => {
    vi.useRealTimers();
    transactionMock.mockReset();
    transactionMock.mockImplementation(async (callback) => callback({ tx: true } as never));
  });

  it("applies grace period before billing starts", () => {
    const service = new CocheraCheckoutService({} as never, {} as never, {} as never);

    const result = service.calculateCheckout(
      new Date("2026-05-07T10:00:00.000Z"),
      new Date("2026-05-07T10:09:59.000Z"),
      "5.00",
      10
    );

    expect(result.durationMinutes).toBe(9);
    expect(result.billableMinutes).toBe(0);
    expect(result.billableHours).toBe(0);
    expect(result.totalAmount).toBe("0.00");
  });

  it("rounds billable time up to the next hour", () => {
    const service = new CocheraCheckoutService({} as never, {} as never, {} as never);

    const result = service.calculateCheckout(
      new Date("2026-05-07T10:00:00.000Z"),
      new Date("2026-05-07T11:01:00.000Z"),
      "5.00",
      0
    );

    expect(result.billableHours).toBe(2);
    expect(result.totalAmount).toBe("10.00");
  });

  it("does not allow discounts to make checkout total negative", () => {
    const service = new CocheraCheckoutService({} as never, {} as never, {} as never);

    const result = service.calculateCheckout(
      new Date("2026-05-07T10:00:00.000Z"),
      new Date("2026-05-07T11:00:00.000Z"),
      "5.00",
      0,
      20
    );

    expect(result.discountAmount).toBe("20.00");
    expect(result.totalAmount).toBe("0.00");
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
      deps.subscriptionService as never
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
      deps.subscriptionService as never
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
    const fixedDate = new Date("2026-05-07T12:30:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(fixedDate);

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
      entryAt: new Date("2026-05-07T10:00:00.000Z"),
    });
    deps.sessionRepo.update.mockImplementation(async (_ctx, _id, data) => ({
      id: "session-1",
      plate: "ABC-123",
      vehicleType: "auto",
      entryAt: new Date("2026-05-07T10:00:00.000Z"),
      exitAt: data.exitAt ?? fixedDate,
      checkoutAt: data.checkoutAt ?? fixedDate,
      checkoutBy: "operator-1",
      totalAmount: data.totalAmount ?? "15.00",
      discountAmount: data.discountAmount ?? "0.00",
      paymentMethod: data.paymentMethod ?? "plin",
      businessId: "biz-1",
      notes: null,
      status: data.status ?? "fuera",
      createdAt: fixedDate,
      updatedAt: fixedDate,
    }));

    const service = new CocheraCheckoutService(
      deps.sessionRepo as never,
      deps.settingsRepo as never,
      deps.subscriptionService as never
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
      }),
      { tx: true }
    );
    expect(result.totalAmount).toBe("15.00");
  });
});
