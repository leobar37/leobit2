import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerService } from "./customer.service";
import { db } from "../../lib/db";
import { ValidationError } from "../../errors";

vi.mock("../../lib/db", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

describe("CustomerService txid mutations", () => {
  const transactionMock = db.transaction as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    transactionMock.mockReset();
  });

  it("returns customer data with the txid from the active transaction", async () => {
    const tx = {
      execute: vi.fn().mockResolvedValue([{ txid: "54321" }]),
    };

    transactionMock.mockImplementation(async (callback) => callback(tx as never));

    const repository = {
      findByDni: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue({ id: "cust-1", name: "Cliente" }),
    };

    const service = new CustomerService(repository as never);
    const ctx = {
      hasPermission: vi.fn().mockReturnValue(true),
      businessId: "biz-1",
      businessUserId: "user-1",
    };

    const result = await service.createCustomer(ctx as never, {
      name: "Cliente",
      dni: null,
      phone: null,
      address: null,
      notes: null,
    });

    expect(result).toEqual({
      data: { id: "cust-1", name: "Cliente" },
      txid: 54321,
    });
    expect(repository.create).toHaveBeenCalledWith(
      ctx,
      {
        name: "Cliente",
        dni: null,
        phone: null,
        address: null,
        notes: null,
      },
      tx
    );
  });
});

describe("CustomerService agua profiles", () => {
  const transactionMock = db.transaction as ReturnType<typeof vi.fn>;
  const tx = {
    execute: vi.fn().mockResolvedValue([{ txid: "54321" }]),
  };

  const waterCtx = {
    hasPermission: vi.fn((permission: string) => permission === "customers.write" || permission === "customers.read"),
    businessId: "biz-agua",
    businessUserId: "admin-1",
    businessMode: "agua",
  };

  beforeEach(() => {
    transactionMock.mockReset();
    transactionMock.mockImplementation(async (callback) => callback(tx as never));
    tx.execute.mockClear();
    waterCtx.hasPermission.mockClear();
  });

  it("creates agua customer profiles without deposit or borrowed-container fields", async () => {
    const repository = {
      findByDni: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue({ id: "cust-1", name: "Carlos Mendoza" }),
    };
    const waterProfileRepository = {
      create: vi.fn().mockResolvedValue({
        id: "profile-1",
        customerId: "cust-1",
        deliveryFrequency: "weekly",
        deliveryDays: ["monday"],
        defaultContainerQuantity: 2,
        waterRouteId: "route-1",
      }),
    };
    const service = new CustomerService(repository as never, waterProfileRepository as never);

    const result = await service.createCustomer(waterCtx as never, {
      name: "Carlos Mendoza",
      dni: "45678912",
      phone: "999111222",
      address: "Jr. Las Flores 456",
      notes: "Cliente recurrente",
      waterProfile: {
        deliveryFrequency: "weekly",
        deliveryDays: ["monday"],
        defaultContainerQuantity: 2,
        waterRouteId: "route-1",
        deliveryInstructions: "Dejar en la puerta",
        depositAmount: "50.00",
        containersAtCustomer: 3,
      } as never,
    });

    expect(repository.create).toHaveBeenCalledWith(
      waterCtx,
      expect.not.objectContaining({
        depositAmount: expect.anything(),
        containersAtCustomer: expect.anything(),
      }),
      tx
    );
    expect(waterProfileRepository.create).toHaveBeenCalledWith(
      waterCtx,
      "cust-1",
      {
        deliveryFrequency: "weekly",
        deliveryDays: ["monday"],
        defaultContainerQuantity: 2,
        waterRouteId: "route-1",
        preferredRoute: null,
        deliveryInstructions: "Dejar en la puerta",
        scheduleAnchorDate: null,
      },
      tx
    );
    expect(result.data.waterProfile).toMatchObject({ id: "profile-1" });
  });

  it("rejects agua delivery fields for non-agua businesses", async () => {
    const repository = {
      findByDni: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue({ id: "cust-1", name: "Cliente" }),
    };
    const waterProfileRepository = {
      create: vi.fn(),
    };
    const service = new CustomerService(repository as never, waterProfileRepository as never);

    await expect(
      service.createCustomer(
        { ...waterCtx, businessMode: "polleria" } as never,
        {
          name: "Cliente",
          waterProfile: {
            deliveryFrequency: "weekly",
            deliveryDays: ["monday"],
            defaultContainerQuantity: 1,
          },
        }
      )
    ).rejects.toThrow(ValidationError);

    expect(waterProfileRepository.create).not.toHaveBeenCalled();
  });

  it("attaches water profiles only in agua mode", async () => {
    const customers = [{ id: "cust-1", name: "Ana Torres" }];
    const repository = {
      findMany: vi.fn().mockResolvedValue(customers),
    };
    const waterProfileRepository = {
      findByCustomerIds: vi.fn().mockResolvedValue([
        { id: "profile-1", customerId: "cust-1", deliveryDays: ["tuesday"] },
      ]),
    };
    const service = new CustomerService(repository as never, waterProfileRepository as never);

    const waterCustomers = await service.getCustomers(waterCtx as never);
    const polleriaCustomers = await service.getCustomers({ ...waterCtx, businessMode: "polleria" } as never);

    expect(waterCustomers[0].waterProfile).toMatchObject({ id: "profile-1" });
    expect(polleriaCustomers[0]).not.toHaveProperty("waterProfile");
    expect(waterProfileRepository.findByCustomerIds).toHaveBeenCalledTimes(1);
  });
});
