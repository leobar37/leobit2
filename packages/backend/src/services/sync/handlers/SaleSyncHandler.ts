import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { SaleRepository } from "../../repository/sale.repository";
import type { PaymentRepository } from "../../repository/payment.repository";
import type { Sale } from "../../../db/schema";
import { StatefulSyncHandler } from "./core/StatefulSyncHandler";
import { saleCreateSchema, saleUpdateSchema } from "../schemas";
import { now } from "../../../lib/date-utils";
import { mergeDefined, pickDefinedFields } from "./core/patch-utils";
import { subtract, isPositive } from "../../../lib/decimal";

export class SaleSyncHandler extends StatefulSyncHandler<Sale> {
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
    return this.executeStateful(ctx, operation, tx, {
      payloadKeys: Object.keys(operation.payload),
    });
  }

  protected async handleCreate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    const payload = {
      type: "instant_sale",
      ...operation.payload,
    };
    const parsed = saleCreateSchema.parse(payload);

    const saleWithId = {
      ...parsed,
      id: operation.entityId,
      type: parsed.type ?? "instant_sale",
      saleType: parsed.saleType,
      totalAmount: parsed.totalAmount,
      amountPaid: parsed.amountPaid ?? (parsed.saleType === "contado" ? parsed.totalAmount : "0"),
      balanceDue: parsed.saleType === "credito"
        ? subtract(parsed.totalAmount, parsed.amountPaid ?? "0")
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

    const createdSale = await this.saleRepo.create(ctx, saleWithId, tx);
    if (parsed.saleType === "credito" && parsed.customerId && isPositive(parsed.amountPaid ?? "0")) {
      const initialPaymentReference = `init-sale:${createdSale.id}`;
      await this.paymentRepo.createInitialPayment(
        ctx,
        {
          customerId: parsed.customerId,
          amount: parsed.amountPaid ?? "0",
          referenceNumber: initialPaymentReference,
        },
        tx
      );
    }
  }

  protected async handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    existing: Sale | undefined,
    tx?: DbTransaction
  ): Promise<void> {
    const parsed = saleUpdateSchema.parse(operation.payload);
    const clientExpectedVersion = operation.localVersion ?? parsed.version;

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
        items: (parsed.items || []).map((item) => ({
          ...item,
          quantity: item.quantity ?? "",
          orderedQuantity: item.orderedQuantity ?? "",
          unitPrice: item.unitPrice ?? "",
          unitPriceQuoted: item.unitPriceQuoted ?? "",
          subtotal: item.subtotal ?? "",
        })),
      } as Parameters<typeof this.saleRepo.create>[1];

      await this.saleRepo.create(ctx, saleWithId, tx);
      return;
    }

    if (
      clientExpectedVersion !== undefined &&
      existing.version > clientExpectedVersion
    ) {
      throw new Error(
        `Version conflict: expected version ${clientExpectedVersion} but server has version ${existing.version}. ` +
        "The record was modified by another device. Please refresh and try again."
      );
    }

    const expectedVersion = clientExpectedVersion ?? existing.version;

    if (parsed.status === "active" && existing.status === "draft" && existing.type === "instant_sale") {
      const updateData = mergeDefined(
        { status: "active", version: expectedVersion + 1 },
        pickDefinedFields(parsed, ["totalAmount", "amountPaid", "balanceDue", "saleType", "paymentMode"] as const)
      ) as Parameters<typeof this.saleRepo.update>[2];

      await this.saleRepo.update(ctx, operation.entityId, updateData, tx, expectedVersion);
      return;
    }

    if (parsed.status === "confirmed" && existing.status === "draft" && existing.type === "pre_order") {
      const hasMonetaryUpdates = parsed.totalAmount !== undefined || parsed.amountPaid !== undefined;
      if (hasMonetaryUpdates) {
        const updateData = mergeDefined(
          { status: "confirmed", version: expectedVersion + 1 },
          pickDefinedFields(parsed, ["totalAmount", "amountPaid", "balanceDue", "saleType", "paymentMode"] as const)
        ) as Parameters<typeof this.saleRepo.update>[2];

        await this.saleRepo.update(ctx, operation.entityId, updateData, tx, expectedVersion);
      } else {
        await this.saleRepo.confirmPreOrder(ctx, operation.entityId, expectedVersion, tx);
      }
      return;
    }

    if (parsed.status === "delivered" && existing.status === "confirmed" && existing.type === "pre_order") {
      await this.saleRepo.deliverPreOrder(ctx, operation.entityId, expectedVersion, tx);
      return;
    }

    if (parsed.status === "cancelled") {
      await this.saleRepo.update(ctx, operation.entityId, {
        status: "cancelled",
        cancelledAt: now(),
        cancelReason: parsed.cancelReason || "Cancelación",
        refundAmount: parsed.refundAmount,
        refundMethod: parsed.refundMethod as "efectivo" | "yape" | "plin" | "transferencia" | undefined,
        version: expectedVersion + 1,
      }, tx, expectedVersion);
      return;
    }

    const updateData = mergeDefined(
      { version: expectedVersion + 1 },
      pickDefinedFields(parsed, ["customerId", "deliveryDate", "saleType", "totalAmount"] as const)
    );

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
      } as Parameters<typeof this.saleRepo.updateWithItems>[2], tx, expectedVersion);
    } else {
      await this.saleRepo.update(ctx, operation.entityId, updateData as Parameters<typeof this.saleRepo.update>[2], tx, expectedVersion);
    }
  }

  protected async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    existing: Sale | undefined,
    tx?: DbTransaction
  ): Promise<void> {
    if (!existing) {
      return;
    }

    await this.saleRepo.delete(ctx, operation.entityId, tx);
  }

  protected async loadExistingForUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<Sale | undefined> {
    return this.saleRepo.findById(ctx, operation.entityId, tx);
  }

  protected async loadExistingForDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<Sale | undefined> {
    return this.saleRepo.findById(ctx, operation.entityId, tx);
  }
}
