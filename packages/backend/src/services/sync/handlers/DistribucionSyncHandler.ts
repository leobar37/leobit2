import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { DistribucionRepository } from "../../repository/distribucion.repository";
import type { DistribucionService } from "../../business/distribucion.service";
import { BaseSyncHandler } from "./BaseSyncHandler";
import { distribucionCreateSchema, distribucionUpdateSchema } from "../schemas";
import { getToday } from "../../../lib/date-utils";

export class DistribucionSyncHandler extends BaseSyncHandler {
  readonly entityType = "distribuciones" as const;

  constructor(
    private distribucionRepo: DistribucionRepository,
    private distribucionService: DistribucionService
  ) {
    super();
  }

  async validateBusinessRules(
    _ctx: RequestContext,
    payload: Record<string, unknown>,
    operation?: string,
    _tx?: DbTransaction
  ): Promise<void> {
    this.validatePayload(payload, distribucionCreateSchema, distribucionUpdateSchema, operation);
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
    _tx?: DbTransaction
  ): Promise<void> {
    const parsed = distribucionCreateSchema.parse(operation.payload);

    await this.distribucionService.createDistribucion(ctx, {
      vendedorId: parsed.vendedorId,
      puntoVenta: parsed.puntoVenta,
      puntoVentaId: parsed.puntoVentaId,
      notaCreacion: parsed.notaCreacion,
      fecha: parsed.fecha ?? getToday(),
      groupId: parsed.groupId,
      // Items are optional at creation - products registered at close time
      items: parsed.items?.map(item => ({
        variantId: item.variantId,
        cantidadAsignada: Number(item.cantidadAsignada),
        unidad: item.unidad,
      })),
    });
  }

  private async handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    _tx?: DbTransaction
  ): Promise<void> {
    const parsed = distribucionUpdateSchema.parse(operation.payload);
    const updateData: Parameters<typeof this.distribucionRepo.update>[2] = {};

    if (parsed.puntoVenta !== undefined) updateData.puntoVenta = parsed.puntoVenta;
    if (parsed.puntoVentaId !== undefined) updateData.puntoVentaId = parsed.puntoVentaId;
    if (parsed.notaCreacion !== undefined) updateData.notaCreacion = parsed.notaCreacion;
    if (parsed.notaCierre !== undefined) updateData.notaCierre = parsed.notaCierre;
    if (parsed.montoRecaudado !== undefined) updateData.montoRecaudado = parsed.montoRecaudado;
    if (parsed.fecha !== undefined) updateData.fecha = parsed.fecha;
    if (parsed.estado !== undefined) updateData.estado = parsed.estado;

    const updated = await this.distribucionRepo.update(ctx, operation.entityId, updateData);

    if (!updated) {
      throw new Error("Distribución no encontrada");
    }
  }

  private async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    _tx?: DbTransaction
  ): Promise<void> {
    const existing = await this.distribucionRepo.findById(ctx, operation.entityId);
    if (!existing) {
      return;
    }

    await this.distribucionRepo.delete(ctx, operation.entityId);
  }
}
