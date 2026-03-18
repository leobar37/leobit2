import type { RequestContext } from "../../../context/request-context";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { CustomerGroupRepository } from "../../repository/customer-group.repository";
import { BaseSyncHandler } from "./BaseSyncHandler";
import { customerGroupCreateSchema, customerGroupUpdateSchema } from "../schemas";

export class CustomerGroupSyncHandler extends BaseSyncHandler {
  readonly entityType = "customer_groups" as const;

  constructor(private customerGroupRepo: CustomerGroupRepository) {
    super();
  }

  async validateBusinessRules(
    _ctx: RequestContext,
    payload: Record<string, unknown>,
    operation?: string,
  ): Promise<void> {
    this.validatePayload(payload, customerGroupCreateSchema, customerGroupUpdateSchema, operation);
  }

  async execute(
    ctx: RequestContext,
    operation: SyncOperationInput,
  ): Promise<SyncHandlerResult> {
    this.logStart(ctx, operation);

    try {
      if (operation.operation === "create") {
        await this.handleCreate(ctx, operation);
      } else if (operation.operation === "update") {
        await this.handleUpdate(ctx, operation);
      } else if (operation.operation === "delete") {
        await this.handleDelete(ctx, operation);
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
  ): Promise<void> {
    const parsed = customerGroupCreateSchema.parse(operation.payload);

    await this.customerGroupRepo.create(ctx, {
      name: parsed.name,
    });
  }

  private async handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
  ): Promise<void> {
    const parsed = customerGroupUpdateSchema.parse(operation.payload);

    if (!parsed.name) {
      throw new Error("El nombre es requerido para actualizar");
    }

    const updated = await this.customerGroupRepo.update(ctx, operation.entityId, {
      name: parsed.name,
    });

    if (!updated) {
      throw new Error("Grupo no encontrado");
    }
  }

  private async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
  ): Promise<void> {
    const existing = await this.customerGroupRepo.findById(ctx, operation.entityId);
    if (!existing) {
      return;
    }

    await this.customerGroupRepo.delete(ctx, operation.entityId);
  }
}
