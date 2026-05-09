import { beforeEach, describe, expect, it, vi } from "vitest";
import { VisitaService } from "./visita.service";
import { db } from "../../lib/db";

vi.mock("../../lib/db", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

describe("VisitaService water delivery sync safety", () => {
  const transactionMock = db.transaction as ReturnType<typeof vi.fn>;
  const tx = {};
  const ctx = {
    businessId: "biz-1",
    businessUserId: "seller-1",
    businessMode: "agua",
    hasPermission: vi.fn((permission: string) => permission === "sales.write"),
  };

  const visit = {
    id: "visit-1",
    businessId: "biz-1",
    distribucionId: "dist-1",
    customerId: "customer-1",
    vendedorId: "seller-1",
    status: "pendiente",
    motivoNoCompra: null,
    saleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const pendingStop = {
    id: "stop-1",
    businessId: "biz-1",
    visitaId: "visit-1",
    customerProfileId: "profile-1",
    waterRouteId: "route-1",
    scheduledDate: "2026-05-08",
    expectedContainerQuantity: 2,
    containersAtStart: 1,
    deliveredContainerQuantity: 0,
    collectedContainerQuantity: 0,
    damagedContainerQuantity: 0,
    lostContainerQuantity: 0,
    status: "pendiente",
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createRepos = () => ({
    visitaRepo: {
      findById: vi.fn().mockResolvedValue(visit),
      updateStatus: vi.fn().mockResolvedValue({ ...visit, status: "compro", saleId: "sale-1" }),
    },
    customerRepo: {},
    distribucionRepo: {},
    waterRepo: {
      findDeliveryStopByVisitaId: vi.fn().mockResolvedValue(pendingStop),
      completeDeliveryStop: vi.fn().mockResolvedValue({
        ...pendingStop,
        status: "entregado",
        deliveredContainerQuantity: 2,
      }),
      updateContainersAtCustomer: vi.fn().mockResolvedValue(undefined),
      createContainerLedgerEntry: vi.fn().mockResolvedValue(undefined),
    },
    saleRepo: {
      create: vi.fn().mockResolvedValue({ id: "sale-1" }),
    },
    productVariantRepo: {
      findById: vi.fn().mockResolvedValue({
        id: "variant-1",
        productId: "product-1",
        name: "Bidón 20L",
        price: "8.00",
        product: { id: "product-1", name: "Agua" },
      }),
      getInventory: vi.fn().mockResolvedValue({ variantId: "variant-1", quantity: "10.00" }),
      updateInventory: vi.fn().mockResolvedValue({ variantId: "variant-1", quantity: "8.00" }),
    },
  });

  beforeEach(() => {
    transactionMock.mockReset();
    transactionMock.mockImplementation(async (callback) => callback(tx as never));
    ctx.hasPermission.mockClear();
  });

  it("creates sale, ledger, visit link and inventory deduction in one transaction", async () => {
    const repos = createRepos();
    const service = new VisitaService(
      repos.visitaRepo as never,
      repos.customerRepo as never,
      repos.distribucionRepo as never,
      repos.waterRepo as never,
      repos.saleRepo as never,
      repos.productVariantRepo as never
    );

    const result = await service.completeWaterDelivery(ctx as never, "visit-1", {
      status: "entregado",
      delivered: 2,
      variantId: "variant-1",
      paymentMethod: "yape",
    });

    expect(repos.saleRepo.create).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        customerId: "customer-1",
        distribucionId: "dist-1",
        visitaId: "visit-1",
        totalAmount: "16.00",
        paymentMethod: "yape",
      }),
      tx
    );
    expect(repos.productVariantRepo.findById).toHaveBeenCalledWith(ctx, "variant-1", tx);
    expect(repos.productVariantRepo.getInventory).toHaveBeenCalledWith(ctx, "variant-1", tx);
    expect(repos.productVariantRepo.updateInventory).toHaveBeenCalledWith(ctx, "variant-1", "8.00", tx);
    expect(repos.visitaRepo.updateStatus).toHaveBeenCalledWith(
      ctx,
      "visit-1",
      expect.objectContaining({ status: "compro", saleId: "sale-1" }),
      tx
    );
    expect(result).toMatchObject({ saleId: "sale-1", containersAtCustomer: 3 });
  });

  it("returns existing completion without duplicating side effects on retry", async () => {
    const repos = createRepos();
    const completedVisit = { ...visit, status: "compro", saleId: "sale-1" };
    const completedStop = {
      ...pendingStop,
      status: "entregado",
      deliveredContainerQuantity: 2,
    };
    repos.visitaRepo.findById.mockResolvedValue(completedVisit);
    repos.waterRepo.findDeliveryStopByVisitaId.mockResolvedValue(completedStop);

    const service = new VisitaService(
      repos.visitaRepo as never,
      repos.customerRepo as never,
      repos.distribucionRepo as never,
      repos.waterRepo as never,
      repos.saleRepo as never,
      repos.productVariantRepo as never
    );

    const result = await service.completeWaterDelivery(ctx as never, "visit-1", {
      status: "entregado",
      delivered: 2,
      variantId: "variant-1",
    });

    expect(transactionMock).not.toHaveBeenCalled();
    expect(repos.saleRepo.create).not.toHaveBeenCalled();
    expect(repos.productVariantRepo.updateInventory).not.toHaveBeenCalled();
    expect(repos.waterRepo.createContainerLedgerEntry).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      visita: completedVisit,
      waterStop: completedStop,
      saleId: "sale-1",
      containersAtCustomer: 3,
    });
  });
});
