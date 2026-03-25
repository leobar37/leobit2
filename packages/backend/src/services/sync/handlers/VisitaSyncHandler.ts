import type { RequestContext } from "../../../context/request-context";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { VisitaRepository } from "../../repository/visita.repository";
import { BaseSyncHandler } from "./BaseSyncHandler";
import { visitaCreateSchema, visitaUpdateSchema } from "../schemas";

export class VisitaSyncHandler extends BaseSyncHandler {
  readonly entityType = "visitas" as const;

  constructor(private visitaRepo: VisitaRepository) {
    super();
  }

  async validateBusinessRules(
    _ctx: RequestContext,
    payload: Record<string, unknown>,
    operation?: string,
  ): Promise<void> {
    this.validatePayload(payload, visitaCreateSchema, visitaUpdateSchema, operation);
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
    const parsed = visitaCreateSchema.parse(operation.payload);

    await this.visitaRepo.create(ctx, {
      id: operation.entityId,
      distribucionId: parsed.distribucionId,
      customerId: parsed.customerId,
    });
  }

  private async handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
  ): Promise<void> {
    const parsed = visitaUpdateSchema.parse(operation.payload);

    if (!parsed.status) {
      throw new Error("El estado es requerido para actualizar");
    }

    const updateData: Parameters<typeof this.visitaRepo.updateStatus>[2] = {
      status: parsed.status,
    };

    if (parsed.motivoNoCompra) {
      updateData.motivoNoCompra = parsed.motivoNoCompra;
    }

    if (parsed.saleId) {
      updateData.saleId = parsed.saleId;
    }

    const updated = await this.visitaRepo.updateStatus(ctx, operation.entityId, updateData);

    if (!updated) {
      throw new Error("Visita no encontrada");
    }
  }

  private async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
  ): Promise<void> {
    const existing = await this.visitaRepo.findById(ctx, operation.entityId);
    if (!existing) {
      return;
    }

    await this.visitaRepo.delete(ctx, operation.entityId);
  }
}
