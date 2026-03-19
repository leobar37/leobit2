import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { SupplierRepository } from "../../repository/supplier.repository";
import { BaseSyncHandler } from "./BaseSyncHandler";
import { supplierCreateSchema, supplierUpdateSchema } from "../schemas";

export class SupplierSyncHandler extends BaseSyncHandler {
  readonly entityType = "suppliers" as const;

  constructor(private supplierRepo: SupplierRepository) {
    super();
  }

  async validateBusinessRules(
    _ctx: RequestContext,
    payload: Record<string, unknown>,
    operation?: string,
    _tx?: DbTransaction
  ): Promise<void> {
    this.validatePayload(payload, supplierCreateSchema, supplierUpdateSchema, operation);
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
    const parsed = supplierCreateSchema.parse(operation.payload);

    await this.supplierRepo.create(ctx, {
      name: parsed.name,
      type: parsed.type || "regular",
      ruc: parsed.ruc,
      address: parsed.address,
      phone: parsed.phone,
      email: parsed.email,
      notes: parsed.notes,
      isActive: true,
    }, tx);
  }

  private async handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ): Promise<void> {
    const parsed = supplierUpdateSchema.parse(operation.payload);

    const updateData: Parameters<typeof this.supplierRepo.update>[2] = {};

    if (parsed.name !== undefined) updateData.name = parsed.name;
    if (parsed.type !== undefined) updateData.type = parsed.type;
    if (parsed.ruc !== undefined) updateData.ruc = parsed.ruc;
    if (parsed.address !== undefined) updateData.address = parsed.address;
    if (parsed.phone !== undefined) updateData.phone = parsed.phone;
    if (parsed.email !== undefined) updateData.email = parsed.email;
    if (parsed.notes !== undefined) updateData.notes = parsed.notes;
    if (parsed.isActive !== undefined) updateData.isActive = parsed.isActive;

    const updated = await this.supplierRepo.update(ctx, operation.entityId, updateData, tx);

    if (!updated) {
      throw new Error("Proveedor no encontrado");
    }
  }

  private async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    _tx?: DbTransaction
  ): Promise<void> {
    const existing = await this.supplierRepo.findById(ctx, operation.entityId);
    if (!existing) {
      return;
    }

    await this.supplierRepo.delete(ctx, operation.entityId);
  }
}
