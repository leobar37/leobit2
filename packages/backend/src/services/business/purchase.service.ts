import type { PurchaseRepository, PurchaseWithItems } from "../repository/purchase.repository";
import type { InventoryRepository } from "../repository/inventory.repository";
import type { SupplierRepository } from "../repository/supplier.repository";
import type { ProductVariantRepository } from "../repository/product-variant.repository";
import type { RequestContext } from "../../context/request-context";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../errors";
import type { Purchase, NewPurchaseItem } from "../../db/schema";

export interface CreatePurchaseItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseInput {
  supplierId: string;
  purchaseDate: string;
  invoiceNumber?: string;
  notes?: string;
  items: CreatePurchaseItemInput[];
}

export class PurchaseService {
  constructor(
    private repository: PurchaseRepository,
    private inventoryRepo: InventoryRepository,
    private supplierRepo: SupplierRepository,
    private variantRepo: ProductVariantRepository
  ) {}

  async getPurchases(
    ctx: RequestContext,
    filters?: {
      supplierId?: string;
      status?: "pending" | "received" | "cancelled";
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    if (!ctx.hasPermission("purchases.read")) {
      throw new ForbiddenError("No tiene permisos para ver compras");
    }

    return this.repository.findMany(ctx, filters);
  }

  async getPurchase(ctx: RequestContext, id: string): Promise<PurchaseWithItems> {
    if (!ctx.hasPermission("purchases.read")) {
      throw new ForbiddenError("No tiene permisos para ver compras");
    }

    const purchase = await this.repository.findById(ctx, id);
    if (!purchase) {
      throw new NotFoundError("Compra");
    }

    return purchase;
  }

  async createPurchase(
    ctx: RequestContext,
    data: CreatePurchaseInput
  ): Promise<PurchaseWithItems> {
    if (!ctx.hasPermission("purchases.write")) {
      throw new ForbiddenError("No tiene permisos para crear compras");
    }

    if (!data.items || data.items.length === 0) {
      throw new ValidationError("La compra debe tener al menos un ítem");
    }

    const supplier = await this.supplierRepo.findById(ctx, data.supplierId);
    if (!supplier) {
      throw new NotFoundError("Proveedor");
    }

    let totalAmount = 0;
    const validatedItems: Omit<NewPurchaseItem, "purchaseId" | "id" | "createdAt">[] = [];

    for (const item of data.items) {
      if (item.quantity <= 0) {
        throw new ValidationError("La cantidad debe ser mayor a 0");
      }
      if (item.unitCost < 0) {
        throw new ValidationError("El costo unitario no puede ser negativo");
      }

      const totalCost = item.quantity * item.unitCost;
      totalAmount += totalCost;

      validatedItems.push({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity.toString(),
        unitCost: item.unitCost.toString(),
        totalCost: totalCost.toString(),
      });
    }

    const purchase = await this.repository.create(
      ctx,
      {
        supplierId: data.supplierId,
        purchaseDate: data.purchaseDate,
        totalAmount: totalAmount.toString(),
        status: "received",
        invoiceNumber: data.invoiceNumber || null,
        notes: data.notes || null,
      },
      validatedItems
    );

    for (const item of data.items) {
      const existingInventory = await this.inventoryRepo.findByProductId(
        ctx,
        item.productId
      );

      if (existingInventory) {
        const currentQty = parseFloat(existingInventory.quantity);
        const newQty = currentQty + item.quantity;
        await this.inventoryRepo.updateQuantity(
          ctx,
          item.productId,
          newQty.toString()
        );
      } else {
        await this.inventoryRepo.create(ctx, {
          productId: item.productId,
          quantity: item.quantity.toString(),
        });
      }

      if (item.variantId) {
        await this.updateVariantInventory(ctx, item.variantId, item.quantity);
      }
    }

    return purchase;
  }

  async updatePurchaseStatus(
    ctx: RequestContext,
    id: string,
    status: "pending" | "received" | "cancelled"
  ): Promise<Purchase> {
    if (!ctx.hasPermission("purchases.write")) {
      throw new ForbiddenError("No tiene permisos para modificar compras");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Compra");
    }

    if (existing.status === "cancelled") {
      throw new ValidationError("No se puede modificar una compra cancelada");
    }

    if (status === "cancelled" && existing.status === "received") {
      for (const item of existing.items) {
        const existingInventory = await this.inventoryRepo.findByProductId(
          ctx,
          item.productId
        );

        if (existingInventory) {
          const currentQty = parseFloat(existingInventory.quantity);
          const itemQty = parseFloat(item.quantity);
          const newQty = Math.max(0, currentQty - itemQty);
          await this.inventoryRepo.updateQuantity(
            ctx,
            item.productId,
            newQty.toString()
          );
        }
      }
    }

    const updated = await this.repository.updateStatus(ctx, id, status);
    if (!updated) {
      throw new NotFoundError("Compra");
    }

    return updated;
  }

  async deletePurchase(ctx: RequestContext, id: string): Promise<void> {
    if (!ctx.isAdmin()) {
      throw new ForbiddenError("Solo los administradores pueden eliminar compras");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Compra");
    }

    if (existing.status === "received") {
      throw new ValidationError(
        "No se puede eliminar una compra recibida. Cancele primero."
      );
    }

    await this.repository.delete(ctx, id);
  }

  async countPurchases(ctx: RequestContext): Promise<number> {
    if (!ctx.hasPermission("purchases.read")) {
      throw new ForbiddenError("No tiene permisos para ver compras");
    }

    return this.repository.count(ctx);
  }

  private async updateVariantInventory(
    ctx: RequestContext,
    variantId: string,
    quantity: number
  ): Promise<void> {
    const existingInventory = await this.variantRepo.getInventory(ctx, variantId);

    if (existingInventory) {
      const currentQty = parseFloat(existingInventory.quantity);
      const newQty = currentQty + quantity;
      await this.variantRepo.updateInventory(ctx, variantId, newQty.toString());
    } else {
      await this.variantRepo.createInventory(ctx, { variantId, quantity: quantity.toString() });
    }
  }
}
