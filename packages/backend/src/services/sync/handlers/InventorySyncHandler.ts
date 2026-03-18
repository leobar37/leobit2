import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { InventoryRepository } from "../../repository/inventory.repository";
import { BaseSyncHandler } from "./BaseSyncHandler";
import { inventoryCreateSchema, inventoryUpdateSchema } from "../schemas";

export class InventorySyncHandler extends BaseSyncHandler {
  readonly entityType = "inventory" as const;

  constructor(private inventoryRepo: InventoryRepository) {
    super();
  }

  async validateBusinessRules(
    _ctx: RequestContext,
    payload: Record<string, unknown>,
    operation?: string,
    _tx?: DbTransaction
  ): Promise<void> {
    this.validatePayload(payload, inventoryCreateSchema, inventoryUpdateSchema, operation);
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
    const parsed = inventoryCreateSchema.parse(operation.payload);

    await this.inventoryRepo.create(ctx, {
      productId: parsed.productId,
      quantity: String(parsed.quantity),
    }, tx);
  }

  private async handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    const parsed = inventoryUpdateSchema.parse(operation.payload);
    const updateData: Parameters<typeof this.inventoryRepo.update>[2] = {};

    if (parsed.productId !== undefined) updateData.productId = parsed.productId;
    if (parsed.quantity !== undefined) updateData.quantity = String(parsed.quantity);

    const updated = await this.inventoryRepo.update(ctx, operation.entityId, updateData, tx);

    if (!updated) {
      throw new Error("Inventario no encontrado");
    }
  }

  private async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    _tx?: DbTransaction
  ): Promise<void> {
    const existing = await this.inventoryRepo.findById(ctx, operation.entityId);
    if (!existing) {
      return;
    }

    await this.inventoryRepo.delete(ctx, operation.entityId);
  }
}
