import { beforeEach, describe, expect, it, vi } from "vitest";
import { CocheraCustomerService } from "./cochera-customer.service";
import { ForbiddenError, ValidationError } from "../../errors";
import { db } from "../../lib/db";

vi.mock("../../lib/db", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

describe("CocheraCustomerService", () => {
  const transactionMock = db.transaction as ReturnType<typeof vi.fn>;
  const ctx = {
    businessId: "biz-1",
    businessUserId: "operator-1",
    businessMode: "cochera",
    hasPermission: vi.fn().mockReturnValue(true),
  };

  const createDeps = () => {
    const customerRepo = {
      create: vi.fn().mockResolvedValue({
        id: "customer-1",
        name: "Cliente Cochera",
        phone: "999888777",
        dni: null,
        address: null,
        notes: null,
      }),
      findById: vi.fn().mockResolvedValue({
        id: "customer-1",
        name: "Cliente Cochera",
      }),
    };
    const vehicleRepo = {
      findActiveByPlate: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue({
        id: "vehicle-1",
        businessId: "biz-1",
        customerId: "customer-1",
        plate: "ABC-123",
        vehicleType: "auto",
        alias: null,
        notes: null,
        active: true,
        createdAt: new Date("2026-05-11T10:00:00.000Z"),
        updatedAt: new Date("2026-05-11T10:00:00.000Z"),
      }),
      findByCustomerIds: vi.fn().mockResolvedValue([]),
      listCustomerSummaries: vi.fn().mockResolvedValue([]),
      findByCustomerId: vi.fn().mockResolvedValue([]),
      findById: vi.fn(),
      update: vi.fn(),
    };
    const sessionRepo = {
      listDebts: vi.fn().mockResolvedValue([]),
    };

    return { customerRepo, vehicleRepo, sessionRepo };
  };

  beforeEach(() => {
    transactionMock.mockReset();
    transactionMock.mockImplementation(async (callback) => callback({ tx: true } as never));
    ctx.hasPermission.mockReturnValue(true);
  });

  it("creates cochera customers with multiple vehicles", async () => {
    const deps = createDeps();
    const service = new CocheraCustomerService(
      deps.customerRepo as never,
      deps.vehicleRepo as never,
      deps.sessionRepo as never
    );

    const result = await service.createCustomer(ctx as never, {
      name: "Cliente Cochera",
      phone: "999888777",
      vehicles: [
        { plate: "abc-123", vehicleType: "auto" },
        { plate: "mot-456", vehicleType: "moto" },
      ],
    });

    expect(deps.vehicleRepo.findActiveByPlate).toHaveBeenCalledWith(ctx, "ABC-123");
    expect(deps.vehicleRepo.findActiveByPlate).toHaveBeenCalledWith(ctx, "MOT-456");
    expect(deps.vehicleRepo.create).toHaveBeenCalledTimes(2);
    expect(result.customer.id).toBe("customer-1");
    expect(result.vehicles[0].plate).toBe("ABC-123");
  });

  it("rejects duplicate active plates", async () => {
    const deps = createDeps();
    deps.vehicleRepo.findActiveByPlate.mockResolvedValue({
      id: "vehicle-existing",
      plate: "ABC-123",
    });
    const service = new CocheraCustomerService(
      deps.customerRepo as never,
      deps.vehicleRepo as never,
      deps.sessionRepo as never
    );

    await expect(
      service.createCustomer(ctx as never, {
        name: "Cliente Cochera",
        vehicles: [{ plate: "ABC-123", vehicleType: "auto" }],
      })
    ).rejects.toThrow(ValidationError);
  });

  it("rejects non-cochera businesses", async () => {
    const deps = createDeps();
    const service = new CocheraCustomerService(
      deps.customerRepo as never,
      deps.vehicleRepo as never,
      deps.sessionRepo as never
    );

    await expect(
      service.listCustomers({ ...ctx, businessMode: "polleria" } as never)
    ).rejects.toThrow(ForbiddenError);
  });
});
