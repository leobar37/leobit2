import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { PaymentRepository } from "../../repository/payment.repository";
import { BaseSyncHandler } from "./BaseSyncHandler";
import { abonoCreateSchema, abonoUpdateSchema } from "../schemas";

export class AbonoSyncHandler extends BaseSyncHandler {
  readonly entityType = "abonos" as const;

  constructor(private paymentRepo: PaymentRepository) {
    super();
  }

  async validateBusinessRules(
    _ctx: RequestContext,
    payload: Record<string, unknown>,
    _tx?: DbTransaction
  ): Promise<void> {
    abonoCreateSchema.parse(payload);
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
    const parsed = abonoCreateSchema.parse(operation.payload);

    await this.paymentRepo.create(ctx, {
      id: operation.entityId,
      customerId: parsed.customerId,
      amount: String(parsed.amount),
      paymentMethod: parsed.paymentMethod,
      notes: parsed.notes,
    }, tx);
  }

  private async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    const existing = await this.paymentRepo.findById(ctx, operation.entityId, tx);
    if (!existing) {
      return;
    }

    await this.paymentRepo.delete(ctx, operation.entityId, tx);
  }

  private async handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    const parsed = abonoUpdateSchema.parse(operation.payload);

    const existing = await this.paymentRepo.findById(ctx, operation.entityId, tx);
    if (!existing) {
      throw new Error("Abono no encontrado");
    }

    await this.paymentRepo.update(ctx, operation.entityId, {
      proofImageId: parsed.proofImageId,
      referenceNumber: parsed.referenceNumber,
      notes: parsed.notes,
    }, tx);
  }
}
