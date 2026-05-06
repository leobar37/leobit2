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

    expect(result).toEqual(distribucion);
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
});
