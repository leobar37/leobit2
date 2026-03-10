import { and, asc, eq, gte } from "drizzle-orm";
import type { RequestContext } from "../../context/request-context";
import { ValidationError } from "../../errors";
import { db, syncOperations } from "../../lib/db";
import type { CustomerRepository } from "../repository/customer.repository";
import type { SaleRepository } from "../repository/sale.repository";
import type { PaymentRepository } from "../repository/payment.repository";
import type { DistribucionRepository } from "../repository/distribucion.repository";
import type { DistribucionService } from "../business/distribucion.service";
import { toISODate, now, getToday } from "../../lib/date-utils";

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
  distribucionService: DistribucionService;
}

type ParsedSaleInsert = {
  clientId?: string;
  type: "instant_sale" | "pre_order";
  saleType: "contado" | "credito";
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  tara?: string;
  netWeight?: string;
  deliveryDate?: string;
  orderDate?: string;
  items: Array<{
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
    quantity?: string;
    orderedQuantity?: string;
    unitPrice?: string;
    unitPriceQuoted?: string;
    subtotal: string;
  }>;
};

type ParsedDistribucionInsert = {
  vendedorId: string;
  puntoVenta: string;
  fecha?: string;
  modo?: "estricto" | "acumulativo" | "libre";
  confiarEnVendedor?: boolean;
  items: Array<{
    variantId: string;
    cantidadAsignada: number;
    unidad: string;
  }>;
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
      const nowIso = toISODate(now());

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
        const processedAt = now();

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
          serverTimestamp: toISODate(processedAt),
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
        // sale_items are synced directly via collection callbacks (onInsert/onUpdate/onDelete)
        // Not supported in batch sync - items should be synced as part of their parent sale
        throw new ValidationError("sale_items no se syncroniza via batch - sync directo");
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
      await db.transaction(async (tx) => {
        const createdSale = await this.deps.saleRepo.create(ctx, sale, tx);

        if (sale.saleType === "credito" && sale.clientId && Number(sale.amountPaid) > 0) {
          const initialPaymentReference = `init-sale:${createdSale.id}`;
          await this.deps.paymentRepo.createInitialPayment(
            ctx,
            {
              clientId: sale.clientId,
              amount: Number(sale.amountPaid).toFixed(2),
              referenceNumber: initialPaymentReference,
            },
            tx
          );
        }
      });
      return;
    }

    if (operation.action === "update") {
      const existing = await this.deps.saleRepo.findById(ctx, operation.entityId);
      if (!existing) {
        throw new ValidationError("Venta no encontrada");
      }

      // Handle status transitions
      if (payload.status === "active" && existing.status === "draft" && existing.type === "instant_sale") {
        await this.deps.saleRepo.confirm(ctx, operation.entityId);
        return;
      }

      if (payload.status === "confirmed" && existing.status === "draft" && existing.type === "pre_order") {
        await this.deps.saleRepo.confirmPreOrder(ctx, operation.entityId, existing.version);
        return;
      }

      if (payload.status === "delivered" && existing.status === "confirmed" && existing.type === "pre_order") {
        await this.deps.saleRepo.deliverPreOrder(ctx, operation.entityId, existing.version);
        return;
      }

      if (payload.status === "cancelled") {
        await this.deps.saleRepo.cancel(ctx, operation.entityId, {
          reason: this.optionalString(payload.cancelReason) || "Cancelación",
          refundAmount: this.optionalNumericString(payload.refundAmount),
          refundMethod: payload.refundMethod as any,
        });
        return;
      }

      // Regular update
      await this.deps.saleRepo.update(ctx, operation.entityId, {
        ...(payload.clientId !== undefined && { clientId: this.optionalString(payload.clientId) }),
        ...(payload.deliveryDate !== undefined && { deliveryDate: this.optionalString(payload.deliveryDate) }),
        ...(payload.saleType !== undefined && { saleType: this.requiredSaleType(payload.saleType) }),
        ...(payload.totalAmount !== undefined && { totalAmount: this.requiredNumericString(payload.totalAmount, "totalAmount") }),
      });
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

    throw new ValidationError("Acción no soportada para ventas");
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
      await this.deps.distribucionService.createDistribucion(ctx, parsed);
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
    const type = payload.type === "pre_order" ? "pre_order" : "instant_sale";
    const saleType = this.requiredSaleType(payload.saleType);
    const total = this.normalizedAmount(
      Number(this.requiredNumericString(payload.totalAmount, "totalAmount")),
      "totalAmount"
    );
    const amountPaidRaw = this.optionalNumericString(payload.amountPaid);
    const paid = this.normalizedAmount(
      Number(amountPaidRaw ?? (saleType === "contado" ? total.toFixed(2) : "0")),
      "amountPaid"
    );
    const clientId = this.optionalString(payload.clientId);

    if (saleType === "credito" && !clientId) {
      throw new ValidationError("La venta a crédito requiere cliente");
    }

    if (saleType === "contado" && Math.abs(paid - total) > 0.01) {
      throw new ValidationError("En venta al contado, el monto pagado debe ser igual al total");
    }

    if (saleType === "credito" && paid > total) {
      throw new ValidationError("El monto pagado no puede ser mayor al total");
    }

    const balanceDue = saleType === "credito" ? Math.max(total - paid, 0).toFixed(2) : "0.00";

    const rawItems = Array.isArray(payload.items) ? payload.items : [];

    if (rawItems.length === 0) {
      throw new ValidationError("La venta requiere items");
    }

    const items = rawItems.map((item, index) => {
      if (!item || typeof item !== "object") {
        throw new ValidationError(`Item inválido en posición ${index}`);
      }

      const safe = item as Record<string, unknown>;
      const isPreOrder = type === "pre_order" || safe.orderedQuantity !== undefined;

      return {
        productId: this.requiredString(safe.productId, "productId"),
        variantId: this.requiredString(safe.variantId, "variantId"),
        productName: this.requiredString(safe.productName, "productName"),
        variantName: this.requiredString(safe.variantName, "variantName"),
        // For instant_sales
        quantity: this.optionalNumericString(safe.quantity),
        unitPrice: this.optionalNumericString(safe.unitPrice),
        // For pre_orders
        orderedQuantity: isPreOrder ? this.requiredNumericString(safe.orderedQuantity ?? safe.quantity, "orderedQuantity") : undefined,
        unitPriceQuoted: this.optionalNumericString(safe.unitPriceQuoted ?? safe.unitPrice),
        subtotal: this.requiredNumericString(safe.subtotal, "subtotal"),
      };
    });

    return {
      clientId,
      type,
      saleType,
      totalAmount: total.toFixed(2),
      amountPaid: paid.toFixed(2),
      balanceDue,
      tara: this.optionalNumericString(payload.tara),
      netWeight: this.optionalNumericString(payload.netWeight),
      deliveryDate: this.optionalString(payload.deliveryDate),
      orderDate: this.optionalString(payload.orderDate),
      items,
    };
  }

  private normalizedAmount(value: number, field: string): number {
    if (!Number.isFinite(value)) {
      throw new ValidationError(`${field} inválido`);
    }

    return Math.max(0, Number(value.toFixed(2)));
  }

  private parseDistribucionInsert(
    payload: Record<string, unknown>
  ): ParsedDistribucionInsert {
    const rawItems = Array.isArray(payload.items) ? payload.items : [];

    if (rawItems.length === 0) {
      throw new ValidationError("La distribución requiere items");
    }

    const items = rawItems.map((item, index) => {
      if (!item || typeof item !== "object") {
        throw new ValidationError(`Item inválido en posición ${index}`);
      }

      const safe = item as Record<string, unknown>;
      return {
        variantId: this.requiredString(safe.variantId, "variantId"),
        cantidadAsignada: Number(
          this.requiredNumericString(safe.cantidadAsignada, "cantidadAsignada")
        ),
        unidad: this.requiredString(safe.unidad, "unidad"),
      };
    });

    return {
      vendedorId: this.requiredString(payload.vendedorId, "vendedorId"),
      puntoVenta: this.requiredString(payload.puntoVenta, "puntoVenta"),
      fecha: this.optionalString(payload.fecha) ?? getToday(),
      modo:
        payload.modo !== undefined
          ? this.requiredDistribucionMode(payload.modo)
          : undefined,
      confiarEnVendedor:
        payload.confiarEnVendedor !== undefined
          ? this.requiredBoolean(payload.confiarEnVendedor, "confiarEnVendedor")
          : undefined,
      items,
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

  private requiredDistribucionMode(
    value: unknown
  ): "estricto" | "acumulativo" | "libre" {
    if (
      value === "estricto" ||
      value === "acumulativo" ||
      value === "libre"
    ) {
      return value;
    }

    throw new ValidationError("modo inválido");
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

  private requiredBoolean(value: unknown, field: string): boolean {
    if (typeof value === "boolean") {
      return value;
    }

    throw new ValidationError(`${field} inválido`);
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
