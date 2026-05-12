import { beforeEach, describe, expect, it, vi } from "vitest";
import { CocheraSessionService } from "./cochera-session.service";
import { ConflictError, ForbiddenError, ValidationError } from "../../errors";

describe("CocheraSessionService", () => {
  const ctx = {
    businessId: "biz-1",
    businessUserId: "user-1",
    businessMode: "cochera",
  };

  const createRepo = () => ({
    listActive: vi.fn(),
    countActive: vi.fn(),
    findById: vi.fn(),
    findActiveByPlate: vi.fn(),
    create: vi.fn(),
    countEntriesToday: vi.fn(),
    sumIncomeToday: vi.fn(),
    sumIncomeThisMonth: vi.fn(),
    getDailyIncomeLast7Days: vi.fn(),
    getRecentActivity: vi.fn(),
  });
  const createSettingsRepo = () => ({
    getOrCreate: vi.fn().mockResolvedValue({
      vehicleTypes: [
        { id: "auto", label: "Auto", enabled: true },
        { id: "moto", label: "Moto", enabled: true },
        { id: "camioneta", label: "Camioneta", enabled: true },
      ],
      acceptedPaymentMethods: ["efectivo", "yape", "plin"],
      hourlyBillingEnabled: false,
      hourlyRate: "5.00",
      dailyRate: null,
      graceMinutes: 10,
      hourlyBaseRate: "5.00",
      hourlyBaseHours: 1,
      extraHourRate: "1.00",
      defaultPaymentTiming: "exit",
    }),
  });

  beforeEach(() => {
    vi.useRealTimers();
  });

  it("prevents duplicate active plates in the same cochera business", async () => {
    const repo = createRepo();
    repo.findActiveByPlate.mockResolvedValue({ id: "session-1", plate: "ABC-123" });

    const settingsRepo = createSettingsRepo();
    const service = new CocheraSessionService(repo as never, settingsRepo as never);

    await expect(
      service.create(ctx as never, {
        plate: " abc-123 ",
        vehicleType: "auto",
      })
    ).rejects.toThrow(ConflictError);

    expect(repo.findActiveByPlate).toHaveBeenCalledWith(ctx, "ABC-123");
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("rejects session creation outside cochera mode", async () => {
    const repo = createRepo();
    const service = new CocheraSessionService(repo as never, createSettingsRepo() as never);

    await expect(
      service.create(
        { ...ctx, businessMode: "polleria" } as never,
        { plate: "ABC-123", vehicleType: "auto" }
      )
    ).rejects.toThrow(ForbiddenError);

    expect(repo.findActiveByPlate).not.toHaveBeenCalled();
  });

  it("normalizes plate and persists active sessions", async () => {
    const fixedDate = new Date("2026-05-07T10:00:00.000Z");

    const repo = createRepo();
    repo.findActiveByPlate.mockResolvedValue(undefined);
    repo.create.mockImplementation(async (_ctx, data) => ({
      id: "session-1",
      plate: data.plate,
      status: "dentro",
      entryAt: data.entryAt ?? fixedDate,
      vehicleType: data.vehicleType,
      notes: data.notes ?? null,
      businessId: "biz-1",
      exitAt: null,
      checkoutAt: null,
      checkoutBy: null,
      totalAmount: null,
      discountAmount: null,
      paymentMethod: null,
      createdAt: fixedDate,
      updatedAt: fixedDate,
    }));

    const service = new CocheraSessionService(repo as never, createSettingsRepo() as never);

    await service.create(ctx as never, {
      plate: " abc-123 ",
      vehicleType: "auto",
      notes: "Cliente frecuente",
    });

    expect(repo.create).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        plate: "ABC-123",
        vehicleType: "auto",
        status: "dentro",
        notes: "Cliente frecuente",
      })
    );
  });

  it("validates vehicle type", async () => {
    const repo = createRepo();
    const service = new CocheraSessionService(repo as never, createSettingsRepo() as never);

    await expect(
      service.create(ctx as never, {
        plate: "ABC-123",
        vehicleType: "taxi",
      } as never)
    ).rejects.toThrow(ValidationError);

    expect(repo.findActiveByPlate).not.toHaveBeenCalled();
  });

  it("stores hourly billing snapshot and entry payment when charging at entry", async () => {
    const repo = createRepo();
    repo.findActiveByPlate.mockResolvedValue(undefined);
    repo.create.mockImplementation(async (_ctx, data) => ({ id: "session-1", ...data }));
    const settingsRepo = createSettingsRepo();
    settingsRepo.getOrCreate.mockResolvedValue({
      ...(await settingsRepo.getOrCreate()),
      hourlyBillingEnabled: true,
      hourlyBaseRate: "5.00",
      hourlyBaseHours: 1,
      extraHourRate: "1.00",
      defaultPaymentTiming: "entry",
    });

    const service = new CocheraSessionService(repo as never, settingsRepo as never);

    await service.create(ctx as never, {
      plate: "ABC-456",
      vehicleType: "auto",
      paymentTiming: "entry",
      entryAmountPaid: 5,
      entryPaymentMethod: "yape",
    });

    expect(repo.create).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        paymentTiming: "entry",
        entryAmountPaid: "5.00",
        entryPaymentMethod: "yape",
        pricingSnapshot: expect.objectContaining({
          hourlyBillingEnabled: true,
          hourlyBaseRate: "5.00",
          extraHourRate: "1.00",
        }),
      })
    );
  });
});
