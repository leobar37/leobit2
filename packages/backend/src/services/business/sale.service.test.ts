import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaleService } from "./sale.service";
import { db } from "../../lib/db";
import { ValidationError, NotFoundError } from "../../errors";

vi.mock("../../lib/db", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

describe("SaleService - Item Operations", () => {
  const transactionMock = db.transaction as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    transactionMock.mockReset();
  });

  describe("getSaleItems", () => {
    it("returns items for a valid sale", async () => {
      const mockItems = [
        { id: "item-1", productName: "Pollo", subtotal: "50.00" },
        { id: "item-2", productName: "Huevos", subtotal: "25.00" },
      ];

      const repository = {
        findById: vi.fn().mockResolvedValue({ id: "sale-1", status: "draft" }),
        findSaleItems: vi.fn().mockResolvedValue(mockItems),
      };

      const service = new SaleService(
        repository as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never
      );

      const ctx = { businessId: "biz-1", businessUserId: "user-1" };
      const result = await service.getSaleItems(ctx as never, "sale-1");

      expect(result).toEqual(mockItems);
      expect(repository.findSaleItems).toHaveBeenCalledWith(ctx, "sale-1");
    });

    it("throws NotFoundError when sale does not exist", async () => {
      const repository = {
        findById: vi.fn().mockResolvedValue(undefined),
      };

      const service = new SaleService(
        repository as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never
      );

      const ctx = { businessId: "biz-1", businessUserId: "user-1" };

      await expect(service.getSaleItems(ctx as never, "invalid-id")).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("addItem", () => {
    it("adds item to draft sale and recalculates total", async () => {
      const tx = {
        execute: vi.fn().mockResolvedValue([{ txid: "12345" }]),
      };
      transactionMock.mockImplementation(async (callback) => callback(tx as never));

      const mockItem = { id: "item-1", productName: "Pollo", subtotal: "50.00" };
      const existingItems = [{ id: "item-0", subtotal: "30.00" }];

      const repository = {
        findById: vi.fn().mockResolvedValue({ id: "sale-1", status: "draft" }),
        addItem: vi.fn().mockResolvedValue(mockItem),
        findSaleItems: vi.fn().mockResolvedValue([...existingItems, mockItem]),
        updateTotalAmount: vi.fn().mockResolvedValue(undefined),
      };

      const service = new SaleService(
        repository as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never
      );

      const ctx = { businessId: "biz-1", businessUserId: "user-1" };
      const result = await service.addItem(ctx as never, "sale-1", {
        productId: "prod-1",
        productName: "Pollo",
        variantId: "var-1",
        variantName: "Entero",
        quantity: 2,
        unitPrice: 25,
        subtotal: 50,
      });

      expect(result.data).toEqual(mockItem);
      expect(repository.addItem).toHaveBeenCalled();
      expect(repository.updateTotalAmount).toHaveBeenCalledWith(ctx, "sale-1", "80.00", tx);
    });

    it("throws ValidationError when sale is not in draft status", async () => {
      const repository = {
        findById: vi.fn().mockResolvedValue({ id: "sale-1", status: "active" }),
      };

      const service = new SaleService(
        repository as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never
      );

      const ctx = { businessId: "biz-1", businessUserId: "user-1" };

      await expect(
        service.addItem(ctx as never, "sale-1", {
          productId: "prod-1",
          productName: "Pollo",
          variantId: "var-1",
          variantName: "Entero",
          subtotal: 50,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("removeItem", () => {
    it("removes item from draft sale and recalculates total", async () => {
      const tx = {
        execute: vi.fn().mockResolvedValue([{ txid: "12345" }]),
      };
      transactionMock.mockImplementation(async (callback) => callback(tx as never));

      const remainingItems = [{ id: "item-2", subtotal: "25.00" }];

      const repository = {
        findById: vi.fn().mockResolvedValue({ id: "sale-1", status: "draft" }),
        findItemById: vi.fn().mockResolvedValue({ id: "item-1", subtotal: "50.00" }),
        deleteItem: vi.fn().mockResolvedValue(undefined),
        findSaleItems: vi.fn().mockResolvedValue(remainingItems),
        updateTotalAmount: vi.fn().mockResolvedValue(undefined),
      };

      const service = new SaleService(
        repository as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never
      );

      const ctx = { businessId: "biz-1", businessUserId: "user-1" };
      const result = await service.removeItem(ctx as never, "sale-1", "item-1");

      expect(repository.deleteItem).toHaveBeenCalledWith(ctx, "sale-1", "item-1", tx);
      expect(repository.updateTotalAmount).toHaveBeenCalledWith(ctx, "sale-1", "25.00", tx);
    });

    it("throws NotFoundError when item does not exist", async () => {
      const repository = {
        findById: vi.fn().mockResolvedValue({ id: "sale-1", status: "draft" }),
        findItemById: vi.fn().mockResolvedValue(undefined),
      };

      const service = new SaleService(
        repository as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never
      );

      const ctx = { businessId: "biz-1", businessUserId: "user-1" };

      await expect(service.removeItem(ctx as never, "sale-1", "invalid-item")).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("updateItem", () => {
    it("updates item and recalculates total when subtotal changes", async () => {
      const tx = {
        execute: vi.fn().mockResolvedValue([{ txid: "12345" }]),
      };
      transactionMock.mockImplementation(async (callback) => callback(tx as never));

      const updatedItem = { id: "item-1", productName: "Pollo", subtotal: "60.00" };
      const allItems = [updatedItem, { id: "item-2", subtotal: "25.00" }];

      const repository = {
        findById: vi.fn().mockResolvedValue({ id: "sale-1", status: "draft" }),
        findItemById: vi.fn().mockResolvedValue({ id: "item-1", subtotal: "50.00" }),
        updateItem: vi.fn().mockResolvedValue(updatedItem),
        findSaleItems: vi.fn().mockResolvedValue(allItems),
        updateTotalAmount: vi.fn().mockResolvedValue(undefined),
      };

      const service = new SaleService(
        repository as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never
      );

      const ctx = { businessId: "biz-1", businessUserId: "user-1" };
      const result = await service.updateItem(ctx as never, "sale-1", "item-1", {
        quantity: 3,
        unitPrice: 20,
        subtotal: 60,
      });

      expect(result.data).toEqual(updatedItem);
      expect(repository.updateTotalAmount).toHaveBeenCalledWith(ctx, "sale-1", "85.00", tx);
    });

    it("allows updates to confirmed pre_orders", async () => {
      const tx = {
        execute: vi.fn().mockResolvedValue([{ txid: "12345" }]),
      };
      transactionMock.mockImplementation(async (callback) => callback(tx as never));

      const repository = {
        findById: vi.fn().mockResolvedValue({ id: "sale-1", status: "confirmed", type: "pre_order" }),
        findItemById: vi.fn().mockResolvedValue({ id: "item-1", subtotal: "50.00" }),
        updateItem: vi.fn().mockResolvedValue({ id: "item-1", subtotal: "50.00" }),
        findSaleItems: vi.fn().mockResolvedValue([{ id: "item-1", subtotal: "50.00" }]),
      };

      const service = new SaleService(
        repository as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never
      );

      const ctx = { businessId: "biz-1", businessUserId: "user-1" };

      // Should not throw for confirmed pre_orders
      const result = await service.updateItem(ctx as never, "sale-1", "item-1", {
        orderedQuantity: 5,
      });

      expect(result.data).toBeDefined();
      expect(repository.updateItem).toHaveBeenCalled();
    });
  });
});
