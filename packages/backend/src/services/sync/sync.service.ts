import { and, asc, eq, gte } from "drizzle-orm";
import type { RequestContext } from "../../context/request-context";
import { ValidationError } from "../../errors";
import { db, syncOperations } from "../../lib/db";
import type { CustomerRepository } from "../repository/customer.repository";
import type { SaleRepository } from "../repository/sale.repository";
import type { PaymentRepository } from "../repository/payment.repository";
import type { DistribucionRepository } from "../repository/distribucion.repository";

export type SyncEntity =
  | "customers"
  | "sales"
  | "sale_items"
  | "abonos"
  | "distribuciones";

export type SyncAction = "insert" | "update" | "delete";

export interface SyncOperationInput {
  operationId: string;
  entity: SyncEntity;
  action: SyncAction;
  entityId: string;
  payload: Record<string, unknown>;
  clientTimestamp: string;
}

export interface SyncOperationResult {
  operationId: string;
  success: boolean;
  error?: string;
  serverTimestamp: string;
}

export interface SyncBatchResult {
  results: SyncOperationResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

interface SyncServiceDeps {
  customerRepo: CustomerRepository;
  saleRepo: SaleRepository;
  paymentRepo: PaymentRepository;
  distribucionRepo: DistribucionRepository;
}

type ParsedSaleInsert = {
  clientId?: string;
  saleType: "contado" | "credito";
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  tara?: string;
  netWeight?: string;
  items: Array<{
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
    quantity: string;
    unitPrice: string;
    subtotal: string;
  }>;
};

type ParsedDistribucionInsert = {
  vendedorId: string;
  puntoVenta: string;
  kilosAsignados: string;
  kilosVendidos: string;
  montoRecaudado: string;
  fecha: string;
  estado: "activo" | "cerrado" | "en_ruta";
  syncStatus: "pending" | "synced" | "error";
  syncAttempts: number;
};

export class SyncService {
  constructor(private deps: SyncServiceDeps) {}

  async processBatch(
    ctx: RequestContext,
    operations: SyncOperationInput[]
  ): Promise<SyncBatchResult> {
    const results: SyncOperationResult[] = [];

    for (const operation of operations) {
      this.validateOperation(operation);
      const nowIso = new Date().toISOString();

      const existing = await db.query.syncOperations.findFirst({
        where: and(
          eq(syncOperations.businessId, ctx.businessId),
          eq(syncOperations.operationId, operation.operationId)
        ),
      });

      if (existing?.status === "processed") {
        results.push({
          operationId: operation.operationId,
          success: true,
          serverTimestamp: existing.processedAt?.toISOString() ?? nowIso,
        });
        continue;
      }

      if (!existing) {
        await db.insert(syncOperations).values({
          businessId: ctx.businessId,
          operationId: operation.operationId,
          entity: operation.entity,
          action: operation.action,
          entityId: operation.entityId,
          payload: operation.payload,
          status: "pending",
          clientTimestamp: new Date(operation.clientTimestamp),
        });
      }

      try {
        await this.applyOperation(ctx, operation);
        const processedAt = new Date();

        await db
          .update(syncOperations)
          .set({
            status: "processed",
            error: null,
            processedAt,
          })
          .where(
            and(
              eq(syncOperations.businessId, ctx.businessId),
              eq(syncOperations.operationId, operation.operationId)
            )
          );

        results.push({
          operationId: operation.operationId,
          success: true,
          serverTimestamp: processedAt.toISOString(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";

        await db
          .update(syncOperations)
          .set({
            status: "failed",
            error: message,
          })
          .where(
            and(
              eq(syncOperations.businessId, ctx.businessId),
              eq(syncOperations.operationId, operation.operationId)
            )
          );

        results.push({
          operationId: operation.operationId,
          success: false,
          error: message,
          serverTimestamp: nowIso,
        });
      }
    }

    const succeeded = results.filter((item) => item.success).length;
    const failed = results.length - succeeded;

    return {
      results,
      summary: {
        total: results.length,
        succeeded,
        failed,
      },
    };
  }

  async getChanges(ctx: RequestContext, since?: Date, limit = 100) {
    const where = since
      ? and(
          eq(syncOperations.businessId, ctx.businessId),
          eq(syncOperations.status, "processed"),
          gte(syncOperations.processedAt, since)
        )
      : and(
          eq(syncOperations.businessId, ctx.businessId),
          eq(syncOperations.status, "processed")
        );

    const operations = await db.query.syncOperations.findMany({
      where,
      orderBy: asc(syncOperations.processedAt),
      limit,
    });

    const last = operations[operations.length - 1];

    return {
      changes: operations.map((item) => ({
        operationId: item.operationId,
        entity: item.entity,
        action: item.action,
        entityId: item.entityId,
        payload: item.payload,
        clientTimestamp: item.clientTimestamp.toISOString(),
        processedAt: item.processedAt?.toISOString() ?? item.createdAt.toISOString(),
      })),
      nextSince:
        last?.processedAt?.toISOString() ?? last?.createdAt.toISOString() ?? since?.toISOString(),
    };
  }

  private validateOperation(operation: SyncOperationInput) {
    if (!operation.operationId) {
      throw new ValidationError("operationId es requerido");
    }

    if (!operation.entityId) {
      throw new ValidationError("entityId es requerido");
    }

    if (!operation.clientTimestamp) {
      throw new ValidationError("clientTimestamp es requerido");
    }

    if (!Number.isFinite(new Date(operation.clientTimestamp).getTime())) {
      throw new ValidationError("clientTimestamp inválido");
    }
  }

  private async applyOperation(ctx: RequestContext, operation: SyncOperationInput) {
    switch (operation.entity) {
      case "customers":
        await this.applyCustomerOperation(ctx, operation);
        return;
      case "sales":
        await this.applySalesOperation(ctx, operation);
        return;
      case "abonos":
        await this.applyAbonosOperation(ctx, operation);
        return;
      case "distribuciones":
        await this.applyDistribucionOperation(ctx, operation);
        return;
      case "sale_items":
        throw new ValidationError("sale_items no soporta sync directo en v1");
      default:
        throw new ValidationError(`Entidad no soportada: ${operation.entity}`);
    }
  }

  private async applyCustomerOperation(
    ctx: RequestContext,
    operation: SyncOperationInput
  ) {
    const payload = operation.payload;

    if (operation.action === "insert") {
      await this.deps.customerRepo.create(ctx, {
        name: this.requiredString(payload.name, "name"),
        dni: this.optionalString(payload.dni),
        phone: this.optionalString(payload.phone),
        address: this.optionalString(payload.address),
        notes: this.optionalString(payload.notes),
      });
      return;
    }

    if (operation.action === "update") {
      const updated = await this.deps.customerRepo.update(ctx, operation.entityId, {
        ...(payload.name !== undefined && {
          name: this.requiredString(payload.name, "name"),
        }),
        ...(payload.dni !== undefined && { dni: this.optionalString(payload.dni) }),
        ...(payload.phone !== undefined && {
          phone: this.optionalString(payload.phone),
        }),
        ...(payload.address !== undefined && {
          address: this.optionalString(payload.address),
        }),
        ...(payload.notes !== undefined && {
          notes: this.optionalString(payload.notes),
        }),
      });

      if (!updated) {
        throw new ValidationError("Cliente no encontrado");
      }
      return;
    }

    const existing = await this.deps.customerRepo.findById(ctx, operation.entityId);
    if (!existing) {
      return;
    }

    await this.deps.customerRepo.delete(ctx, operation.entityId);
  }

  private async applySalesOperation(ctx: RequestContext, operation: SyncOperationInput) {
    const payload = operation.payload;

    if (operation.action === "insert") {
      const sale = this.parseSaleInsert(payload);
      await this.deps.saleRepo.create(ctx, sale);
      return;
    }

    if (operation.action === "delete") {
      const existing = await this.deps.saleRepo.findById(ctx, operation.entityId);
      if (!existing) {
        return;
      }

      await this.deps.saleRepo.delete(ctx, operation.entityId);
      return;
    }

    throw new ValidationError("Update de ventas no soportado en v1");
  }

  private async applyAbonosOperation(ctx: RequestContext, operation: SyncOperationInput) {
    const payload = operation.payload;

    if (operation.action === "insert") {
      await this.deps.paymentRepo.create(ctx, {
        clientId: this.requiredString(payload.clientId, "clientId"),
        amount: this.requiredNumericString(payload.amount, "amount"),
        paymentMethod: this.requiredPaymentMethod(payload.paymentMethod),
        notes: this.optionalString(payload.notes),
      });
      return;
    }

    if (operation.action === "delete") {
      const existing = await this.deps.paymentRepo.findById(ctx, operation.entityId);
      if (!existing) {
        return;
      }

      await this.deps.paymentRepo.delete(ctx, operation.entityId);
      return;
    }

    throw new ValidationError("Update de abonos no soportado en v1");
  }

  private async applyDistribucionOperation(
    ctx: RequestContext,
    operation: SyncOperationInput
  ) {
    const payload = operation.payload;

    if (operation.action === "insert") {
      const parsed = this.parseDistribucionInsert(payload);
      await this.deps.distribucionRepo.create(ctx, parsed);
      return;
    }

    if (operation.action === "update") {
      const updated = await this.deps.distribucionRepo.update(ctx, operation.entityId, {
        ...(payload.puntoVenta !== undefined && {
          puntoVenta: this.requiredString(payload.puntoVenta, "puntoVenta"),
        }),
        ...(payload.kilosAsignados !== undefined && {
          kilosAsignados: this.requiredNumericString(
            payload.kilosAsignados,
            "kilosAsignados"
          ),
        }),
        ...(payload.kilosVendidos !== undefined && {
          kilosVendidos: this.requiredNumericString(payload.kilosVendidos, "kilosVendidos"),
        }),
        ...(payload.montoRecaudado !== undefined && {
          montoRecaudado: this.requiredNumericString(
            payload.montoRecaudado,
            "montoRecaudado"
          ),
        }),
        ...(payload.fecha !== undefined && {
          fecha: this.requiredString(payload.fecha, "fecha"),
        }),
        ...(payload.estado !== undefined && {
          estado: this.requiredDistribucionStatus(payload.estado),
        }),
      });

      if (!updated) {
        throw new ValidationError("Distribución no encontrada");
      }
      return;
    }

    const existing = await this.deps.distribucionRepo.findById(ctx, operation.entityId);
    if (!existing) {
      return;
    }

    await this.deps.distribucionRepo.delete(ctx, operation.entityId);
  }

  private parseSaleInsert(payload: Record<string, unknown>): ParsedSaleInsert {
    const saleType = this.requiredSaleType(payload.saleType);
    const totalAmount = this.requiredNumericString(payload.totalAmount, "totalAmount");
    const amountPaid = this.optionalNumericString(payload.amountPaid) ?? "0";
    const total = Number(totalAmount);
    const paid = Number(amountPaid);

    const balanceDue =
      saleType === "credito" ? Math.max(total - paid, 0).toString() : "0";

    const rawItems = Array.isArray(payload.items) ? payload.items : [];

    if (rawItems.length === 0) {
      throw new ValidationError("La venta requiere items");
    }

    const items = rawItems.map((item, index) => {
      if (!item || typeof item !== "object") {
        throw new ValidationError(`Item inválido en posición ${index}`);
      }

      const safe = item as Record<string, unknown>;
      return {
        productId: this.requiredString(safe.productId, "productId"),
        variantId: this.requiredString(safe.variantId, "variantId"),
        productName: this.requiredString(safe.productName, "productName"),
        variantName: this.requiredString(safe.variantName, "variantName"),
        quantity: this.requiredNumericString(safe.quantity, "quantity"),
        unitPrice: this.requiredNumericString(safe.unitPrice, "unitPrice"),
        subtotal: this.requiredNumericString(safe.subtotal, "subtotal"),
      };
    });

    return {
      clientId: this.optionalString(payload.clientId),
      saleType,
      totalAmount,
      amountPaid,
      balanceDue,
      tara: this.optionalNumericString(payload.tara),
      netWeight: this.optionalNumericString(payload.netWeight),
      items,
    };
  }

  private parseDistribucionInsert(
    payload: Record<string, unknown>
  ): ParsedDistribucionInsert {
    return {
      vendedorId: this.requiredString(payload.vendedorId, "vendedorId"),
      puntoVenta: this.requiredString(payload.puntoVenta, "puntoVenta"),
      kilosAsignados: this.requiredNumericString(payload.kilosAsignados, "kilosAsignados"),
      kilosVendidos: this.optionalNumericString(payload.kilosVendidos) ?? "0",
      montoRecaudado: this.optionalNumericString(payload.montoRecaudado) ?? "0",
      fecha:
        this.optionalString(payload.fecha) ?? new Date().toISOString().split("T")[0],
      estado: this.optionalDistribucionStatus(payload.estado) ?? "activo",
      syncStatus: "pending",
      syncAttempts: 0,
    };
  }

  private requiredSaleType(value: unknown): "contado" | "credito" {
    if (value === "contado" || value === "credito") {
      return value;
    }
    throw new ValidationError("saleType inválido");
  }

  private requiredPaymentMethod(
    value: unknown
  ): "efectivo" | "yape" | "plin" | "transferencia" {
    if (
      value === "efectivo" ||
      value === "yape" ||
      value === "plin" ||
      value === "transferencia"
    ) {
      return value;
    }
    throw new ValidationError("paymentMethod inválido");
  }

  private requiredDistribucionStatus(value: unknown): "activo" | "cerrado" | "en_ruta" {
    if (value === "activo" || value === "cerrado" || value === "en_ruta") {
      return value;
    }
    throw new ValidationError("estado inválido");
  }

  private optionalDistribucionStatus(
    value: unknown
  ): "activo" | "cerrado" | "en_ruta" | undefined {
    if (value === undefined) {
      return undefined;
    }
    return this.requiredDistribucionStatus(value);
  }

  private requiredString(value: unknown, field: string): string {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
    throw new ValidationError(`${field} es requerido`);
  }

  private optionalString(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }

    return undefined;
  }

  private requiredNumericString(value: unknown, field: string): string {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value.toString();
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed.toString();
      }
    }

    throw new ValidationError(`${field} inválido`);
  }

  private optionalNumericString(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return value.toString();
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed.toString() : undefined;
    }

    return undefined;
  }
}
