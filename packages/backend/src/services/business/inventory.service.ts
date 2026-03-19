import type { InventoryRepository } from "../repository/inventory.repository";
import type { RequestContext } from "../../context/request-context";
import { ForbiddenError } from "../../errors";

/**
 * @deprecated InventoryService is deprecated
 * Use ProductVariantRepository for variant inventory operations
 * This service is kept only for getMissingInventoryReport
 */
export class InventoryService {
  constructor(private repository: InventoryRepository) {}

  /**
   * @deprecated Use ProductVariantRepository.getInventory() instead
   */
  async getInventory(_ctx: RequestContext): Promise<unknown[]> {
    throw new Error("InventoryService.getInventory is deprecated. Use ProductVariantRepository instead.");
  }

  /**
   * @deprecated Use ProductVariantRepository.getInventory() with variantId instead
   */
  async getInventoryItem(_ctx: RequestContext, _productId: string): Promise<unknown> {
    throw new Error("InventoryService.getInventoryItem is deprecated. Use ProductVariantRepository instead.");
  }

  /**
   * @deprecated Inventory is now managed through purchases
   */
  async updateStock(_ctx: RequestContext, _productId: string, _quantity: number): Promise<unknown> {
    throw new Error("InventoryService.updateStock is deprecated. Inventory is now managed through purchases.");
  }

  /**
   * @deprecated Use ProductVariantRepository.getInventory() and check quantity instead
   */
  async validateStockAvailability(
    _ctx: RequestContext,
    _productId: string,
    _requestedQty: number
  ): Promise<{ available: boolean; currentStock: number }> {
    throw new Error("InventoryService.validateStockAvailability is deprecated. Use ProductVariantRepository instead.");
  }

  /**
   * @deprecated Inventory items are managed through purchases
   */
  async deleteInventoryItem(_ctx: RequestContext, _id: string): Promise<void> {
    throw new Error("InventoryService.deleteInventoryItem is deprecated. Inventory is managed through purchases.");
  }

  /**
   * Get missing inventory report - only method still in use
   */
  async getMissingInventoryReport(
    ctx: RequestContext,
    filters?: { startDate?: Date; endDate?: Date }
  ): Promise<
    Array<{
      productId: string;
      productName: string;
      variantId: string | null;
      variantName: string | null;
      totalSold: string;
      currentStock: string;
      needed: string;
    }>
  > {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver inventario");
    }
    if (!ctx.hasPermission("purchases.read")) {
      throw new ForbiddenError("No tiene permisos para ver compras");
    }

    return this.repository.getMissingInventoryReport(ctx, filters);
  }
}
