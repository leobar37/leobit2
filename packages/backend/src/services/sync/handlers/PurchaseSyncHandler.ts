import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { PurchaseRepository } from "../../repository/purchase.repository";
import { BaseSyncHandler } from "./BaseSyncHandler";
import { purchaseCreateSchema, purchaseUpdateSchema } from "../schemas";

export class PurchaseSyncHandler extends BaseSyncHandler {
  readonly entityType = "purchases" as const;

  constructor(private purchaseRepo: PurchaseRepository) {
    super();
  }

  async validateBusinessRules(
    _ctx: RequestContext,
    payload: Record<string, unknown>,
    operation?: string,
    _tx?: DbTransaction
  ): Promise<void> {
    this.validatePayload(payload, purchaseCreateSchema, purchaseUpdateSchema, operation);
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
    _tx?: DbTransaction
  ): Promise<void> {
    const parsed = purchaseCreateSchema.parse(operation.payload);

    if (!parsed.supplierId) {
      throw new Error("supplierId es requerido para crear una compra");
    }

    await this.purchaseRepo.create(ctx, {
      supplierId: parsed.supplierId,
      purchaseDate: parsed.purchaseDate ?? new Date().toISOString().split("T")[0],
      status: parsed.status ?? "pending",
      totalAmount: parsed.totalAmount ? String(parsed.totalAmount) : "0",
      notes: parsed.notes ?? undefined,
      receiptImageId: undefined,
    }, []);
  }

  private async handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    const parsed = purchaseUpdateSchema.parse(operation.payload);

    if (parsed.status) {
      const updated = await this.purchaseRepo.updateStatus(
        ctx,
        operation.entityId,
        parsed.status,
        tx
      );

      if (!updated) {
        throw new Error("Compra no encontrada");
      }
    }
  }

  private async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    _tx?: DbTransaction
  ): Promise<void> {
    const existing = await this.purchaseRepo.findById(ctx, operation.entityId);
    if (!existing) {
      return;
    }

    await this.purchaseRepo.delete(ctx, operation.entityId);
  }
}
