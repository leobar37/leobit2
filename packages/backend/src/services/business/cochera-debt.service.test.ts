import { beforeEach, describe, expect, it, vi } from "vitest";
import { CocheraDebtService } from "./cochera-debt.service";
import { ForbiddenError, ValidationError } from "../../errors";
import { db } from "../../lib/db";

vi.mock("../../lib/db", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

describe("CocheraDebtService", () => {
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
      createPayment: vi.fn(),
      listDebts: vi.fn(),
    };
    const settingsRepo = {
      findByBusinessId: vi.fn(),
    };

    return { sessionRepo, settingsRepo };
  };

  beforeEach(() => {
    transactionMock.mockReset();
    transactionMock.mockImplementation(async (callback) => callback({ tx: true } as never));
  });

  it("lists only cochera debts with summary", async () => {
    const deps = createDeps();
    deps.sessionRepo.listDebts.mockResolvedValue([
      {
        id: "session-1",
        plate: "ABC-123",
        vehicleType: "auto",
        entryAt: new Date("2026-05-08T10:00:00.000Z"),
        exitAt: new Date("2026-05-08T11:00:00.000Z"),
        checkoutAt: new Date("2026-05-08T11:00:00.000Z"),
        totalAmount: "10.00",
        amountPaid: "0.00",
        balanceDue: "10.00",
        paymentMode: "debe_todo",
        responsibleName: "Cliente QA",
        responsiblePhone: "999888777",
        notes: null,
        settlementNotes: null,
      },
    ]);

    const service = new CocheraDebtService(
      deps.sessionRepo as never,
      deps.settingsRepo as never
    );

    const result = await service.listDebts(ctx as never);

    expect(result.items).toHaveLength(1);
    expect(result.summary.totalDebt).toBe("10.00");
    expect(result.summary.totalSessions).toBe(1);
  });

  it("records partial debt payment and keeps pending balance", async () => {
    const fixedDate = new Date("2026-05-08T12:00:00.000Z");
    const deps = createDeps();
    deps.settingsRepo.findByBusinessId.mockResolvedValue({
      acceptedPaymentMethods: ["efectivo", "yape"],
    });
    deps.sessionRepo.findById.mockResolvedValue({
      id: "session-1",
      status: "fuera",
      amountPaid: "0.00",
      balanceDue: "10.00",
    });
    deps.sessionRepo.createPayment.mockResolvedValue({
      id: "payment-1",
      businessId: "biz-1",
      sessionId: "session-1",
      amount: "4.00",
      paymentMethod: "efectivo",
      referenceNumber: null,
      proofImageId: null,
      notes: null,
      collectedBy: "operator-1",
      createdAt: fixedDate,
      updatedAt: fixedDate,
    });
    deps.sessionRepo.update.mockResolvedValue({
      id: "session-1",
      plate: "ABC-123",
      vehicleType: "auto",
      entryAt: fixedDate,
      exitAt: fixedDate,
      checkoutAt: fixedDate,
      amountPaid: "4.00",
      balanceDue: "6.00",
      paymentMode: "a_cuenta",
      createdAt: fixedDate,
      updatedAt: fixedDate,
    });

    const service = new CocheraDebtService(
      deps.sessionRepo as never,
      deps.settingsRepo as never
    );

    const result = await service.createPayment(ctx as never, "session-1", {
      amount: 4,
      paymentMethod: "efectivo",
    });

    expect(deps.sessionRepo.createPayment).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        sessionId: "session-1",
        amount: "4.00",
        paymentMethod: "efectivo",
      }),
      { tx: true }
    );
    expect(deps.sessionRepo.update).toHaveBeenCalledWith(
      ctx,
      "session-1",
      expect.objectContaining({
        amountPaid: "4.00",
        balanceDue: "6.00",
        paymentMode: "a_cuenta",
      }),
      { tx: true }
    );
    expect(result.session.balanceDue).toBe("6.00");
  });

  it("rejects payments outside cochera mode", async () => {
    const deps = createDeps();
    const service = new CocheraDebtService(
      deps.sessionRepo as never,
      deps.settingsRepo as never
    );

    await expect(
      service.createPayment(
        { ...ctx, businessMode: "polleria" } as never,
        "session-1",
        { amount: 1, paymentMethod: "efectivo" }
      )
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects overpayments", async () => {
    const deps = createDeps();
    deps.settingsRepo.findByBusinessId.mockResolvedValue({
      acceptedPaymentMethods: ["efectivo"],
    });
    deps.sessionRepo.findById.mockResolvedValue({
      id: "session-1",
      status: "fuera",
      amountPaid: "0.00",
      balanceDue: "10.00",
    });

    const service = new CocheraDebtService(
      deps.sessionRepo as never,
      deps.settingsRepo as never
    );

    await expect(
      service.createPayment(ctx as never, "session-1", {
        amount: 11,
        paymentMethod: "efectivo",
      })
    ).rejects.toThrow(ValidationError);
  });
});
