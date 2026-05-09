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

  describe("water routes", () => {
    const waterCtx = {
      hasPermission: vi.fn().mockReturnValue(true),
      businessId: "biz-1",
      businessUserId: "admin-1",
      isAdmin: vi.fn().mockReturnValue(true),
      businessMode: "agua",
    };

    function makeProfile(overrides: Partial<{
      id: string;
      customerId: string;
      customerName: string;
      deliveryFrequency: string;
      deliveryDays: string[];
      defaultContainerQuantity: number;
      containersAtCustomer: number;
      waterRouteId: string;
      scheduleAnchorDate: Date | null;
    }> = {}) {
      return {
        id: overrides.id ?? "profile-1",
        businessId: waterCtx.businessId,
        customerId: overrides.customerId ?? "cust-1",
        customerName: overrides.customerName ?? "Cliente A",
        customerPhone: null,
        customerAddress: null,
        deliveryFrequency: overrides.deliveryFrequency ?? "weekly",
        deliveryDays: overrides.deliveryDays ?? ["monday"],
        defaultContainerQuantity: overrides.defaultContainerQuantity ?? 2,
        containersAtCustomer: overrides.containersAtCustomer ?? 0,
        depositAmount: "0",
        depositStatus: "none",
        preferredRoute: null,
        depositExceptionReason: null,
        waterRouteId: overrides.waterRouteId ?? "route-1",
        waterRouteName: "Ruta Norte",
        deliveryInstructions: null,
        scheduleAnchorDate: overrides.scheduleAnchorDate ?? null,
        lastScheduledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    it("previewWaterRoute returns customers scheduled for the requested day", async () => {
      const repository = {} as never;
      const waterProfileRepo = {
        findScheduledCandidates: vi.fn().mockResolvedValue([
          makeProfile({ id: "p1", customerId: "c1", customerName: "Carlos", deliveryDays: ["monday"] }),
          makeProfile({ id: "p2", customerId: "c2", customerName: "Ana", deliveryDays: ["tuesday"] }),
        ]),
      };
      const waterRouteRepo = {
        findById: vi.fn().mockResolvedValue({ id: "route-1", name: "Ruta Norte" }),
      };

      const service = new DistribucionService(
        repository,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        waterProfileRepo as never,
        waterRouteRepo as never
      );

      // 2026-05-04 is a Monday
      const result = await service.previewWaterRoute(waterCtx as never, {
        fecha: "2026-05-04",
        waterRouteId: "route-1",
      });

      expect(result).toHaveLength(1);
      expect(result[0].customerName).toBe("Carlos");
      expect(waterProfileRepo.findScheduledCandidates).toHaveBeenCalledWith(
        waterCtx,
        "route-1",
        "2026-05-04"
      );
    });

    it("previewWaterRoute rejects non-water business mode", async () => {
      const polleriaCtx = { ...waterCtx, businessMode: "polleria" };
      const service = new DistribucionService(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never
      );

      await expect(
        service.previewWaterRoute(polleriaCtx as never, {
          fecha: "2026-05-04",
          waterRouteId: "route-1",
        })
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });

    it("generateWaterRoute creates distribution, visitas and water stops", async () => {
      const distribucion = { id: "dist-1", vendedorId: "seller-1", puntoVenta: "Ruta Norte", fecha: "2026-05-04", estado: "activo" };
      const repository = {
        existsForVendedorAndFecha: vi.fn().mockResolvedValue(false),
        create: vi.fn().mockResolvedValue(distribucion),
      };
      const visitaRepository = {
        create: vi.fn().mockResolvedValue({ id: "visit-1", customerId: "c1" }),
      };
      const waterProfileRepo = {
        findScheduledCandidates: vi.fn().mockResolvedValue([
          makeProfile({ id: "p1", customerId: "c1", customerName: "Carlos", deliveryDays: ["monday"] }),
        ]),
        createDeliveryStop: vi.fn().mockResolvedValue({ id: "stop-1" }),
        markScheduled: vi.fn().mockResolvedValue(undefined),
      };
      const waterRouteRepo = {
        findById: vi.fn().mockResolvedValue({ id: "route-1", name: "Ruta Norte" }),
      };

      const service = new DistribucionService(
        repository as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        visitaRepository as never,
        waterProfileRepo as never,
        waterRouteRepo as never
      );

      const result = await service.generateWaterRoute(waterCtx as never, {
        vendedorId: "seller-1",
        fecha: "2026-05-04",
        waterRouteId: "route-1",
      }, {} as never);

      expect(repository.existsForVendedorAndFecha).toHaveBeenCalledWith(
        waterCtx,
        "seller-1",
        "2026-05-04",
        ["activo", "en_ruta"]
      );
      expect(repository.create).toHaveBeenCalledWith(
        waterCtx,
        expect.objectContaining({
          vendedorId: "seller-1",
          puntoVenta: "Ruta Norte",
          fecha: "2026-05-04",
          estado: "activo",
        }),
        expect.anything()
      );
      expect(visitaRepository.create).toHaveBeenCalledWith(
        waterCtx,
        expect.objectContaining({
          distribucionId: "dist-1",
          customerId: "c1",
        }),
        expect.anything()
      );
      expect(waterProfileRepo.createDeliveryStop).toHaveBeenCalledWith(
        waterCtx,
        expect.objectContaining({
          visitaId: "visit-1",
          customerProfileId: "p1",
          waterRouteId: "route-1",
          scheduledDate: "2026-05-04",
          expectedContainerQuantity: 2,
          containersAtStart: 0,
        }),
        expect.anything()
      );
      expect(waterProfileRepo.markScheduled).toHaveBeenCalledWith(
        waterCtx,
        "p1",
        new Date("2026-05-04T00:00:00"),
        expect.anything()
      );
      expect(result.distribucionId).toBe("dist-1");
      expect(result.createdVisits).toBe(1);
    });

    it("generateWaterRoute prevents duplicate distribution for same seller and date", async () => {
      const repository = {
        existsForVendedorAndFecha: vi.fn().mockResolvedValue(true),
      };
      const waterRouteRepo = {
        findById: vi.fn().mockResolvedValue({ id: "route-1", name: "Ruta Norte" }),
      };

      const service = new DistribucionService(
        repository as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        waterRouteRepo as never
      );

      await expect(
        service.generateWaterRoute(waterCtx as never, {
          vendedorId: "seller-1",
          fecha: "2026-05-04",
          waterRouteId: "route-1",
        }, {} as never)
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });

    it("generateWaterRoute throws when no customers are scheduled", async () => {
      const repository = {
        existsForVendedorAndFecha: vi.fn().mockResolvedValue(false),
      };
      const waterProfileRepo = {
        findScheduledCandidates: vi.fn().mockResolvedValue([]),
      };
      const waterRouteRepo = {
        findById: vi.fn().mockResolvedValue({ id: "route-1", name: "Ruta Norte" }),
      };

      const service = new DistribucionService(
        repository as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        waterProfileRepo as never,
        waterRouteRepo as never
      );

      await expect(
        service.generateWaterRoute(waterCtx as never, {
          vendedorId: "seller-1",
          fecha: "2026-05-04",
          waterRouteId: "route-1",
        }, {} as never)
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });

    it("excludes customers that already have a stop for the same route and date", async () => {
      const distribucion = { id: "dist-1", vendedorId: "seller-1", puntoVenta: "Ruta Norte", fecha: "2026-05-04", estado: "activo" };
      const repository = {
        existsForVendedorAndFecha: vi.fn().mockResolvedValue(false),
        create: vi.fn().mockResolvedValue(distribucion),
      };
      const visitaRepository = {
        create: vi.fn().mockResolvedValue({ id: "visit-1", customerId: "c1" }),
      };
      // findScheduledCandidates already filters out customers with existing stops,
      // so only the customer without a stop is returned
      const waterProfileRepo = {
        findScheduledCandidates: vi.fn().mockResolvedValue([
          makeProfile({ id: "p1", customerId: "c1", customerName: "Carlos", deliveryDays: ["monday"] }),
        ]),
        createDeliveryStop: vi.fn().mockResolvedValue({ id: "stop-1" }),
        markScheduled: vi.fn().mockResolvedValue(undefined),
      };
      const waterRouteRepo = {
        findById: vi.fn().mockResolvedValue({ id: "route-1", name: "Ruta Norte" }),
      };

      const service = new DistribucionService(
        repository as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        visitaRepository as never,
        waterProfileRepo as never,
        waterRouteRepo as never
      );

      const result = await service.generateWaterRoute(waterCtx as never, {
        vendedorId: "seller-1",
        fecha: "2026-05-04",
        waterRouteId: "route-1",
      }, {} as never);

      expect(waterProfileRepo.findScheduledCandidates).toHaveBeenCalledWith(
        waterCtx,
        "route-1",
        "2026-05-04"
      );
      expect(result.createdVisits).toBe(1);
      expect(waterProfileRepo.createDeliveryStop).toHaveBeenCalledTimes(1);
    });

    it("matches daily frequency for any day", async () => {
      const waterProfileRepo = {
        findScheduledCandidates: vi.fn().mockResolvedValue([
          makeProfile({ id: "p1", customerId: "c1", customerName: "Carlos", deliveryFrequency: "daily", deliveryDays: [] }),
        ]),
      };
      const waterRouteRepo = {
        findById: vi.fn().mockResolvedValue({ id: "route-1", name: "Ruta Norte" }),
      };

      const service = new DistribucionService(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        waterProfileRepo as never,
        waterRouteRepo as never
      );

      // 2026-05-05 is a Tuesday
      const result = await service.previewWaterRoute(waterCtx as never, {
        fecha: "2026-05-05",
        waterRouteId: "route-1",
      });

      expect(result).toHaveLength(1);
      expect(result[0].customerName).toBe("Carlos");
    });

    it("matches biweekly frequency based on anchor date", async () => {
      const anchor = new Date("2026-04-27T00:00:00"); // Monday 2 weeks before
      const waterProfileRepo = {
        findScheduledCandidates: vi.fn().mockResolvedValue([
          makeProfile({
            id: "p1",
            customerId: "c1",
            customerName: "Carlos",
            deliveryFrequency: "biweekly",
            deliveryDays: ["monday"],
            scheduleAnchorDate: anchor,
          }),
        ]),
      };
      const waterRouteRepo = {
        findById: vi.fn().mockResolvedValue({ id: "route-1", name: "Ruta Norte" }),
      };

      const service = new DistribucionService(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        waterProfileRepo as never,
        waterRouteRepo as never
      );

      // 2026-05-11 is also a Monday, exactly 2 weeks after anchor
      const result = await service.previewWaterRoute(waterCtx as never, {
        fecha: "2026-05-11",
        waterRouteId: "route-1",
      });

      expect(result).toHaveLength(1);
    });
  });
});
