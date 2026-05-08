import { describe, expect, it, vi } from "vitest";
import { DistribucionService } from "./distribucion.service";

describe("DistribucionService", () => {
  const ctx = {
    hasPermission: vi.fn().mockReturnValue(true),
    businessId: "biz-1",
    businessUserId: "admin-1",
    isAdmin: vi.fn().mockReturnValue(true),
  };

  it("creates a distribucion with an empty normalized items list", async () => {
    const distribucion = {
      id: "dist-1",
      vendedorId: "seller-1",
      puntoVenta: "Mercado",
      fecha: "2026-05-06",
      estado: "activo",
      items: [],
    };
    const repository = {
      existsForVendedorAndFecha: vi.fn().mockResolvedValue(false),
      create: vi.fn().mockResolvedValue(distribucion),
      findByIdWithItems: vi.fn().mockResolvedValue(distribucion),
    };
    const itemRepository = {
      create: vi.fn(),
    };

    const service = new DistribucionService(
      repository as never,
      itemRepository as never,
      {} as never,
      {} as never,
      {
        createMany: vi.fn().mockResolvedValue([]),
        findGroupsByDistribucionId: vi.fn().mockResolvedValue([]),
      } as never,
      {} as never
    );

    const result = await service.createDistribucion(
      ctx as never,
      {
        vendedorId: "seller-1",
        puntoVenta: "Mercado",
        puntoVentaId: "pv-1",
        fecha: "2026-05-06",
        items: [],
      },
      {} as never
    );

    expect(result).toEqual({ ...distribucion, groups: [] });
    expect(repository.create).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        vendedorId: "seller-1",
        puntoVenta: "Mercado",
        puntoVentaId: "pv-1",
      }),
      {}
    );
    expect(itemRepository.create).not.toHaveBeenCalled();
  });

  it("creates links and visits for groupIds using the assigned seller", async () => {
    const distribucion = {
      id: "dist-1",
      vendedorId: "seller-1",
      puntoVenta: "Mercado",
      fecha: "2026-05-06",
      estado: "activo",
      items: [],
    };
    const repository = {
      existsForVendedorAndFecha: vi.fn().mockResolvedValue(false),
      create: vi.fn().mockResolvedValue(distribucion),
      findByIdWithItems: vi.fn().mockResolvedValue(distribucion),
    };
    const distribucionGroupRepository = {
      createMany: vi.fn().mockResolvedValue([]),
      findGroupsByDistribucionId: vi.fn().mockResolvedValue([{ id: "group-1", name: "Restaurantes" }]),
    };
    const customerGroupRepository = {
      findByIdWithMembers: vi.fn().mockResolvedValue({
        id: "group-1",
        members: [
          { customerId: "customer-1" },
          { customerId: "customer-2" },
        ],
      }),
    };
    const visitaRepository = {
      bulkCreate: vi.fn().mockResolvedValue([
        { id: "visit-1", customerId: "customer-1" },
        { id: "visit-2", customerId: "customer-2" },
      ]),
    };

    const service = new DistribucionService(
      repository as never,
      { create: vi.fn() } as never,
      {} as never,
      customerGroupRepository as never,
      distribucionGroupRepository as never,
      visitaRepository as never
    );

    const result = await service.createDistribucion(
      ctx as never,
      {
        vendedorId: "seller-1",
        puntoVenta: "Mercado",
        fecha: "2026-05-06",
        groupIds: ["group-1"],
        items: [],
      },
      {} as never
    );

    expect(distribucionGroupRepository.createMany).toHaveBeenCalledWith(
      ctx,
      "dist-1",
      ["group-1"],
      {}
    );
    expect(customerGroupRepository.findByIdWithMembers).toHaveBeenCalledWith(ctx, "group-1", {});
    expect(visitaRepository.bulkCreate).toHaveBeenCalledWith(
      ctx,
      {
        distribucionId: "dist-1",
        customerIds: ["customer-1", "customer-2"],
        vendedorId: "seller-1",
      },
      {}
    );
    expect(result.groups).toEqual([{ id: "group-1", name: "Restaurantes" }]);
  });

  it("filters distribution lists to the logged-in seller", async () => {
    const sellerCtx = {
      hasPermission: vi.fn().mockReturnValue(true),
      businessId: "biz-1",
      businessUserId: "seller-1",
      isAdmin: vi.fn().mockReturnValue(false),
    };
    const repository = {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "dist-1",
          vendedorId: "seller-1",
          puntoVenta: "Mercado",
          fecha: "2026-05-06",
        },
      ]),
    };

    const service = new DistribucionService(
      repository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    );

    await service.getDistribuciones(sellerCtx as never, { fecha: "2026-05-06" });

    expect(repository.findMany).toHaveBeenCalledWith(sellerCtx, {
      fecha: "2026-05-06",
      vendedorId: "seller-1",
    });
  });

  it("prevents a seller from reading another seller's distribution list", async () => {
    const sellerCtx = {
      hasPermission: vi.fn().mockReturnValue(true),
      businessId: "biz-1",
      businessUserId: "seller-1",
      isAdmin: vi.fn().mockReturnValue(false),
    };
    const repository = {
      findMany: vi.fn(),
    };

    const service = new DistribucionService(
      repository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    );

    await expect(
      service.getDistribuciones(sellerCtx as never, {
        fecha: "2026-05-06",
        vendedorId: "seller-2",
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    expect(repository.findMany).not.toHaveBeenCalled();
  });

  it("returns a seller's own assigned distribution from the mine flow", async () => {
    const sellerCtx = {
      hasPermission: vi.fn().mockReturnValue(true),
      businessId: "biz-1",
      businessUserId: "seller-1",
      isAdmin: vi.fn().mockReturnValue(false),
    };
    const distribucion = {
      id: "dist-1",
      vendedorId: "seller-1",
      puntoVenta: "Mercado",
      fecha: "2026-05-06",
      estado: "activo",
      items: [],
    };
    const repository = {
      findByVendedorAndFecha: vi.fn().mockResolvedValue(distribucion),
      findByIdWithItems: vi.fn().mockResolvedValue(distribucion),
    };
    const distribucionGroupRepository = {
      findGroupsByDistribucionId: vi.fn().mockResolvedValue([]),
    };

    const service = new DistribucionService(
      repository as never,
      {} as never,
      {} as never,
      {} as never,
      distribucionGroupRepository as never,
      {} as never
    );

    const result = await service.getDistribucionForVendedor(
      sellerCtx as never,
      "seller-1",
      "2026-05-06"
    );

    expect(repository.findByVendedorAndFecha).toHaveBeenCalledWith(
      sellerCtx,
      "seller-1",
      "2026-05-06"
    );
    expect(result).toEqual({ ...distribucion, groups: [] });
  });
});
