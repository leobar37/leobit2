import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { SyncEngineDeps } from "../framework/SyncEngine";
import type { CreatePurchaseInput } from "../../repository/purchase.repository";
import { BaseSyncHandler } from "./BaseSyncHandler";
import { purchaseCreateSchema, purchaseUpdateSchema } from "../schemas";
import { toISODateString, now } from "../../../lib/date-utils";
import { StateMachineRegistry } from "../../../lib/state-machine";
import type { PurchaseWithItems, PurchaseState } from "../../transitions";

export class PurchaseSyncHandler extends BaseSyncHandler {
  readonly entityType = "purchases" as const;

  private purchaseRepo: SyncEngineDeps["purchaseRepo"];
  private supplierRepo: SyncEngineDeps["supplierRepo"];
  private variantRepo: SyncEngineDeps["variantRepo"];

  constructor(deps: SyncEngineDeps) {
    super();
    this.purchaseRepo = deps.purchaseRepo;
    this.supplierRepo = deps.supplierRepo;
    this.variantRepo = deps.variantRepo;
  }

  async validateBusinessRules(
    _ctx: RequestContext,
    payload: Record<string, unknown>,
    _operation?: string,
    _tx?: DbTransaction
  ): Promise<void> {
    this.validatePayload(payload, purchaseCreateSchema, purchaseUpdateSchema);
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

    // Only require supplierId for non-draft purchases
    if (!parsed.supplierId && parsed.status !== "draft") {
      throw new Error("supplierId es requerido para crear una compra");
    }

    // Validate supplierId FK if provided
    if (parsed.supplierId) {
      const supplier = await this.supplierRepo.findById(ctx, parsed.supplierId);
      if (!supplier) {
        throw new Error("Proveedor no encontrado");
      }
    }

    // Create purchase only (items will be created by PurchaseItemSyncHandler)
    // Use the entityId from the sync operation (client-generated ID)
    const purchaseData: CreatePurchaseInput = {
      id: operation.entityId,
      supplierId: parsed.supplierId ?? null,
      purchaseDate: parsed.purchaseDate ?? toISODateString(now()),
      status: parsed.status ?? "draft",
      totalAmount: parsed.totalAmount ?? "0",
      notes: parsed.notes ?? undefined,
      receiptImageId: parsed.receiptImageId ?? null,
      invoiceNumber: parsed.invoiceNumber ?? null,
      syncGroupId: parsed.syncGroupId ?? null,
    };
    const purchase = await this.purchaseRepo.create(ctx, purchaseData, []); // Empty items - will be created via PurchaseItemSyncHandler
  }

  private async handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    const parsed = purchaseUpdateSchema.parse(operation.payload);

    if (parsed.status) {
      // Get existing purchase to determine the previous status
      const existingPurchase = await this.purchaseRepo.findById(ctx, operation.entityId, tx);
      if (!existingPurchase) {
        throw new Error("Compra no encontrada");
      }

      const previousStatus = existingPurchase.status as PurchaseState;
      const newStatus = parsed.status;

      // Execute state machine transition for inventory updates
      // This handles: pending -> received (add stock), received -> cancelled (remove stock)
      if (previousStatus !== newStatus) {
        const purchaseMachine = StateMachineRegistry.get<PurchaseWithItems, PurchaseState>("purchase");
        if (purchaseMachine) {
          // Execute transition hooks (inventory updates)
          await purchaseMachine.executeTransition(
            ctx,
            existingPurchase,
            previousStatus,
            newStatus,
            tx
          );
        }
      }

      // Update the purchase status
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
