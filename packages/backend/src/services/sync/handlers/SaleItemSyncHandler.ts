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
    const parsed = saleItemOperationSchema.parse(operation.payload);

    const executeCreate = async (executor: DbTransaction) => {
      const sale = await this.saleRepo.findById(ctx, parsed.saleId, executor);
      if (!sale) {
        throw new Error(`Venta ${parsed.saleId} no encontrada`);
      }

      await this.saleRepo.addItem(ctx, parsed.saleId, {
        id: operation.entityId,
        productId: parsed.productId,
        productName: parsed.productName,
        variantId: parsed.variantId,
        variantName: parsed.variantName,
        quantity: parsed.quantity?.toString(),
        orderedQuantity: parsed.orderedQuantity?.toString(),
        unitPrice: parsed.unitPrice?.toString(),
        unitPriceQuoted: parsed.unitPriceQuoted?.toString(),
        subtotal: String(parsed.subtotal),
      }, executor);
    };

    if (tx) {
      await executeCreate(tx);
    } else {
      const { db: dbInstance } = await import("../../../lib/db");
      await dbInstance.transaction(executeCreate);
    }
  }

  private async handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    const parsed = saleItemOperationSchema.parse(operation.payload);

    const executeUpdate = async (executor: DbTransaction) => {
      const sale = await this.saleRepo.findById(ctx, parsed.saleId, executor);
      if (!sale) {
        throw new Error(`Venta ${parsed.saleId} no encontrada`);
      }

      const existingItem = await this.saleRepo.findItemById(ctx, parsed.saleId, operation.entityId, executor);
      if (!existingItem) {
        throw new Error("Item no encontrado");
      }

      const oldSubtotal = parseFloat(existingItem.subtotal);
      const newSubtotal = parsed.subtotal !== undefined
        ? parseFloat(String(parsed.subtotal))
        : oldSubtotal;
      const subtotalDiff = newSubtotal - oldSubtotal;

      await this.saleRepo.updateItem(ctx, parsed.saleId, operation.entityId, {
        quantity: parsed.quantity?.toString(),
        unitPrice: parsed.unitPrice?.toString(),
        subtotal: parsed.subtotal?.toString(),
        isModified: true,
      }, executor);

      if (Math.abs(subtotalDiff) > 0.01) {
        const newTotal = parseFloat(sale.totalAmount) + subtotalDiff;
        const newBalanceDue = Math.max(newTotal - parseFloat(sale.amountPaid), 0);

        await this.saleRepo.update(ctx, parsed.saleId, {
          totalAmount: newTotal.toFixed(2),
          balanceDue: newBalanceDue.toFixed(2),
        }, executor);
      }
    };

    if (tx) {
      await executeUpdate(tx);
    } else {
      const { db: dbInstance } = await import("../../../lib/db");
      await dbInstance.transaction(executeUpdate);
    }
  }

  private async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    const parsed = saleItemOperationSchema.parse(operation.payload);

    const executeDelete = async (executor: DbTransaction) => {
      const sale = await this.saleRepo.findById(ctx, parsed.saleId, executor);
      if (!sale) {
        throw new Error(`Venta ${parsed.saleId} no encontrada`);
      }

      const existingItem = await this.saleRepo.findItemById(ctx, parsed.saleId, operation.entityId, executor);
      if (!existingItem) {
        return;
      }

      const subtotal = parseFloat(existingItem.subtotal);

      await this.saleRepo.deleteItem(ctx, parsed.saleId, operation.entityId, executor);

      const newTotal = parseFloat(sale.totalAmount) - subtotal;
      const newBalanceDue = Math.max(newTotal - parseFloat(sale.amountPaid), 0);

      await this.saleRepo.update(ctx, parsed.saleId, {
        totalAmount: newTotal.toFixed(2),
        balanceDue: newBalanceDue.toFixed(2),
      }, executor);
    };

    if (tx) {
      await executeDelete(tx);
    } else {
      const { db: dbInstance } = await import("../../../lib/db");
      await dbInstance.transaction(executeDelete);
    }
  }
}
