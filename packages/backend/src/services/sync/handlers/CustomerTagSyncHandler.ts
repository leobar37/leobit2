import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { CustomerTagRepository } from "../../repository/customer-tag.repository";
import { BaseSyncHandler } from "./BaseSyncHandler";
import { customerTagCreateSchema } from "../schemas";

export class CustomerTagSyncHandler extends BaseSyncHandler {
  readonly entityType = "customer_tags" as const;

  constructor(private customerTagRepo: CustomerTagRepository) {
    super();
  }

  async validateBusinessRules(
    _ctx: RequestContext,
    payload: Record<string, unknown>,
    _tx?: DbTransaction
  ): Promise<void> {
    const schema = customerTagCreateSchema;
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
    const parsed = customerTagCreateSchema.parse(operation.payload);

    await this.customerTagRepo.addTag(ctx, parsed.customerId, parsed.tagId);
  }

  private async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    _tx?: DbTransaction
  ): Promise<void> {
    const parsed = customerTagCreateSchema.parse(operation.payload);

    await this.customerTagRepo.removeTag(ctx, parsed.customerId, parsed.tagId);
  }
}
