// @ts-nocheck - Backend file
import type { PurchaseRepository, PurchaseWithItems } from "../repository/purchase.repository";
import type { SupplierRepository } from "../repository/supplier.repository";
import type { ProductVariantRepository } from "../repository/product-variant.repository";
import type { ProductUnitRepository } from "../repository/product-unit.repository";
import type { FileRepository } from "../repository/file.repository";
import type { RequestContext } from "../../context/request-context";
import { db } from "../../lib/db";
import { getTxid, type MutationResult } from "../../lib/txid";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../errors";
import type { Purchase, NewPurchaseItem } from "../../db/schema";

export interface CreatePurchaseItemInput {
  productId: string;
  variantId?: string;
  unitId?: string;
  packs?: number;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseInput {
  supplierId: string;
  purchaseDate: string;
  invoiceNumber?: string;
  receiptImageId?: string;
  notes?: string;
  status?: "draft" | "pending" | "received" | "cancelled";
  items: CreatePurchaseItemInput[];
}

export class PurchaseService {
  constructor(
    private repository: PurchaseRepository,
    private supplierRepo: SupplierRepository,
    private variantRepo: ProductVariantRepository,
    private unitRepo: ProductUnitRepository,
    private fileRepo: FileRepository
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
  ): Promise<MutationResult<PurchaseWithItems>> {
    if (!ctx.hasPermission("purchases.write")) {
      throw new ForbiddenError("No tiene permisos para crear compras");
    }

    const isDraft = data.status === "draft";

    if (!isDraft && (!data.items || data.items.length === 0)) {
      throw new ValidationError("La compra debe tener al menos un ítem");
    }

    if (!isDraft || data.supplierId) {
      const supplier = await this.supplierRepo.findById(ctx, data.supplierId);
      if (!supplier) {
        throw new NotFoundError("Proveedor");
      }
    }

    if (data.receiptImageId) {
      const file = await this.fileRepo.findById(ctx, data.receiptImageId);
      if (!file) {
        throw new NotFoundError("Imagen de comprobante");
      }
    }

    let totalAmount = 0;
    const validatedItems: Omit<NewPurchaseItem, "purchaseId" | "id" | "createdAt">[] = [];

    for (const item of data.items || []) {
      let finalQuantity: number;
      let finalVariantId: string | null = item.variantId || null;
      let finalUnitCost = item.unitCost;

      if (item.unitId) {
        const unit = await this.unitRepo.findById(ctx, item.unitId);
        if (!unit) {
          throw new NotFoundError("Unidad configurada");
        }

        finalQuantity = (item.packs || 1) * parseFloat(unit.baseUnitQuantity);
        finalVariantId = unit.variantId;
        finalUnitCost = item.unitCost / parseFloat(unit.baseUnitQuantity);
      } else {
        finalQuantity = item.quantity;
      }

      if (finalQuantity <= 0) {
        throw new ValidationError("La cantidad debe ser mayor a 0");
      }
      if (finalUnitCost < 0) {
        throw new ValidationError("El costo unitario no puede ser negativo");
      }

      const totalCost = finalQuantity * finalUnitCost;
      totalAmount += totalCost;

      validatedItems.push({
        businessId: ctx.businessId,
        productId: item.productId,
        variantId: finalVariantId,
        quantity: finalQuantity.toString(),
        unitCost: finalUnitCost.toString(),
        totalCost: totalCost.toString(),
      });
    }

    const purchase = await this.repository.create(
      ctx,
      {
        supplierId: data.supplierId,
        purchaseDate: data.purchaseDate,
        totalAmount: totalAmount.toString(),
        status: data.status ?? "pending",
        invoiceNumber: data.invoiceNumber || null,
        receiptImageId: data.receiptImageId || null,
        notes: data.notes || null,
      },
      validatedItems
    );

    // Note: Inventory is updated when purchase status changes to "received"
    // via state machine transition, not at creation time

    return {
      data: purchase,
      txid: Date.now(),
    };
  }

  async confirmPurchase(
    ctx: RequestContext,
    id: string
  ): Promise<MutationResult<PurchaseWithItems>> {
    if (!ctx.hasPermission("purchases.write")) {
      throw new ForbiddenError("No tiene permisos para modificar compras");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Compra");
    }

    if (existing.status !== "draft") {
      throw new ValidationError("Solo las compras en borrador pueden ser confirmadas");
    }

    if (!existing.supplierId) {
      throw new ValidationError("Se requiere un proveedor para confirmar la compra");
    }

    if (!existing.items || existing.items.length === 0) {
      throw new ValidationError("La compra debe tener al menos un ítem para confirmar");
    }

    const updated = await this.repository.updateStatus(ctx, id, "pending");
    if (!updated) {
      throw new NotFoundError("Compra");
    }

    return {
      data: { ...existing, status: "pending" },
      txid: Date.now(),
    };
  }

  async updatePurchaseStatus(
    ctx: RequestContext,
    id: string,
    status: "pending" | "received" | "cancelled"
  ): Promise<MutationResult<Purchase>> {
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

    const previousStatus = existing.status as "draft" | "pending" | "received" | "cancelled";

    return db.transaction(async (tx) => {
      if (previousStatus !== status) {
        await this.applyInventoryTransition(ctx, existing, previousStatus, status, tx);
      }

      const updated = await this.repository.updateStatus(ctx, id, status, tx);
      if (!updated) {
        throw new NotFoundError("Compra");
      }

      return {
        data: updated,
        txid: await getTxid(tx),
      };
    });
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

  private async applyInventoryTransition(
    ctx: RequestContext,
    purchase: PurchaseWithItems,
    previousStatus: "draft" | "pending" | "received" | "cancelled",
    nextStatus: "pending" | "received" | "cancelled",
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
  ): Promise<void> {
    const direction = previousStatus === "pending" && nextStatus === "received"
      ? 1
      : previousStatus === "received" && nextStatus === "cancelled"
        ? -1
        : 0;

    if (direction === 0) {
      return;
    }

    for (const item of purchase.items) {
      const quantity = Number.parseFloat(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        continue;
      }

      const variantId = item.variantId || item.productId;
      const currentInventory = await this.variantRepo.getInventory(ctx, variantId);
      if (currentInventory) {
        const currentQty = Number.parseFloat(currentInventory.quantity);
        const nextQty = Math.max(0, currentQty + quantity * direction);
        await this.variantRepo.updateInventory(ctx, variantId, nextQty.toString(), tx);
      } else if (direction > 0) {
        await this.variantRepo.createInventory(ctx, { variantId, quantity: quantity.toString() }, tx);
      }
    }
  }
}
