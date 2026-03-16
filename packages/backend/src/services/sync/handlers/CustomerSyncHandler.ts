import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { CustomerRepository } from "../../repository/customer.repository";
import { BaseSyncHandler } from "./BaseSyncHandler";
import { customerCreateSchema, customerUpdateSchema } from "../schemas";

export class CustomerSyncHandler extends BaseSyncHandler {
  readonly entityType = "customers" as const;

  constructor(private customerRepo: CustomerRepository) {
    super();
  }

  async validateBusinessRules(
    _ctx: RequestContext,
    payload: Record<string, unknown>,
    _tx?: DbTransaction
  ): Promise<void> {
    const schema = customerCreateSchema;
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
    const parsed = customerCreateSchema.parse(operation.payload);

    await this.customerRepo.create(ctx, {
      name: parsed.name,
      dni: parsed.dni,
      phone: parsed.phone,
      address: parsed.address,
      notes: parsed.notes,
    }, tx);
  }

  private async handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    const parsed = customerUpdateSchema.parse(operation.payload);
    const updateData: Parameters<typeof this.customerRepo.update>[2] = {};

    if (parsed.name !== undefined) updateData.name = parsed.name;
    if (parsed.dni !== undefined) updateData.dni = parsed.dni;
    if (parsed.phone !== undefined) updateData.phone = parsed.phone;
    if (parsed.address !== undefined) updateData.address = parsed.address;
    if (parsed.notes !== undefined) updateData.notes = parsed.notes;

    const updated = await this.customerRepo.update(ctx, operation.entityId, updateData, tx);

    if (!updated) {
      throw new Error("Cliente no encontrado");
    }
  }

  private async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    _tx?: DbTransaction
  ): Promise<void> {
    const existing = await this.customerRepo.findById(ctx, operation.entityId);
    if (!existing) {
      return;
    }

    await this.customerRepo.delete(ctx, operation.entityId);
  }
}
