import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { TagRepository } from "../../repository/tag.repository";
import { BaseSyncHandler } from "./BaseSyncHandler";
import { tagCreateSchema, tagUpdateSchema } from "../schemas";

export class TagSyncHandler extends BaseSyncHandler {
  readonly entityType = "tags" as const;

  constructor(private tagRepo: TagRepository) {
    super();
  }

  async validateBusinessRules(
    _ctx: RequestContext,
    payload: Record<string, unknown>,
    _tx?: DbTransaction
  ): Promise<void> {
    const schema = tagCreateSchema;
    schema.parse(payload);
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
    const parsed = tagCreateSchema.parse(operation.payload);

    await this.tagRepo.create(ctx, {
      name: parsed.name,
      color: parsed.color ?? "#3b82f6",
    }, tx);
  }

  private async handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    const parsed = tagUpdateSchema.parse(operation.payload);
    const updateData: Parameters<typeof this.tagRepo.update>[2] = {};

    if (parsed.name !== undefined) updateData.name = parsed.name;
    if (parsed.color !== undefined) updateData.color = parsed.color;

    const updated = await this.tagRepo.update(ctx, operation.entityId, updateData, tx);

    if (!updated) {
      throw new Error("Etiqueta no encontrada");
    }
  }

  private async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    _tx?: DbTransaction
  ): Promise<void> {
    const existing = await this.tagRepo.findById(ctx, operation.entityId);
    if (!existing) {
      return;
    }

    await this.tagRepo.delete(ctx, operation.entityId);
  }
}
