import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { SaleRepository } from "../../repository/sale.repository";
import { BaseSyncHandler } from "./BaseSyncHandler";
import { saleItemOperationSchema } from "../schemas";

export class SaleItemSyncHandler extends BaseSyncHandler {
  readonly entityType = "sale_items" as const;

  constructor(private saleRepo: SaleRepository) {
    super();
  }

  async validateBusinessRules(
    _ctx: RequestContext,
    payload: Record<string, unknown>,
    operation?: string,
    _tx?: DbTransaction
  ): Promise<void> {
    // SaleItem uses custom validation - keep existing logic but add operation param
    if (!payload.saleId) {
      throw new Error("saleId es requerido");
    }
    if (!payload.productId) {
      throw new Error("productId es requerido");
    }
  }

  async execute(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<SyncHandlerResult> {
    this.logStart(ctx, operation);

    try {
      if (operation.operation === "create") {
        await this.handleCreate(ctx, operation, tx);
      } else if (operation.operation === "update") {
        await this.handleUpdate(ctx, operation, tx);
      } else if (operation.operation === "delete") {
        await this.handleDelete(ctx, operation, tx);
      } else {
        throw new Error(`Acción no soportada: ${operation.operation}`);
      }

      this.logSuccess(ctx, operation);
      return this.createSuccessResult(operation);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logError(ctx, operation, err);
      return this.createErrorResult(operation, err.message);
    }
  }

  private async handleCreate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    if (!tx) {
      throw new Error("Transaction is required for sale item operations");
    }

    const parsed = saleItemOperationSchema.parse(operation.payload);

    // Use registry-aware parent check to avoid DB query when sale was created in same batch
    await this.ensureParentExists(
      parsed.saleId,
      () => this.saleRepo.findById(ctx, parsed.saleId, tx),
      "Venta"
    );

    await this.saleRepo.addItem(ctx, parsed.saleId, {
      id: operation.entityId,
      productId: parsed.productId,
      productName: parsed.productName,
      variantId: parsed.variantId,
      variantName: parsed.variantName,
      quantity: parsed.quantity,
      orderedQuantity: parsed.orderedQuantity,
      unitPrice: parsed.unitPrice,
      unitPriceQuoted: parsed.unitPriceQuoted,
      subtotal: parsed.subtotal,
    }, tx);
  }

  private async handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    if (!tx) {
      throw new Error("Transaction is required for sale item operations");
    }

    const parsed = saleItemOperationSchema.parse(operation.payload);

    // Use registry-aware parent check
    await this.ensureParentExists(
      parsed.saleId,
      () => this.saleRepo.findById(ctx, parsed.saleId, tx),
      "Venta"
    );

    const existingItem = await this.saleRepo.findItemById(ctx, parsed.saleId, operation.entityId, tx);
    if (!existingItem) {
      throw new Error("Item no encontrado");
    }

    await this.saleRepo.updateItem(ctx, parsed.saleId, operation.entityId, {
      quantity: parsed.quantity,
      unitPrice: parsed.unitPrice,
      subtotal: parsed.subtotal,
      isModified: true,
    }, tx);

    await this.saleRepo.recalculateTotalsAtomically(ctx, parsed.saleId, tx);
  }

  private async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    if (!tx) {
      throw new Error("Transaction is required for sale item operations");
    }

    const parsed = saleItemOperationSchema.parse(operation.payload);

    // For delete, if sale doesn't exist, item can't exist either - skip silently
    // Use registry to check if sale was created in this batch
    if (!this.registry?.wasCreated(parsed.saleId)) {
      const sale = await this.saleRepo.findById(ctx, parsed.saleId, tx);
      if (!sale) {
        return;
      }
    }

    const existingItem = await this.saleRepo.findItemById(ctx, parsed.saleId, operation.entityId, tx);
    if (!existingItem) {
      return;
    }

    await this.saleRepo.deleteItem(ctx, parsed.saleId, operation.entityId, tx);
    await this.saleRepo.recalculateTotalsAtomically(ctx, parsed.saleId, tx);
  }
}
