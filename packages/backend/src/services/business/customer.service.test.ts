import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerService } from "./customer.service";
import { db } from "../../lib/db";

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
