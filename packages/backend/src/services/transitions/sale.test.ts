import { describe, expect, it, vi, beforeEach } from "vitest";
import { createMachine, StateMachineRegistry } from "../../lib/state-machine";
import { setupSaleTransitions } from "./sale";
import type { SaleWithItems, SaleState } from "./sale";

describe("setupSaleTransitions", () => {
  let machine: ReturnType<typeof createMachine<SaleWithItems, SaleState>>;
  let mockDeps: {
    paymentRepository: {
      createReversal: ReturnType<typeof vi.fn>;
    };
    distribucionItemRepository: {
      findByDistribucionId: ReturnType<typeof vi.fn>;
      updateVendido: ReturnType<typeof vi.fn>;
    };
    saleRepository: {
      findSaleItems: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    StateMachineRegistry.getAll().clear();
    
    mockDeps = {
      paymentRepository: {
        createReversal: vi.fn().mockResolvedValue(undefined),
      },
      distribucionItemRepository: {
        findByDistribucionId: vi.fn().mockResolvedValue([]),
        updateVendido: vi.fn().mockResolvedValue(undefined),
      },
      saleRepository: {
        findSaleItems: vi.fn().mockResolvedValue([]),
      },
    };

    machine = createMachine<SaleWithItems, SaleState>({
      name: "sale",
      initialState: "draft",
      states: ["draft", "confirmed", "active", "delivered", "cancelled"],
    });

    setupSaleTransitions(machine, mockDeps);
  });

  describe("draft → cancelled", () => {
    it("does not create payment reversal", async () => {
      const sale: SaleWithItems = {
        id: "sale-1",
        status: "cancelled",
        amountPaid: "0",
        customerId: null,
        distribucionId: null,
        items: [],
      } as SaleWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, sale, "draft", "cancelled");

      expect(mockDeps.paymentRepository.createReversal).not.toHaveBeenCalled();
    });

    it("does not update distribucion items", async () => {
      const sale: SaleWithItems = {
        id: "sale-1",
        status: "cancelled",
        amountPaid: "0",
        customerId: null,
        distribucionId: null,
        items: [],
      } as SaleWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, sale, "draft", "cancelled");

      expect(mockDeps.distribucionItemRepository.findByDistribucionId).not.toHaveBeenCalled();
      expect(mockDeps.distribucionItemRepository.updateVendido).not.toHaveBeenCalled();
    });
  });

  describe("active → cancelled", () => {
    it("creates payment reversal when refund amount provided", async () => {
      const sale: SaleWithItems = {
        id: "sale-1",
        status: "cancelled",
        amountPaid: "100",
        customerId: "customer-1",
        distribucionId: null,
        items: [],
        _refundData: {
          refundAmount: 100,
          refundMethod: "efectivo",
          refundReference: "REF-001",
        },
      } as SaleWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, sale, "active", "cancelled");

      expect(mockDeps.paymentRepository.createReversal).toHaveBeenCalledWith(
        ctx,
        {
          customerId: "customer-1",
          amount: "-100.00",
          paymentMethod: "efectivo",
          referenceNumber: "REF-001",
          notes: "Reembolso por cancelación de venta #sale-1",
          relatedSaleId: "sale-1",
        },
        undefined
      );
    });

    it("does not create reversal when no refund amount", async () => {
      const sale: SaleWithItems = {
        id: "sale-1",
        status: "cancelled",
        amountPaid: "100",
        customerId: "customer-1",
        distribucionId: null,
        items: [],
        _refundData: {},
      } as SaleWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, sale, "active", "cancelled");

      expect(mockDeps.paymentRepository.createReversal).not.toHaveBeenCalled();
    });

    it("returns inventory to distribucion", async () => {
      mockDeps.saleRepository.findSaleItems.mockResolvedValue([
        { id: "item-1", variantId: "variant-1", quantity: "10" },
        { id: "item-2", variantId: "variant-2", quantity: "5" },
      ]);
      mockDeps.distribucionItemRepository.findByDistribucionId.mockResolvedValue([
        { id: "dist-item-1", variantId: "variant-1", cantidadVendida: "15" },
        { id: "dist-item-2", variantId: "variant-2", cantidadVendida: "8" },
      ]);

      const sale: SaleWithItems = {
        id: "sale-1",
        status: "cancelled",
        amountPaid: "0",
        customerId: null,
        distribucionId: "dist-1",
        items: [],
        _refundData: {},
      } as SaleWithItems;

      const ctx = { businessId: "biz-1" } as any;
      const tx = { id: "tx-1" };
      await machine.executeTransition(ctx, sale, "active", "cancelled", tx);

      expect(mockDeps.distribucionItemRepository.updateVendido).toHaveBeenCalledTimes(2);
      expect(mockDeps.distribucionItemRepository.updateVendido).toHaveBeenCalledWith(
        ctx, "dist-item-1", "5", tx
      ); // 15 - 10 = 5
      expect(mockDeps.distribucionItemRepository.updateVendido).toHaveBeenCalledWith(
        ctx, "dist-item-2", "3", tx
      ); // 8 - 5 = 3
    });

    it("handles items not found in distribucion", async () => {
      mockDeps.saleRepository.findSaleItems.mockResolvedValue([
        { id: "item-1", variantId: "variant-1", quantity: "10" },
        { id: "item-2", variantId: "variant-not-in-dist", quantity: "5" },
      ]);
      mockDeps.distribucionItemRepository.findByDistribucionId.mockResolvedValue([
        { id: "dist-item-1", variantId: "variant-1", cantidadVendida: "15" },
      ]);

      const sale: SaleWithItems = {
        id: "sale-1",
        status: "cancelled",
        amountPaid: "0",
        customerId: null,
        distribucionId: "dist-1",
        items: [],
        _refundData: {},
      } as SaleWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, sale, "active", "cancelled");

      expect(mockDeps.distribucionItemRepository.updateVendido).toHaveBeenCalledTimes(1);
      expect(mockDeps.distribucionItemRepository.updateVendido).toHaveBeenCalledWith(
        ctx, "dist-item-1", "5", undefined
      );
    });

    it("never goes below zero when returning inventory", async () => {
      mockDeps.saleRepository.findSaleItems.mockResolvedValue([
        { id: "item-1", variantId: "variant-1", quantity: "20" },
      ]);
      mockDeps.distribucionItemRepository.findByDistribucionId.mockResolvedValue([
        { id: "dist-item-1", variantId: "variant-1", cantidadVendida: "15" },
      ]);

      const sale: SaleWithItems = {
        id: "sale-1",
        status: "cancelled",
        amountPaid: "0",
        customerId: null,
        distribucionId: "dist-1",
        items: [],
        _refundData: {},
      } as SaleWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, sale, "active", "cancelled");

      expect(mockDeps.distribucionItemRepository.updateVendido).toHaveBeenCalledWith(
        ctx, "dist-item-1", "0", undefined
      ); // Math.max(15 - 20, 0) = 0
    });
  });

  describe("confirmed → delivered", () => {
    it("does not create payment reversal", async () => {
      const sale: SaleWithItems = {
        id: "sale-1",
        status: "delivered",
        amountPaid: "100",
        customerId: "customer-1",
        distribucionId: null,
        items: [],
      } as SaleWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, sale, "confirmed", "delivered");

      expect(mockDeps.paymentRepository.createReversal).not.toHaveBeenCalled();
    });

    it("does not update distribucion", async () => {
      const sale: SaleWithItems = {
        id: "sale-1",
        status: "delivered",
        amountPaid: "100",
        customerId: "customer-1",
        distribucionId: "dist-1",
        items: [],
      } as SaleWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, sale, "confirmed", "delivered");

      expect(mockDeps.distribucionItemRepository.findByDistribucionId).not.toHaveBeenCalled();
    });
  });
});