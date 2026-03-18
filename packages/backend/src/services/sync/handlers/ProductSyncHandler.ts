import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { ProductRepository } from "../../repository/product.repository";
import { BaseSyncHandler } from "./BaseSyncHandler";
import { productCreateSchema, productUpdateSchema } from "../schemas";

export class ProductSyncHandler extends BaseSyncHandler {
  readonly entityType = "products" as const;

  constructor(private productRepo: ProductRepository) {
    super();
  }

  async validateBusinessRules(
    _ctx: RequestContext,
    payload: Record<string, unknown>,
    operation?: string,
    _tx?: DbTransaction
  ): Promise<void> {
    this.validatePayload(payload, productCreateSchema, productUpdateSchema, operation);
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
    const parsed = productCreateSchema.parse(operation.payload);

    await this.productRepo.create(ctx, {
      name: parsed.name,
      type: parsed.type ?? "otro",
      unit: (parsed.unit ?? "kg") as "kg" | "unidad",
      basePrice: parsed.basePrice ? String(parsed.basePrice) : "0",
      costPrice: parsed.costPrice ? String(parsed.costPrice) : "0",
      isActive: parsed.isActive ?? true,
      imageId: parsed.imageId,
    }, tx);
  }

  private async handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    const parsed = productUpdateSchema.parse(operation.payload);
    const updateData: Parameters<typeof this.productRepo.update>[2] = {};

    if (parsed.name !== undefined) updateData.name = parsed.name;
    if (parsed.type !== undefined) updateData.type = parsed.type;
    if (parsed.unit !== undefined) updateData.unit = parsed.unit as "kg" | "unidad";
    if (parsed.basePrice !== undefined) updateData.basePrice = String(parsed.basePrice);
    if (parsed.isActive !== undefined) updateData.isActive = parsed.isActive;
    if (parsed.imageId !== undefined) updateData.imageId = parsed.imageId;

    const updated = await this.productRepo.update(ctx, operation.entityId, updateData, tx);

    if (!updated) {
      throw new Error("Producto no encontrado");
    }
  }

  private async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    _tx?: DbTransaction
  ): Promise<void> {
    const existing = await this.productRepo.findById(ctx, operation.entityId);
    if (!existing) {
      return;
    }

    await this.productRepo.delete(ctx, operation.entityId);
  }
}
