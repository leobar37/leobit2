import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import type { SyncOperationInput } from "../types";
import type { SyncHandlerResult } from "../framework/types";
import type { DistribucionRepository } from "../../repository/distribucion.repository";
import type { DistribucionService } from "../../business/distribucion.service";
import type { Distribucion } from "../../../db/schema";
import { StatefulSyncHandler } from "./core/StatefulSyncHandler";
import { distribucionCreateSchema, distribucionUpdateSchema } from "../schemas";
import { getToday } from "../../../lib/date-utils";
import { pickDefinedFields } from "./core/patch-utils";

export class DistribucionSyncHandler extends StatefulSyncHandler<Distribucion> {
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
    return this.executeStateful(ctx, operation, tx);
  }

  protected async handleCreate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
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
        cantidadAsignada: item.cantidadAsignada,
        unidad: item.unidad,
      })),
    }, tx);
  }

  protected async handleUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    _existing: Distribucion | undefined,
    tx?: DbTransaction
  ): Promise<void> {
    const parsed = distribucionUpdateSchema.parse(operation.payload);
    const updateData = pickDefinedFields(parsed, [
      "puntoVenta",
      "puntoVentaId",
      "notaCreacion",
      "notaCierre",
      "montoRecaudado",
      "fecha",
      "estado",
    ] as const) as Parameters<typeof this.distribucionRepo.update>[2];

    const updated = await this.distribucionRepo.update(ctx, operation.entityId, updateData, tx);

    if (!updated) {
      throw new Error("Distribución no encontrada");
    }
  }

  protected async handleDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    existing: Distribucion | undefined,
    tx?: DbTransaction
  ): Promise<void> {
    if (!existing) {
      return;
    }

    await this.distribucionRepo.delete(ctx, operation.entityId, tx);
  }

  protected async loadExistingForUpdate(
    ctx: RequestContext,
    operation: SyncOperationInput,
    _tx?: DbTransaction
  ): Promise<Distribucion | undefined> {
    return this.distribucionRepo.findById(ctx, operation.entityId);
  }

  protected async loadExistingForDelete(
    ctx: RequestContext,
    operation: SyncOperationInput,
    _tx?: DbTransaction
  ): Promise<Distribucion | undefined> {
    return this.distribucionRepo.findById(ctx, operation.entityId);
  }
}
