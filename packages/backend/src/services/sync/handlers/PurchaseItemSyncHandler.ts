import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { PurchaseRepository } from "../../repository/purchase.repository";
import { BaseSyncHandler } from "./BaseSyncHandler";
import { purchaseItemCreateSchema, purchaseItemUpdateSchema } from "../schemas";

export class PurchaseItemSyncHandler extends BaseSyncHandler {
  readonly entityType = "purchase_items" as const;

  constructor(private purchaseRepo: PurchaseRepository) {
    super();
  }

  async validateBusinessRules(
    _ctx: RequestContext,
    payload: Record<string, unknown>,
    _operation?: string,
    _tx?: DbTransaction
  ): Promise<void> {
    this.validatePayload(payload, purchaseItemCreateSchema, purchaseItemUpdateSchema);
  }

  async execute(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<SyncHandlerResult> {
    this.logStart(ctx, operation);

    try {
      const parsed = purchaseItemCreateSchema.parse(operation.payload);
      const purchaseId = parsed.purchaseId;

      if (operation.operation === "create") {
        await this.handleCreate(ctx, operation, purchaseId, tx);
      } else if (operation.operation === "update") {
        await this.handleUpdate(ctx, operation, purchaseId, tx);
      } else if (operation.operation === "delete") {
        await this.handleDelete(ctx, operation, purchaseId, tx);
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
    purchaseId: string,
    tx?: DbTransaction
  ): Promise<void> {
    const parsed = purchaseItemCreateSchema.parse(operation.payload);

    // Verify purchase exists
    const purchase = await this.purchaseRepo.findById(ctx, purchaseId, tx);
    if (!purchase) {
      throw new Error(`Compra ${purchaseId} no encontrada`);
    }

    // Check if item already exists (idempotency)
    const existingItem = await this.purchaseRepo.findItemById(
      ctx,
      purchaseId,
      operation.entityId,
      tx
    );
    if (existingItem) {
      // Item already created, skip
      return;
    }

    // Create item with the ID from operation.entityId
    // Note: totalCost falls back to calculated value if not provided
    await this.purchaseRepo.addItem(
      ctx,
      purchaseId,
      {
        id: operation.entityId,
        productId: parsed.productId,
        variantId: parsed.variantId ?? null,
        unitId: parsed.unitId ?? null,
        quantity: parsed.quantity,
        unitCost: parsed.unitCost,
        totalCost: parsed.totalCost ?? String(Number(parsed.quantity) * Number(parsed.unitCost)),
      },
      tx
    );
  }

  private async handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    purchaseId: string,
    tx?: DbTransaction
  ): Promise<void> {
    const parsed = purchaseItemUpdateSchema.parse(operation.payload);

    const purchase = await this.purchaseRepo.findById(ctx, purchaseId, tx);
    if (!purchase) {
      throw new Error(`Compra ${purchaseId} no encontrada`);
    }

    const existingItem = await this.purchaseRepo.findItemById(
      ctx,
      purchaseId,
      operation.entityId,
      tx
    );
    if (!existingItem) {
      throw new Error("Item no encontrado");
    }

    // Update the item - values are already strings from schema transform
    await this.purchaseRepo.updateItem(
      ctx,
      purchaseId,
      operation.entityId,
      {
        quantity: parsed.quantity,
        unitCost: parsed.unitCost,
        totalCost: parsed.totalCost,
      },
      tx
    );

    // Recalculate purchase total
    await this.purchaseRepo.updateTotal(ctx, purchaseId, tx);
  }

  private async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    purchaseId: string,
    tx?: DbTransaction
  ): Promise<void> {
    const purchase = await this.purchaseRepo.findById(ctx, purchaseId, tx);
    if (!purchase) {
      // Purchase doesn't exist, item can't exist either
      return;
    }

    const existingItem = await this.purchaseRepo.findItemById(
      ctx,
      purchaseId,
      operation.entityId,
      tx
    );
    if (!existingItem) {
      // Item doesn't exist, nothing to delete
      return;
    }

    // Delete the item
    await this.purchaseRepo.deleteItem(ctx, purchaseId, operation.entityId, tx);

    // Recalculate purchase total
    await this.purchaseRepo.updateTotal(ctx, purchaseId, tx);
  }
}