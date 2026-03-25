import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { ProductVariantRepository } from "../../repository/product-variant.repository";
import type { ProductRepository } from "../../repository/product.repository";
import { BaseSyncHandler } from "./BaseSyncHandler";
import { productVariantCreateSchema, productVariantUpdateSchema } from "../schemas";

export class ProductVariantSyncHandler extends BaseSyncHandler {
  readonly entityType = "product_variants" as const;

  constructor(
    private variantRepo: ProductVariantRepository,
    private productRepo: ProductRepository
  ) {
    super();
  }

  async validateBusinessRules(
    _ctx: RequestContext,
    payload: Record<string, unknown>,
    operation?: string,
    _tx?: DbTransaction
  ): Promise<void> {
    this.validatePayload(payload, productVariantCreateSchema, productVariantUpdateSchema, operation);
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
        throw new Error(`Unsupported operation: ${operation.operation}`);
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
    const parsed = productVariantCreateSchema.parse(operation.payload);

    // Verify parent product exists (or was created in same batch)
    await this.ensureParentExists(
      parsed.productId,
      () => this.productRepo.findById(ctx, parsed.productId),
      "Producto"
    );

    await this.variantRepo.create(ctx, {
      id: operation.entityId,
      productId: parsed.productId,
      name: parsed.name,
      sku: parsed.sku,
      unitQuantity: parsed.unitQuantity,
      price: parsed.price,
      costPrice: parsed.costPrice ?? "0",
      sortOrder: parsed.sortOrder ?? 0,
      isActive: parsed.isActive ?? true,
    }, tx);
  }

  private async handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    const parsed = productVariantUpdateSchema.parse(operation.payload);
    const updateData: Parameters<typeof this.variantRepo.update>[2] = {};

    if (parsed.name !== undefined) updateData.name = parsed.name;
    if (parsed.sku !== undefined) updateData.sku = parsed.sku;
    if (parsed.unitQuantity !== undefined) updateData.unitQuantity = parsed.unitQuantity;
    if (parsed.price !== undefined) updateData.price = parsed.price;
    if (parsed.costPrice !== undefined) updateData.costPrice = parsed.costPrice;
    if (parsed.sortOrder !== undefined) updateData.sortOrder = parsed.sortOrder;
    if (parsed.isActive !== undefined) updateData.isActive = parsed.isActive;

    const updated = await this.variantRepo.update(ctx, operation.entityId, updateData, tx);

    if (!updated) {
      throw new Error("Variante no encontrada");
    }
  }

  private async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    _tx?: DbTransaction
  ): Promise<void> {
    const existing = await this.variantRepo.findById(ctx, operation.entityId);
    if (!existing) {
      return;
    }

    await this.variantRepo.delete(ctx, operation.entityId);
  }
}
