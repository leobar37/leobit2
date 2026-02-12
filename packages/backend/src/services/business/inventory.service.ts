import type { InventoryRepository } from "../repository/inventory.repository";
import type { RequestContext } from "../../context/request-context";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../errors";
import type { Inventory } from "../../db/schema";

export class InventoryService {
  constructor(private repository: InventoryRepository) {}

  async getInventory(ctx: RequestContext): Promise<Inventory[]> {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver inventario");
    }

    return this.repository.findMany(ctx);
  }

  async getInventoryItem(
    ctx: RequestContext,
    productId: string
  ): Promise<Inventory> {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver inventario");
    }

    const item = await this.repository.findByProductId(ctx, productId);
    if (!item) {
      throw new NotFoundError("Item de inventario");
    }

    return item;
  }

  async updateStock(
    ctx: RequestContext,
    productId: string,
    quantity: number
  ): Promise<Inventory> {
    if (!ctx.hasPermission("inventory.write")) {
      throw new ForbiddenError("No tiene permisos para modificar inventario");
    }

    if (quantity < 0) {
      throw new ValidationError("La cantidad no puede ser negativa");
    }

    const item = await this.repository.updateQuantity(
      ctx,
      productId,
      quantity.toString()
    );

    if (!item) {
      throw new NotFoundError("Item de inventario");
    }

    return item;
  }

  async validateStockAvailability(
    ctx: RequestContext,
    productId: string,
    requestedQty: number
  ): Promise<{ available: boolean; currentStock: number }> {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver inventario");
    }

    const item = await this.repository.findByProductId(ctx, productId);
    const currentStock = item ? parseFloat(item.quantity) : 0;

    return {
      available: currentStock >= requestedQty,
      currentStock,
    };
  }

  async deleteInventoryItem(ctx: RequestContext, id: string): Promise<void> {
    if (!ctx.hasPermission("inventory.write")) {
      throw new ForbiddenError("No tiene permisos para eliminar inventario");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Item de inventario");
    }

    await this.repository.delete(ctx, id);
  }
}
