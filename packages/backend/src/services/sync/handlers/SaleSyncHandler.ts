import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { SaleRepository } from "../../repository/sale.repository";
import type { PaymentRepository } from "../../repository/payment.repository";
import { BaseSyncHandler } from "./BaseSyncHandler";
import { saleCreateSchema, saleUpdateSchema } from "../schemas";
import { now } from "../../../lib/date-utils";

export class SaleSyncHandler extends BaseSyncHandler {
  readonly entityType = "sales" as const;

  constructor(
    private saleRepo: SaleRepository,
    private paymentRepo: PaymentRepository
  ) {
    super();
  }

  async validateBusinessRules(
    _ctx: RequestContext,
    payload: Record<string, unknown>,
    operation?: string,
    _tx?: DbTransaction
  ): Promise<void> {
    this.validatePayload(payload, saleCreateSchema, saleUpdateSchema, operation);
  }

  async execute(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<SyncHandlerResult> {
    this.logStart(ctx, operation, { payloadKeys: Object.keys(operation.payload) });

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
    const parsed = saleCreateSchema.parse(operation.payload);

    const saleWithId = {
      ...parsed,
      id: operation.entityId,
      type: parsed.type ?? "instant_sale",
      saleType: parsed.saleType,
      totalAmount: parsed.totalAmount,
      amountPaid: parsed.amountPaid ?? (parsed.saleType === "contado" ? parsed.totalAmount : "0"),
      balanceDue: parsed.saleType === "credito"
        ? String(Math.max(Number(parsed.totalAmount) - Number(parsed.amountPaid || 0), 0))
        : "0",
      tara: parsed.tara,
      netWeight: parsed.netWeight,
      items: parsed.items.map(item => ({
        ...item,
        quantity: item.quantity,
        orderedQuantity: item.orderedQuantity,
        unitPrice: item.unitPrice,
        unitPriceQuoted: item.unitPriceQuoted,
        subtotal: item.subtotal,
      })),
    } as Parameters<typeof this.saleRepo.create>[1];

    if (tx) {
      const createdSale = await this.saleRepo.create(ctx, saleWithId, tx);
      if (parsed.saleType === "credito" && parsed.customerId && Number(parsed.amountPaid || 0) > 0) {
        const initialPaymentReference = `init-sale:${createdSale.id}`;
        await this.paymentRepo.createInitialPayment(
          ctx,
          {
            customerId: parsed.customerId,
            amount: Number(parsed.amountPaid || 0).toFixed(2),
            referenceNumber: initialPaymentReference,
          },
          tx
        );
      }
    } else {
      const { db: dbInstance } = await import("../../../lib/db");
      await dbInstance.transaction(async (innerTx) => {
        const createdSale = await this.saleRepo.create(ctx, saleWithId, innerTx);
        if (parsed.saleType === "credito" && parsed.customerId && Number(parsed.amountPaid || 0) > 0) {
          const initialPaymentReference = `init-sale:${createdSale.id}`;
          await this.paymentRepo.createInitialPayment(
            ctx,
            {
              customerId: parsed.customerId,
              amount: Number(parsed.amountPaid || 0).toFixed(2),
              referenceNumber: initialPaymentReference,
            },
            innerTx
          );
        }
      });
    }
  }

  private async handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    const parsed = saleUpdateSchema.parse(operation.payload);

    // Get the client's expected version from the operation
    const clientExpectedVersion = operation.localVersion ?? parsed.version ?? 1;

    const existing = await this.saleRepo.findById(ctx, operation.entityId, tx);

    if (!existing) {
      const hasItems = Array.isArray(parsed.items) && parsed.items.length > 0;
      if (!hasItems) {
        this.logStart(ctx, operation, { reason: "Sale not found and no items - skipping" });
        return;
      }

      const saleWithId = {
        ...parsed,
        id: operation.entityId,
        type: parsed.type ?? "instant_sale",
        saleType: parsed.saleType ?? "contado",
        totalAmount: parsed.totalAmount ?? "0",
        amountPaid: "0",
        balanceDue: "0",
        items: (parsed.items || []).map((item: Record<string, unknown>) => ({
          ...item,
          quantity: (item.quantity as string) ?? "",
          orderedQuantity: (item.orderedQuantity as string) ?? "",
          unitPrice: (item.unitPrice as string) ?? "",
          unitPriceQuoted: (item.unitPriceQuoted as string) ?? "",
          subtotal: (item.subtotal as string) ?? "",
        })),
      } as Parameters<typeof this.saleRepo.create>[1];

      if (tx) {
        await this.saleRepo.create(ctx, saleWithId, tx);
        return;
      }
      const { db: dbInstance } = await import("../../../lib/db");
      await dbInstance.transaction(async (innerTx) => {
        await this.saleRepo.create(ctx, saleWithId, innerTx);
      });
      return;
    }

    // Note: Version conflict detection is handled atomically by the repository's UPDATE WHERE clause.
    // The repository's update method will fail if the version doesn't match, preventing TOCTOU race conditions.

    if (parsed.status === "active" && existing.status === "draft" && existing.type === "instant_sale") {
      await this.saleRepo.update(ctx, operation.entityId, {
        status: "active",
        version: existing.version + 1,
        ...(parsed.totalAmount !== undefined && { totalAmount: parsed.totalAmount }),
        ...(parsed.amountPaid !== undefined && { amountPaid: parsed.amountPaid }),
        ...(parsed.balanceDue !== undefined && { balanceDue: parsed.balanceDue }),
        ...(parsed.saleType !== undefined && { saleType: parsed.saleType }),
        ...(parsed.paymentMode !== undefined && { paymentMode: parsed.paymentMode }),
      }, tx, existing.version);
      return;
    }

    if (parsed.status === "confirmed" && existing.status === "draft" && existing.type === "pre_order") {
      const hasMonetaryUpdates = parsed.totalAmount !== undefined || parsed.amountPaid !== undefined;
      if (hasMonetaryUpdates) {
        // Update monetary fields together with confirmation to avoid version conflict
        await this.saleRepo.update(ctx, operation.entityId, {
          status: "confirmed",
          version: existing.version + 1,
          ...(parsed.totalAmount !== undefined && { totalAmount: parsed.totalAmount }),
          ...(parsed.amountPaid !== undefined && { amountPaid: parsed.amountPaid }),
          ...(parsed.balanceDue !== undefined && { balanceDue: parsed.balanceDue }),
          ...(parsed.saleType !== undefined && { saleType: parsed.saleType }),
          ...(parsed.paymentMode !== undefined && { paymentMode: parsed.paymentMode }),
        }, tx, existing.version);
      } else {
        await this.saleRepo.confirmPreOrder(ctx, operation.entityId, existing.version, tx);
      }
      return;
    }

    if (parsed.status === "delivered" && existing.status === "confirmed" && existing.type === "pre_order") {
      await this.saleRepo.deliverPreOrder(ctx, operation.entityId, existing.version, tx);
      return;
    }

    if (parsed.status === "cancelled") {
      await this.saleRepo.update(ctx, operation.entityId, {
        status: "cancelled",
        cancelledAt: now(),
        cancelReason: parsed.cancelReason || "Cancelación",
        refundAmount: parsed.refundAmount,
        refundMethod: parsed.refundMethod as "efectivo" | "yape" | "plin" | "transferencia" | undefined,
        version: existing.version + 1,
      }, tx, existing.version);
      return;
    }

    const updateData = {
      version: existing.version + 1,
      ...(parsed.customerId !== undefined && { customerId: parsed.customerId }),
      ...(parsed.deliveryDate !== undefined && { deliveryDate: parsed.deliveryDate }),
      ...(parsed.saleType !== undefined && { saleType: parsed.saleType }),
      ...(parsed.totalAmount !== undefined && { totalAmount: parsed.totalAmount }),
    };

    if (Array.isArray(parsed.items)) {
      const items = parsed.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        variantId: item.variantId,
        variantName: item.variantName,
        quantity: item.quantity,
        orderedQuantity: item.orderedQuantity,
        unitPrice: item.unitPrice,
        unitPriceQuoted: item.unitPriceQuoted,
        subtotal: item.subtotal,
      }));

      await this.saleRepo.updateWithItems(ctx, operation.entityId, {
        ...updateData,
        items,
      } as Parameters<typeof this.saleRepo.updateWithItems>[2], tx, existing.version);
    } else {
      await this.saleRepo.update(ctx, operation.entityId, updateData as Parameters<typeof this.saleRepo.update>[2], tx, existing.version);
    }
  }

  private async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    _tx?: DbTransaction
  ): Promise<void> {
    const existing = await this.saleRepo.findById(ctx, operation.entityId);
    if (!existing) {
      return;
    }

    await this.saleRepo.delete(ctx, operation.entityId);
  }
}
