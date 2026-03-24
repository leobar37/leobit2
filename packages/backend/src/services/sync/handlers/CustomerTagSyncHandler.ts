import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { CustomerTagRepository } from "../../repository/customer-tag.repository";
import type { CustomerRepository } from "../../repository/customer.repository";
import type { TagRepository } from "../../repository/tag.repository";
import { BaseSyncHandler } from "./BaseSyncHandler";
import { customerTagCreateSchema } from "../schemas";

export class CustomerTagSyncHandler extends BaseSyncHandler {
  readonly entityType = "customer_tags" as const;

  constructor(
    private customerTagRepo: CustomerTagRepository,
    private customerRepo: CustomerRepository,
    private tagRepo: TagRepository
  ) {
    super();
  }

  async validateBusinessRules(
    _ctx: RequestContext,
    payload: Record<string, unknown>,
    operation?: string,
    _tx?: DbTransaction
  ): Promise<void> {
    // customerTag only has create schema - use it for all operations
    this.validatePayload(payload, customerTagCreateSchema, undefined, operation);
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
    tx?: DbTransaction
  ): Promise<void> {
    const parsed = customerTagCreateSchema.parse(operation.payload);

    // Verificar customer usando registry (evita query si fue creado en este batch)
    if (!this.registry?.wasCreated(parsed.customerId)) {
      const customer = await this.customerRepo.findById(ctx, parsed.customerId, tx);
      if (!customer) {
        throw new Error(`Cliente ${parsed.customerId} no encontrado`);
      }
    }

    // Verificar tag usando registry (evita query si fue creado en este batch)
    if (!this.registry?.wasCreated(parsed.tagId)) {
      const tag = await this.tagRepo.findById(ctx, parsed.tagId, tx);
      if (!tag) {
        throw new Error(`Etiqueta ${parsed.tagId} no encontrada`);
      }
    }

    await this.customerTagRepo.addTag(ctx, parsed.customerId, parsed.tagId, tx);
  }

  private async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    const parsed = customerTagCreateSchema.parse(operation.payload);

    await this.customerTagRepo.removeTag(ctx, parsed.customerId, parsed.tagId, tx);
  }
}
