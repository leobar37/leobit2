import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { ProductVariantRepository } from "../../repository/product-variant.repository";
import { BaseSyncHandler } from "./BaseSyncHandler";
import { z } from "zod";

/**
 * @deprecated Use ProductVariantSyncHandler for variant inventory operations
 * This handler is kept for backwards compatibility with legacy inventory sync
 */
export class InventorySyncHandler extends BaseSyncHandler {
  readonly entityType = "inventory" as const;

  constructor(private variantRepo: ProductVariantRepository) {
    super();
  }

  async validateBusinessRules(
    _ctx: RequestContext,
    payload: Record<string, unknown>,
    operation?: string,
    _tx?: DbTransaction
  ): Promise<void> {
    // Legacy schema validation - only accepts productId and quantity for backwards compatibility
    const legacySchema = z.object({
      productId: z.string().optional(),
      variantId: z.string().optional(),
      quantity: z.union([z.string(), z.number()]),
    });
    legacySchema.parse(payload);
  }

  async execute(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<SyncHandlerResult> {
    this.logStart(ctx, operation);

    try {
      if (operation.operation === "create" || operation.operation === "update") {
        await this.handleUpsert(ctx, operation, tx);
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

  private async handleUpsert(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    const payload = operation.payload as { variantId?: string; productId?: string; quantity?: string | number };

    // Legacy support: if variantId is not provided but productId is, we can't determine the variant
    // This is a limitation of the old inventory table design
    if (!payload.variantId) {
      // For backwards compatibility, skip if no variantId (old clients sent productId only)
      console.warn("InventorySyncHandler: Skipping inventory sync - no variantId provided (legacy payload)");
      return;
    }

    const variantId = payload.variantId;
    const quantity = String(payload.quantity ?? "0");

    const existing = await this.variantRepo.getInventory(ctx, variantId);

    if (existing) {
      await this.variantRepo.updateInventory(ctx, variantId, quantity, tx);
    } else {
      await this.variantRepo.createInventory(ctx, { variantId, quantity }, tx);
    }
  }

  private async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    _tx?: DbTransaction
  ): Promise<void> {
    // Inventory deletion - set quantity to 0 instead of deleting
    const payload = operation.payload as { variantId?: string };
    if (!payload.variantId) return;

    await this.variantRepo.updateInventory(ctx, payload.variantId, "0");
  }
}
