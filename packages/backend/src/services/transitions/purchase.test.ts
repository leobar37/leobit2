import { describe, expect, it, vi, beforeEach } from "vitest";
import { createMachine, StateMachineRegistry } from "../../lib/state-machine";
import { setupPurchaseTransitions } from "./purchase";
import type { PurchaseWithItems, PurchaseState } from "./index";

describe("setupPurchaseTransitions", () => {
  let machine: ReturnType<typeof createMachine<PurchaseWithItems, PurchaseState>>;
  let mockVariantRepo: {
    getInventory: ReturnType<typeof vi.fn>;
    updateInventory: ReturnType<typeof vi.fn>;
    createInventory: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    StateMachineRegistry.getAll().clear();
    
    mockVariantRepo = {
      getInventory: vi.fn(),
      updateInventory: vi.fn().mockResolvedValue(undefined),
      createInventory: vi.fn().mockResolvedValue(undefined),
    };

    machine = createMachine<PurchaseWithItems, PurchaseState>({
      name: "purchase",
      initialState: "pending",
      states: ["pending", "received", "cancelled"],
    });

    setupPurchaseTransitions(machine, mockVariantRepo as any);
  });

  describe("pending → received (receive purchase)", () => {
    it("adds stock when purchase is received", async () => {
      mockVariantRepo.getInventory.mockResolvedValue({ quantity: "100" });
      
      const purchase: PurchaseWithItems = {
        id: "purchase-1",
        supplierId: "supplier-1",
        purchaseDate: "2024-01-01",
        totalAmount: "150",
        status: "received",
        items: [
          { id: "item-1", purchaseId: "purchase-1", productId: "product-1", variantId: "variant-1", quantity: "10", unitCost: "5", totalCost: "50" },
        ],
      } as PurchaseWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, purchase, "pending", "received");

      expect(mockVariantRepo.getInventory).toHaveBeenCalledWith(ctx, "variant-1");
      expect(mockVariantRepo.updateInventory).toHaveBeenCalledWith(ctx, "variant-1", "110");
    });

    it("creates new inventory if not exists", async () => {
      mockVariantRepo.getInventory.mockResolvedValue(null);
      
      const purchase: PurchaseWithItems = {
        id: "purchase-1",
        supplierId: "supplier-1",
        purchaseDate: "2024-01-01",
        totalAmount: "50",
        status: "received",
        items: [
          { id: "item-1", purchaseId: "purchase-1", productId: "product-1", variantId: "variant-1", quantity: "10", unitCost: "5", totalCost: "50" },
        ],
      } as PurchaseWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, purchase, "pending", "received");

      expect(mockVariantRepo.getInventory).toHaveBeenCalledWith(ctx, "variant-1");
      expect(mockVariantRepo.createInventory).toHaveBeenCalledWith(ctx, { variantId: "variant-1", quantity: "10" });
      expect(mockVariantRepo.updateInventory).not.toHaveBeenCalled();
    });

    it("handles multiple items", async () => {
      mockVariantRepo.getInventory
        .mockResolvedValueOnce({ quantity: "100" })
        .mockResolvedValueOnce({ quantity: "50" });
      
      const purchase: PurchaseWithItems = {
        id: "purchase-1",
        supplierId: "supplier-1",
        purchaseDate: "2024-01-01",
        totalAmount: "300",
        status: "received",
        items: [
          { id: "item-1", purchaseId: "purchase-1", productId: "product-1", variantId: "variant-1", quantity: "10", unitCost: "5", totalCost: "50" },
          { id: "item-2", purchaseId: "purchase-1", productId: "product-2", variantId: "variant-2", quantity: "20", unitCost: "10", totalCost: "200" },
        ],
      } as PurchaseWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, purchase, "pending", "received");

      expect(mockVariantRepo.getInventory).toHaveBeenCalledTimes(2);
      expect(mockVariantRepo.updateInventory).toHaveBeenCalledTimes(2);
      expect(mockVariantRepo.updateInventory).toHaveBeenCalledWith(ctx, "variant-1", "110");
      expect(mockVariantRepo.updateInventory).toHaveBeenCalledWith(ctx, "variant-2", "70");
    });

    it("uses productId when variantId is null", async () => {
      mockVariantRepo.getInventory.mockResolvedValue({ quantity: "100" });
      
      const purchase: PurchaseWithItems = {
        id: "purchase-1",
        supplierId: "supplier-1",
        purchaseDate: "2024-01-01",
        totalAmount: "50",
        status: "received",
        items: [
          { id: "item-1", purchaseId: "purchase-1", productId: "product-1", variantId: null, quantity: "10", unitCost: "5", totalCost: "50" },
        ],
      } as PurchaseWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, purchase, "pending", "received");

      expect(mockVariantRepo.getInventory).toHaveBeenCalledWith(ctx, "product-1");
    });

    it("skips items with zero quantity", async () => {
      mockVariantRepo.getInventory.mockResolvedValue({ quantity: "100" });
      
      const purchase: PurchaseWithItems = {
        id: "purchase-1",
        supplierId: "supplier-1",
        purchaseDate: "2024-01-01",
        totalAmount: "50",
        status: "received",
        items: [
          { id: "item-1", purchaseId: "purchase-1", productId: "product-1", variantId: "variant-1", quantity: "0", unitCost: "0", totalCost: "0" },
          { id: "item-2", purchaseId: "purchase-1", productId: "product-2", variantId: "variant-2", quantity: "10", unitCost: "5", totalCost: "50" },
        ],
      } as PurchaseWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, purchase, "pending", "received");

      expect(mockVariantRepo.getInventory).toHaveBeenCalledTimes(1);
      expect(mockVariantRepo.getInventory).toHaveBeenCalledWith(ctx, "variant-2");
    });
  });

  describe("received → cancelled (cancel received purchase)", () => {
    it("removes stock when cancelling received purchase", async () => {
      mockVariantRepo.getInventory.mockResolvedValue({ quantity: "100" });
      
      const purchase: PurchaseWithItems = {
        id: "purchase-1",
        supplierId: "supplier-1",
        purchaseDate: "2024-01-01",
        totalAmount: "50",
        status: "cancelled",
        items: [
          { id: "item-1", purchaseId: "purchase-1", productId: "product-1", variantId: "variant-1", quantity: "10", unitCost: "5", totalCost: "50" },
        ],
      } as PurchaseWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, purchase, "received", "cancelled");

      expect(mockVariantRepo.getInventory).toHaveBeenCalledWith(ctx, "variant-1");
      expect(mockVariantRepo.updateInventory).toHaveBeenCalledWith(ctx, "variant-1", "90");
    });

    it("handles missing inventory gracefully", async () => {
      mockVariantRepo.getInventory.mockResolvedValue(null);
      
      const purchase: PurchaseWithItems = {
        id: "purchase-1",
        supplierId: "supplier-1",
        purchaseDate: "2024-01-01",
        totalAmount: "50",
        status: "cancelled",
        items: [
          { id: "item-1", purchaseId: "purchase-1", productId: "product-1", variantId: "variant-1", quantity: "10", unitCost: "5", totalCost: "50" },
        ],
      } as PurchaseWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, purchase, "received", "cancelled");

      expect(mockVariantRepo.getInventory).toHaveBeenCalledWith(ctx, "variant-1");
      expect(mockVariantRepo.updateInventory).not.toHaveBeenCalled();
    });

    it("never goes negative (Math.max)", async () => {
      mockVariantRepo.getInventory.mockResolvedValue({ quantity: "5" });
      
      const purchase: PurchaseWithItems = {
        id: "purchase-1",
        supplierId: "supplier-1",
        purchaseDate: "2024-01-01",
        totalAmount: "100",
        status: "cancelled",
        items: [
          { id: "item-1", purchaseId: "purchase-1", productId: "product-1", variantId: "variant-1", quantity: "20", unitCost: "5", totalCost: "100" },
        ],
      } as PurchaseWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, purchase, "received", "cancelled");

      expect(mockVariantRepo.updateInventory).toHaveBeenCalledWith(ctx, "variant-1", "0");
    });

    it("handles multiple items", async () => {
      mockVariantRepo.getInventory
        .mockResolvedValueOnce({ quantity: "100" })
        .mockResolvedValueOnce({ quantity: "50" });
      
      const purchase: PurchaseWithItems = {
        id: "purchase-1",
        supplierId: "supplier-1",
        purchaseDate: "2024-01-01",
        totalAmount: "300",
        status: "cancelled",
        items: [
          { id: "item-1", purchaseId: "purchase-1", productId: "product-1", variantId: "variant-1", quantity: "10", unitCost: "5", totalCost: "50" },
          { id: "item-2", purchaseId: "purchase-1", productId: "product-2", variantId: "variant-2", quantity: "20", unitCost: "10", totalCost: "200" },
        ],
      } as PurchaseWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, purchase, "received", "cancelled");

      expect(mockVariantRepo.updateInventory).toHaveBeenCalledTimes(2);
      expect(mockVariantRepo.updateInventory).toHaveBeenCalledWith(ctx, "variant-1", "90");
      expect(mockVariantRepo.updateInventory).toHaveBeenCalledWith(ctx, "variant-2", "30");
    });
  });

  describe("other transitions", () => {
    it("does nothing for pending → cancelled", async () => {
      const purchase: PurchaseWithItems = {
        id: "purchase-1",
        supplierId: "supplier-1",
        purchaseDate: "2024-01-01",
        totalAmount: "50",
        status: "cancelled",
        items: [
          { id: "item-1", purchaseId: "purchase-1", productId: "product-1", variantId: "variant-1", quantity: "10", unitCost: "5", totalCost: "50" },
        ],
      } as PurchaseWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, purchase, "pending", "cancelled");

      expect(mockVariantRepo.getInventory).not.toHaveBeenCalled();
      expect(mockVariantRepo.updateInventory).not.toHaveBeenCalled();
      expect(mockVariantRepo.createInventory).not.toHaveBeenCalled();
    });

    it("does nothing for received → received (same state)", async () => {
      const purchase: PurchaseWithItems = {
        id: "purchase-1",
        supplierId: "supplier-1",
        purchaseDate: "2024-01-01",
        totalAmount: "50",
        status: "received",
        items: [
          { id: "item-1", purchaseId: "purchase-1", productId: "product-1", variantId: "variant-1", quantity: "10", unitCost: "5", totalCost: "50" },
        ],
      } as PurchaseWithItems;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, purchase, "received", "received");

      expect(mockVariantRepo.getInventory).not.toHaveBeenCalled();
    });
  });
});