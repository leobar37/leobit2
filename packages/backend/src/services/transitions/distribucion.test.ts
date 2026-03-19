import { describe, expect, it, vi, beforeEach } from "vitest";
import { createMachine, StateMachineRegistry } from "../../lib/state-machine";
import { setupDistribucionTransitions } from "./distribucion";
import type { DistribucionWithItems, DistribucionState } from "./index";

describe("setupDistribucionTransitions", () => {
  let machine: ReturnType<typeof createMachine<DistribucionWithItems, DistribucionState>>;
  let mockVariantRepo: {
    adjustInventory: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    StateMachineRegistry.getAll().clear();
    
    mockVariantRepo = {
      adjustInventory: vi.fn().mockResolvedValue(undefined),
    };

    machine = createMachine<DistribucionWithItems, DistribucionState>({
      name: "distribucion",
      initialState: "activo",
      states: ["activo", "en_ruta", "cerrado"],
    });

    setupDistribucionTransitions(machine, mockVariantRepo as any);
  });

  describe("null → activo (create distribution)", () => {
    it("reserves stock for each item", async () => {
      const distribucion: DistribucionWithItems = {
        id: "dist-1",
        vendedorId: "vendedor-1",
        puntoVenta: "Punto 1",
        fecha: "2024-01-01",
        estado: "activo",
        montoRecaudado: "0",
        modo: "estricto",
        items: [
          { id: "item-1", distribucionId: "dist-1", variantId: "variant-1", cantidadAsignada: "10", cantidadVendida: "0", unidad: "kg" },
          { id: "item-2", distribucionId: "dist-1", variantId: "variant-2", cantidadAsignada: "5", cantidadVendida: "0", unidad: "kg" },
        ],
      } as DistribucionWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, distribucion, null, "activo");

      expect(mockVariantRepo.adjustInventory).toHaveBeenCalledTimes(2);
      expect(mockVariantRepo.adjustInventory).toHaveBeenCalledWith(ctx, "variant-1", -10);
      expect(mockVariantRepo.adjustInventory).toHaveBeenCalledWith(ctx, "variant-2", -5);
    });

    it("handles multiple items with correct quantities", async () => {
      const distribucion: DistribucionWithItems = {
        id: "dist-1",
        vendedorId: "vendedor-1",
        puntoVenta: "Punto 1",
        fecha: "2024-01-01",
        estado: "activo",
        montoRecaudado: "0",
        modo: "estricto",
        items: [
          { id: "item-1", distribucionId: "dist-1", variantId: "variant-1", cantidadAsignada: "100", cantidadVendida: "0", unidad: "kg" },
          { id: "item-2", distribucionId: "dist-1", variantId: "variant-2", cantidadAsignada: "50", cantidadVendida: "0", unidad: "kg" },
          { id: "item-3", distribucionId: "dist-1", variantId: "variant-3", cantidadAsignada: "25", cantidadVendida: "0", unidad: "kg" },
        ],
      } as DistribucionWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, distribucion, null, "activo");

      expect(mockVariantRepo.adjustInventory).toHaveBeenCalledTimes(3);
      expect(mockVariantRepo.adjustInventory).toHaveBeenCalledWith(ctx, "variant-1", -100);
      expect(mockVariantRepo.adjustInventory).toHaveBeenCalledWith(ctx, "variant-2", -50);
      expect(mockVariantRepo.adjustInventory).toHaveBeenCalledWith(ctx, "variant-3", -25);
    });

    it("skips items with zero quantity", async () => {
      const distribucion: DistribucionWithItems = {
        id: "dist-1",
        vendedorId: "vendedor-1",
        puntoVenta: "Punto 1",
        fecha: "2024-01-01",
        estado: "activo",
        montoRecaudado: "0",
        modo: "estricto",
        items: [
          { id: "item-1", distribucionId: "dist-1", variantId: "variant-1", cantidadAsignada: "10", cantidadVendida: "0", unidad: "kg" },
          { id: "item-2", distribucionId: "dist-1", variantId: "variant-2", cantidadAsignada: "0", cantidadVendida: "0", unidad: "kg" },
        ],
      } as DistribucionWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, distribucion, null, "activo");

      expect(mockVariantRepo.adjustInventory).toHaveBeenCalledTimes(1);
      expect(mockVariantRepo.adjustInventory).toHaveBeenCalledWith(ctx, "variant-1", -10);
    });
  });

  describe("activo → cerrado (close distribution)", () => {
    it("returns sobrante for each item", async () => {
      const distribucion: DistribucionWithItems = {
        id: "dist-1",
        vendedorId: "vendedor-1",
        puntoVenta: "Punto 1",
        fecha: "2024-01-01",
        estado: "cerrado",
        montoRecaudado: "100",
        modo: "estricto",
        items: [
          { id: "item-1", distribucionId: "dist-1", variantId: "variant-1", cantidadAsignada: "10", cantidadVendida: "7", unidad: "kg" },
          { id: "item-2", distribucionId: "dist-1", variantId: "variant-2", cantidadAsignada: "5", cantidadVendida: "3", unidad: "kg" },
        ],
      } as DistribucionWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, distribucion, "activo", "cerrado");

      expect(mockVariantRepo.adjustInventory).toHaveBeenCalledTimes(2);
      expect(mockVariantRepo.adjustInventory).toHaveBeenCalledWith(ctx, "variant-1", 3);
      expect(mockVariantRepo.adjustInventory).toHaveBeenCalledWith(ctx, "variant-2", 2);
    });

    it("calculates sobrante correctly", async () => {
      const distribucion: DistribucionWithItems = {
        id: "dist-1",
        vendedorId: "vendedor-1",
        puntoVenta: "Punto 1",
        fecha: "2024-01-01",
        estado: "cerrado",
        montoRecaudado: "100",
        modo: "estricto",
        items: [
          { id: "item-1", distribucionId: "dist-1", variantId: "variant-1", cantidadAsignada: "100", cantidadVendida: "75", unidad: "kg" },
        ],
      } as DistribucionWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, distribucion, "activo", "cerrado");

      expect(mockVariantRepo.adjustInventory).toHaveBeenCalledWith(ctx, "variant-1", 25);
    });

    it("skips items with no sobrante", async () => {
      const distribucion: DistribucionWithItems = {
        id: "dist-1",
        vendedorId: "vendedor-1",
        puntoVenta: "Punto 1",
        fecha: "2024-01-01",
        estado: "cerrado",
        montoRecaudado: "100",
        modo: "estricto",
        items: [
          { id: "item-1", distribucionId: "dist-1", variantId: "variant-1", cantidadAsignada: "10", cantidadVendida: "10", unidad: "kg" },
          { id: "item-2", distribucionId: "dist-1", variantId: "variant-2", cantidadAsignada: "5", cantidadVendida: "3", unidad: "kg" },
        ],
      } as DistribucionWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, distribucion, "activo", "cerrado");

      expect(mockVariantRepo.adjustInventory).toHaveBeenCalledTimes(1);
      expect(mockVariantRepo.adjustInventory).toHaveBeenCalledWith(ctx, "variant-2", 2);
    });
  });

  describe("en_ruta → cerrado (close from route)", () => {
    it("returns sobrante when closing from en_ruta", async () => {
      const distribucion: DistribucionWithItems = {
        id: "dist-1",
        vendedorId: "vendedor-1",
        puntoVenta: "Punto 1",
        fecha: "2024-01-01",
        estado: "cerrado",
        montoRecaudado: "100",
        modo: "estricto",
        items: [
          { id: "item-1", distribucionId: "dist-1", variantId: "variant-1", cantidadAsignada: "20", cantidadVendida: "15", unidad: "kg" },
        ],
      } as DistribucionWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, distribucion, "en_ruta", "cerrado");

      expect(mockVariantRepo.adjustInventory).toHaveBeenCalledTimes(1);
      expect(mockVariantRepo.adjustInventory).toHaveBeenCalledWith(ctx, "variant-1", 5);
    });
  });

  describe("activo → en_ruta", () => {
    it("does not modify inventory", async () => {
      const distribucion: DistribucionWithItems = {
        id: "dist-1",
        vendedorId: "vendedor-1",
        puntoVenta: "Punto 1",
        fecha: "2024-01-01",
        estado: "en_ruta",
        montoRecaudado: "0",
        modo: "estricto",
        items: [
          { id: "item-1", distribucionId: "dist-1", variantId: "variant-1", cantidadAsignada: "10", cantidadVendida: "0", unidad: "kg" },
        ],
      } as DistribucionWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, distribucion, "activo", "en_ruta");

      expect(mockVariantRepo.adjustInventory).not.toHaveBeenCalled();
    });
  });
});