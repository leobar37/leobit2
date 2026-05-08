import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubscriptionService } from "./subscription.service";
import { ForbiddenError } from "../../errors";

describe("SubscriptionService", () => {
  const ctx = {
    businessId: "biz-1",
    businessMode: "cochera",
  };

  const createRepo = () => ({
    getOrCreate: vi.fn(),
    resetUsageIfNeeded: vi.fn(),
    incrementUsage: vi.fn(),
  });

  beforeEach(() => {
    vi.useRealTimers();
  });

  it("blocks Gratis when the monthly record limit is reached", async () => {
    const repo = createRepo();
    repo.getOrCreate.mockResolvedValue({
      plan: "gratis",
      monthlyRecordLimit: 50,
      currentPeriodEnd: new Date("2026-05-31T23:59:59.999Z"),
    });
    repo.resetUsageIfNeeded.mockResolvedValue({
      recordCount: 50,
    });

    const service = new SubscriptionService(repo as never);

    await expect(service.checkAndRecordUsage(ctx as never)).rejects.toThrow(ForbiddenError);
    expect(repo.incrementUsage).not.toHaveBeenCalled();
  });

  it("allows Profesional unlimited usage", async () => {
    const repo = createRepo();
    repo.getOrCreate.mockResolvedValue({
      plan: "profesional",
      monthlyRecordLimit: null,
      currentPeriodEnd: new Date("2026-05-31T23:59:59.999Z"),
    });
    repo.resetUsageIfNeeded.mockResolvedValue({
      recordCount: 10_000,
    });
    repo.incrementUsage.mockResolvedValue({
      recordCount: 10_001,
    });

    const service = new SubscriptionService(repo as never);

    await expect(service.checkAndRecordUsage(ctx as never)).resolves.toBeUndefined();
    expect(repo.incrementUsage).toHaveBeenCalledWith(ctx, undefined);
  });

  it("returns unlimited status for non-cochera modes", async () => {
    const repo = createRepo();
    const service = new SubscriptionService(repo as never);

    const status = await service.getStatus({
      ...ctx,
      businessMode: "polleria",
    } as never);

    expect(status).toMatchObject({
      plan: "profesional",
      isWithinLimit: true,
      recordsLimit: null,
      canExport: true,
      canAccessReports: true,
    });
    expect(repo.getOrCreate).not.toHaveBeenCalled();
  });

  it("reports Gratis export and report gates as unavailable", async () => {
    const repo = createRepo();
    repo.getOrCreate.mockResolvedValue({
      plan: "gratis",
      monthlyRecordLimit: 50,
      currentPeriodEnd: new Date("2026-05-31T23:59:59.999Z"),
    });
    repo.resetUsageIfNeeded.mockResolvedValue({
      recordCount: 10,
    });

    const service = new SubscriptionService(repo as never);

    await expect(service.checkLimit(ctx as never, "export")).resolves.toEqual({
      allowed: false,
      reason: "Exportación no disponible en tu plan.",
    });
    await expect(service.checkLimit(ctx as never, "report")).resolves.toEqual({
      allowed: false,
      reason: "Reportes completos no disponibles en tu plan.",
    });
  });
});
