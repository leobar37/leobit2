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
    it("does NOT reserve stock (simplified inventory - no stock management on create)", async () => {
      const distribucion: DistribucionWithItems = {
        id: "dist-1",
        vendedorId: "vendedor-1",
        puntoVenta: "Punto 1",
        fecha: "2024-01-01",
        estado: "activo",
        montoRecaudado: "0",
        items: [
          { id: "item-1", distribucionId: "dist-1", variantId: "variant-1", cantidadAsignada: "10", cantidadVendida: "0", unidad: "kg" },
          { id: "item-2", distribucionId: "dist-1", variantId: "variant-2", cantidadAsignada: "5", cantidadVendida: "0", unidad: "kg" },
        ],
      } as DistribucionWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, distribucion, null, "activo");

      // Stock is no longer managed through state machine - products registered at close time
      expect(mockVariantRepo.adjustInventory).not.toHaveBeenCalled();
    });
  });

  describe("activo → cerrado (close distribution)", () => {
    it("does NOT return stock (simplified inventory - no stock management on close)", async () => {
      const distribucion: DistribucionWithItems = {
        id: "dist-1",
        vendedorId: "vendedor-1",
        puntoVenta: "Punto 1",
        fecha: "2024-01-01",
        estado: "cerrado",
        montoRecaudado: "100",
        items: [
          { id: "item-1", distribucionId: "dist-1", variantId: "variant-1", cantidadAsignada: "10", cantidadVendida: "7", unidad: "kg" },
          { id: "item-2", distribucionId: "dist-1", variantId: "variant-2", cantidadAsignada: "5", cantidadVendida: "3", unidad: "kg" },
        ],
      } as DistribucionWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, distribucion, "activo", "cerrado");

      // Stock is no longer managed through state machine
      expect(mockVariantRepo.adjustInventory).not.toHaveBeenCalled();
    });
  });

  describe("en_ruta → cerrado (close from route)", () => {
    it("does NOT return stock when closing from en_ruta", async () => {
      const distribucion: DistribucionWithItems = {
        id: "dist-1",
        vendedorId: "vendedor-1",
        puntoVenta: "Punto 1",
        fecha: "2024-01-01",
        estado: "cerrado",
        montoRecaudado: "100",
        items: [
          { id: "item-1", distribucionId: "dist-1", variantId: "variant-1", cantidadAsignada: "20", cantidadVendida: "15", unidad: "kg" },
        ],
      } as DistribucionWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, distribucion, "en_ruta", "cerrado");

      // Stock is no longer managed through state machine
      expect(mockVariantRepo.adjustInventory).not.toHaveBeenCalled();
    });
  });

  describe("activo → en_ruta", () => {
    it("does not modify inventory (unchanged behavior)", async () => {
      const distribucion: DistribucionWithItems = {
        id: "dist-1",
        vendedorId: "vendedor-1",
        puntoVenta: "Punto 1",
        fecha: "2024-01-01",
        estado: "en_ruta",
        montoRecaudado: "0",
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
