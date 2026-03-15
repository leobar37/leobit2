import { and, asc, eq, gte } from "drizzle-orm";
import type { RequestContext } from "../../context/request-context";
import { ValidationError, ConflictError } from "../../errors";
import { db, syncOperations } from "../../lib/db";
import { logger } from "../../lib/logger";
import type { DbTransaction } from "../../lib/txid";
import type { CustomerRepository } from "../repository/customer.repository";
import type { SaleRepository } from "../repository/sale.repository";
import type { PaymentRepository } from "../repository/payment.repository";
import type { DistribucionRepository } from "../repository/distribucion.repository";
import type { DistribucionService } from "../business/distribucion.service";
import { toISODate, now, getToday } from "../../lib/date-utils";
import { sales, customers } from "../../db/schema";

export type SyncEntity =
  | "customers"
  | "sales"
  | "sale_items"
  | "abonos"
  | "distribuciones";

export type SyncOperationType = "create" | "update" | "delete";

export interface SyncOperationInput {
  idempotencyKey: string;
  entityType: SyncEntity;
  entityId: string;
  operation: SyncOperationType;
  payload: Record<string, unknown>;
  localVersion: number;
  localTimestamp: string;
  syncGroupId?: string;
}

export interface SyncOperationResult {
  idempotencyKey: string;
  success: boolean;
  error?: string;
  conflict?: {
    serverVersion: number;
    serverData: Record<string, unknown>;
  };
  serverTimestamp: string;
}

export interface SyncBatchResult {
  results: SyncOperationResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    conflicts: number;
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
  customerId?: string;
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
    logger.info(
      { operations: operations.length, businessId: ctx.businessId },
      "📥 Sync batch received"
    );

    // DETAILED LOGGING: Log each operation
    for (const op of operations) {
      logger.info({
        msg: "📋 Processing operation",
        idempotencyKey: op.idempotencyKey,
        entityType: op.entityType,
        operation: op.operation,
        entityId: op.entityId,
        payload: op.payload,
      });
    }

    const results: SyncOperationResult[] = [];
    const nowIso = toISODate(now());

    // Group operations by syncGroupId
    const groupedOperations = this.groupOperationsBySyncGroup(operations);
    const groupIds = Object.keys(groupedOperations);

    logger.debug({ groups: groupIds.length, operationsByGroup: Object.fromEntries(
      Object.entries(groupedOperations).map(([k, v]) => [k, v.length])
    ) }, "Grouped operations");

    for (const groupId of groupIds) {
      const groupOps = groupedOperations[groupId];

      logger.debug({ groupId, operations: groupOps.length }, "Processing sync group");
      // Process all operations in the group atomically
      const groupResult = await this.processGroupAtomically(
        ctx,
        groupOps,
        nowIso
      );
      results.push(...groupResult);
    }

    const succeeded = results.filter((item) => item.success && !item.conflict).length;
    const conflicts = results.filter((item) => item.conflict !== undefined).length;
    const failed = results.length - succeeded - conflicts;

    // Summarize sales operations specifically
    const saleOperations = operations.filter((op) => op.entityType === "sales");
    const saleResults = results.filter((r) =>
      operations.some((op) => op.idempotencyKey === r.idempotencyKey && op.entityType === "sales")
    );
    const salesSucceeded = saleResults.filter((r) => r.success && !r.conflict).length;
    const salesFailed = saleResults.filter((r) => !r.success && !r.conflict).length;
    const salesConflicts = saleResults.filter((r) => r.conflict !== undefined).length;

    logger.info(
      {
        summary: { total: results.length, succeeded, failed, conflicts },
        sales: saleOperations.length > 0 ? {
          total: saleOperations.length,
          succeeded: salesSucceeded,
          failed: salesFailed,
          conflicts: salesConflicts,
          operations: saleOperations.map((op) => ({
            operation: op.operation,
            entityId: op.entityId,
            status: op.payload?.status,
          })),
        } : undefined,
      },
      saleOperations.length > 0 ? "📤 Sync batch completed (with sales)" : "📤 Sync batch completed"
    );

    return {
      results,
      summary: {
        total: results.length,
        succeeded,
        failed,
        conflicts,
      },
    };
  }

  private groupOperationsBySyncGroup(
    operations: SyncOperationInput[]
  ): Record<string, SyncOperationInput[]> {
    const groups: Record<string, SyncOperationInput[]> = {};

    for (const op of operations) {
      const groupId = op.syncGroupId || op.idempotencyKey;
      if (!groups[groupId]) {
        groups[groupId] = [];
      }
      groups[groupId].push(op);
    }

    return groups;
  }

  private async processGroupAtomically(
    ctx: RequestContext,
    operations: SyncOperationInput[],
    nowIso: string
  ): Promise<SyncOperationResult[]> {
    const results: SyncOperationResult[] = [];

    // Check idempotency for all operations first
    const idempotencyResults = await this.checkIdempotency(ctx, operations);
    
    // If any operation was already processed, return success for those
    for (const [key, result] of Object.entries(idempotencyResults)) {
      if (result.alreadyProcessed) {
        results.push({
          idempotencyKey: key,
          success: true,
          serverTimestamp: result.serverTimestamp || nowIso,
        });
      }
    }

    // Get operations that need processing
    const pendingOps = operations.filter(
      (op) => !idempotencyResults[op.idempotencyKey]?.alreadyProcessed
    );

    if (pendingOps.length === 0) {
      return results;
    }

    // Check for conflicts in update operations
    const conflictResults = await this.checkConflicts(ctx, pendingOps);
    for (const [key, conflict] of Object.entries(conflictResults)) {
      if (conflict.hasConflict) {
        results.push({
          idempotencyKey: key,
          success: false,
          conflict: {
            serverVersion: conflict.serverVersion!,
            serverData: conflict.serverData!,
          },
          serverTimestamp: nowIso,
        });
      }
    }

    // Get operations without conflicts
    const opsToProcess = pendingOps.filter(
      (op) => !conflictResults[op.idempotencyKey]?.hasConflict
    );

    if (opsToProcess.length === 0) {
      return results;
    }

    // Process all operations in a transaction (atomic)
    try {
      await db.transaction(async (tx) => {
        for (const operation of opsToProcess) {
          try {
            // Insert sync operation record
            await tx.insert(syncOperations).values({
              businessId: ctx.businessId,
              operationId: operation.idempotencyKey,
              entity: operation.entityType,
              action: operation.operation,
              entityId: operation.entityId,
              payload: operation.payload,
              status: "pending",
              clientTimestamp: new Date(operation.localTimestamp),
            });

            // Apply the operation
            logger.debug(
              { entityType: operation.entityType, operation: operation.operation, entityId: operation.entityId },
              "⚡ Applying operation"
            );
            await this.applyOperation(ctx, operation, tx);

            // Mark as processed
            await tx
              .update(syncOperations)
              .set({
                status: "processed",
                error: null,
                processedAt: now(),
              })
              .where(
                and(
                  eq(syncOperations.businessId, ctx.businessId),
                  eq(syncOperations.operationId, operation.idempotencyKey)
                )
              );

            // Update entity sync_status to synced for offline tables
            if (operation.entityType === "sales") {
              await tx
                .update(sales)
                .set({
                  syncStatus: "synced",
                  syncAttempts: 0,
                })
                .where(
                  and(
                    eq(sales.id, operation.entityId),
                    eq(sales.businessId, ctx.businessId)
                  )
                );
            } else if (operation.entityType === "customers") {
              await tx
                .update(customers)
                .set({
                  syncStatus: "synced",
                  syncAttempts: 0,
                })
                .where(
                  and(
                    eq(customers.id, operation.entityId),
                    eq(customers.businessId, ctx.businessId)
                  )
                );
            }

            results.push({
              idempotencyKey: operation.idempotencyKey,
              success: true,
              serverTimestamp: nowIso,
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            const stack = error instanceof Error ? error.stack : undefined;

            // Enhanced logging for sale operations
            const isSaleOperation = operation.entityType === "sales";
            logger.error(
              {
                entityType: operation.entityType,
                operation: operation.operation,
                entityId: operation.entityId,
                error: message,
                stack,
                businessId: ctx.businessId,
                userId: ctx.businessUserId,
                ...(isSaleOperation && {
                  saleDetails: {
                    requestedStatus: operation.payload?.status,
                    requestedTotal: operation.payload?.totalAmount,
                    hasItems: Array.isArray(operation.payload?.items),
                    itemCount: operation.payload?.items?.length,
                    payloadKeys: Object.keys(operation.payload || {}),
                  }
                }),
              },
              isSaleOperation ? "❌ SALE OPERATION FAILED" : "❌ Operation failed with details"
            );

            await tx
              .update(syncOperations)
              .set({
                status: "failed",
                error: message,
              })
              .where(
                and(
                  eq(syncOperations.businessId, ctx.businessId),
                  eq(syncOperations.operationId, operation.idempotencyKey)
                )
              );

            results.push({
              idempotencyKey: operation.idempotencyKey,
              success: false,
              error: message,
              serverTimestamp: nowIso,
            });
          }
        }
      });
    } catch (error) {
      // Transaction failed - mark all as failed
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error(
        {
          operationsCount: opsToProcess.length,
          error: errorMessage,
          stack: errorStack,
        },
        "❌ Transaction failed - all operations marked as failed"
      );

      for (const operation of opsToProcess) {
        const alreadyHasResult = results.find(
          (r) => r.idempotencyKey === operation.idempotencyKey
        );
        if (!alreadyHasResult) {
          results.push({
            idempotencyKey: operation.idempotencyKey,
            success: false,
            error: error instanceof Error ? error.message : "Transaction failed",
            serverTimestamp: nowIso,
          });
        }
      }
    }

    return results;
  }

  private async checkIdempotency(
    ctx: RequestContext,
    operations: SyncOperationInput[]
  ): Promise<Record<string, { alreadyProcessed: boolean; serverTimestamp?: string }>> {
    const results: Record<string, { alreadyProcessed: boolean; serverTimestamp?: string }> = {};

    for (const operation of operations) {
      const existing = await db.query.syncOperations.findFirst({
        where: and(
          eq(syncOperations.businessId, ctx.businessId),
          eq(syncOperations.operationId, operation.idempotencyKey)
        ),
      });

      results[operation.idempotencyKey] = {
        alreadyProcessed: existing?.status === "processed",
        serverTimestamp: existing?.processedAt?.toISOString(),
      };
    }

    return results;
  }

  private async checkConflicts(
    ctx: RequestContext,
    operations: SyncOperationInput[]
  ): Promise<
    Record<
      string,
      { hasConflict: boolean; serverVersion?: number; serverData?: Record<string, unknown> }
    >
  > {
    const results: Record<
      string,
      { hasConflict: boolean; serverVersion?: number; serverData?: Record<string, unknown> }
    > = {};

    for (const operation of operations) {
      // Only check conflicts for updates
      if (operation.operation !== "update") {
        results[operation.idempotencyKey] = { hasConflict: false };
        continue;
      }

      try {
        const conflictCheck = await this.checkEntityConflict(ctx, operation);
        results[operation.idempotencyKey] = conflictCheck;
      } catch {
        // If we can't check (entity doesn't exist), it's not a conflict
        results[operation.idempotencyKey] = { hasConflict: false };
      }
    }

    return results;
  }

  private async checkEntityConflict(
    ctx: RequestContext,
    operation: SyncOperationInput
  ): Promise<{ hasConflict: boolean; serverVersion?: number; serverData?: Record<string, unknown> }> {
    switch (operation.entityType) {
      case "customers": {
        const customer = await this.deps.customerRepo.findById(ctx, operation.entityId);
        if (!customer) {
          return { hasConflict: false };
        }
        // Use updatedAt as version for customers
        const serverTimestamp = customer.updatedAt.getTime();
        const localTimestamp = new Date(operation.localTimestamp).getTime();
        if (serverTimestamp > localTimestamp) {
          return {
            hasConflict: true,
            serverVersion: Math.floor(serverTimestamp / 1000),
            serverData: {
              name: customer.name,
              dni: customer.dni,
              phone: customer.phone,
              address: customer.address,
              notes: customer.notes,
              updatedAt: customer.updatedAt.toISOString(),
            },
          };
        }
        return { hasConflict: false };
      }
      case "sales": {
        const sale = await this.deps.saleRepo.findById(ctx, operation.entityId);
        if (!sale) {
          logger.debug({ msg: "Conflict check - sale not found (no conflict)", entityId: operation.entityId });
          return { hasConflict: false };
        }
        // Sales have explicit version field
        if (sale.version > operation.localVersion) {
          logger.warn({
            msg: "⚠️ Sale conflict detected",
            entityId: operation.entityId,
            serverVersion: sale.version,
            clientVersion: operation.localVersion,
            serverStatus: sale.status,
            serverUpdatedAt: sale.updatedAt.toISOString(),
          });
          return {
            hasConflict: true,
            serverVersion: sale.version,
            serverData: {
              status: sale.status,
              totalAmount: sale.totalAmount,
              amountPaid: sale.amountPaid,
              balanceDue: sale.balanceDue,
              version: sale.version,
              updatedAt: sale.updatedAt.toISOString(),
            },
          };
        }
        logger.debug({
          msg: "Conflict check - no conflict",
          entityId: operation.entityId,
          serverVersion: sale.version,
          clientVersion: operation.localVersion,
        });
        return { hasConflict: false };
      }
      case "abonos": {
        const payment = await this.deps.paymentRepo.findById(ctx, operation.entityId);
        if (!payment) {
          return { hasConflict: false };
        }
        const serverTimestamp = payment.createdAt.getTime();
        const localTimestamp = new Date(operation.localTimestamp).getTime();
        if (serverTimestamp > localTimestamp) {
          return {
            hasConflict: true,
            serverVersion: Math.floor(serverTimestamp / 1000),
            serverData: {
              amount: payment.amount,
              paymentMethod: payment.paymentMethod,
              createdAt: payment.createdAt.toISOString(),
            },
          };
        }
        return { hasConflict: false };
      }
      case "distribuciones": {
        const distribucion = await this.deps.distribucionRepo.findById(ctx, operation.entityId);
        if (!distribucion) {
          return { hasConflict: false };
        }
        const serverTimestamp = distribucion.createdAt.getTime();
        const localTimestamp = new Date(operation.localTimestamp).getTime();
        if (serverTimestamp > localTimestamp) {
          return {
            hasConflict: true,
            serverVersion: Math.floor(serverTimestamp / 1000),
            serverData: {
              puntoVenta: distribucion.puntoVenta,
              estado: distribucion.estado,
              createdAt: distribucion.createdAt.toISOString(),
            },
          };
        }
        return { hasConflict: false };
      }
      default:
        return { hasConflict: false };
    }
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
        idempotencyKey: item.operationId,
        entityType: item.entity,
        operation: item.action,
        entityId: item.entityId,
        payload: item.payload,
        localTimestamp: item.clientTimestamp.toISOString(),
        processedAt: item.processedAt?.toISOString() ?? item.createdAt.toISOString(),
      })),
      nextSince:
        last?.processedAt?.toISOString() ?? last?.createdAt.toISOString() ?? since?.toISOString(),
    };
  }

  private validateOperation(operation: SyncOperationInput) {
    if (!operation.idempotencyKey) {
      throw new ValidationError("idempotencyKey es requerido");
    }

    if (!operation.entityId) {
      throw new ValidationError("entityId es requerido");
    }

    if (!operation.localTimestamp) {
      throw new ValidationError("localTimestamp es requerido");
    }

    if (!Number.isFinite(new Date(operation.localTimestamp).getTime())) {
      throw new ValidationError("localTimestamp inválido");
    }
  }

  private async applyOperation(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ) {
    switch (operation.entityType) {
      case "customers":
        await this.applyCustomerOperation(ctx, operation, tx);
        return;
      case "sales":
        await this.applySalesOperation(ctx, operation, tx);
        return;
      case "abonos":
        await this.applyAbonosOperation(ctx, operation, tx);
        return;
      case "distribuciones":
        await this.applyDistribucionOperation(ctx, operation, tx);
        return;
      case "sale_items":
        await this.applySaleItemOperation(ctx, operation, tx);
        return;
      default:
        throw new ValidationError(`Entidad no soportada: ${operation.entityType}`);
    }
  }

  private async applyCustomerOperation(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ) {
    const payload = operation.payload;

    if (operation.operation === "create") {
      await this.deps.customerRepo.create(ctx, {
        name: this.requiredString(payload.name, "name"),
        dni: this.optionalString(payload.dni),
        phone: this.optionalString(payload.phone),
        address: this.optionalString(payload.address),
        notes: this.optionalString(payload.notes),
      });
      return;
    }

    if (operation.operation === "update") {
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

  private async applySalesOperation(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ) {
    const payload = operation.payload;
    const dbOrTx = tx || db;

    logger.info({
      msg: "🔄 Processing sales operation",
      operation: operation.operation,
      entityId: operation.entityId,
      businessId: ctx.businessId,
      userId: ctx.businessUserId,
      payloadKeys: Object.keys(payload),
    });

    if (operation.operation === "create") {
      const sale = this.parseSaleInsert(payload);
      logger.debug({
        msg: "📦 Creating sale from sync",
        saleId: operation.entityId,
        saleType: sale.saleType,
        totalAmount: sale.totalAmount,
        itemCount: sale.items?.length || 0,
      });
      await dbOrTx.transaction(async (innerTx) => {
        const createdSale = await this.deps.saleRepo.create(ctx, sale, innerTx);

        if (sale.saleType === "credito" && sale.customerId && Number(sale.amountPaid) > 0) {
          const initialPaymentReference = `init-sale:${createdSale.id}`;
          await this.deps.paymentRepo.createInitialPayment(
            ctx,
            {
              customerId: sale.customerId,
              amount: Number(sale.amountPaid).toFixed(2),
              referenceNumber: initialPaymentReference,
            },
            innerTx
          );
        }
      });
      logger.info({ msg: "✅ Sale created via sync", saleId: operation.entityId });
      return;
    }

    if (operation.operation === "update") {
      const existing = await this.deps.saleRepo.findById(ctx, operation.entityId);
      if (!existing) {
        logger.error({
          msg: "❌ Sale update failed - not found",
          saleId: operation.entityId,
          businessId: ctx.businessId,
        });
        throw new ValidationError("Venta no encontrada");
      }

      logger.info({
        msg: "📝 Processing sale update",
        saleId: operation.entityId,
        existingStatus: existing.status,
        existingType: existing.type,
        existingVersion: existing.version,
        requestedStatus: payload.status,
        payloadKeys: Object.keys(payload),
        hasItems: Array.isArray(payload.items),
        itemCount: Array.isArray(payload.items) ? payload.items.length : 0,
      });

      if (payload.status === "active" && existing.status === "draft" && existing.type === "instant_sale") {
        logger.info({
          msg: "🚀 Confirming instant sale",
          saleId: operation.entityId,
          fromStatus: existing.status,
          toStatus: "active",
        });
        await this.deps.saleRepo.update(ctx, operation.entityId, {
          status: "active",
        });
        logger.info({ msg: "✅ Instant sale confirmed", saleId: operation.entityId });
        return;
      }

      if (payload.status === "confirmed" && existing.status === "draft" && existing.type === "pre_order") {
        logger.info({
          msg: "📦 Confirming pre-order",
          saleId: operation.entityId,
          fromStatus: existing.status,
          toStatus: "confirmed",
          version: existing.version,
        });
        await this.deps.saleRepo.confirmPreOrder(ctx, operation.entityId, existing.version);
        logger.info({ msg: "✅ Pre-order confirmed", saleId: operation.entityId });
        return;
      }

      if (payload.status === "delivered" && existing.status === "confirmed" && existing.type === "pre_order") {
        logger.info({
          msg: "🚚 Delivering pre-order",
          saleId: operation.entityId,
          fromStatus: existing.status,
          toStatus: "delivered",
          version: existing.version,
        });
        await this.deps.saleRepo.deliverPreOrder(ctx, operation.entityId, existing.version);
        logger.info({ msg: "✅ Pre-order delivered", saleId: operation.entityId });
        return;
      }

      if (payload.status === "cancelled") {
        logger.info({
          msg: "❌ Cancelling sale",
          saleId: operation.entityId,
          fromStatus: existing.status,
          refundAmount: payload.refundAmount,
        });
        await this.deps.saleRepo.update(ctx, operation.entityId, {
          status: "cancelled",
          cancelledAt: now(),
          cancelledBy: ctx.businessUserId,
          cancelReason: this.optionalString(payload.cancelReason) || "Cancelación",
          refundAmount: this.optionalNumericString(payload.refundAmount),
          refundMethod: payload.refundMethod as any,
        });
        logger.info({ msg: "✅ Sale cancelled", saleId: operation.entityId });
        return;
      }

      // Check if items are included in the payload - use updateWithItems for atomic item sync
      if (Array.isArray(payload.items)) {
        logger.info({
          msg: "📝 Updating sale with items",
          saleId: operation.entityId,
          itemCount: payload.items.length,
          updateFields: Object.keys(payload).filter(k => k !== "items"),
        });
        const updateData: Parameters<typeof this.deps.saleRepo.updateWithItems>[2] = {
          ...(payload.customerId !== undefined && { customerId: this.optionalString(payload.customerId) }),
          ...(payload.deliveryDate !== undefined && { deliveryDate: this.optionalString(payload.deliveryDate) }),
          ...(payload.saleType !== undefined && { saleType: this.requiredSaleType(payload.saleType) }),
          ...(payload.totalAmount !== undefined && { totalAmount: this.requiredNumericString(payload.totalAmount, "totalAmount") }),
          items: this.parseSaleItemsForUpdate(payload.items),
        };
        await this.deps.saleRepo.updateWithItems(ctx, operation.entityId, updateData);
        logger.info({ msg: "✅ Sale updated with items", saleId: operation.entityId });
      } else {
        logger.info({
          msg: "📝 Updating sale (no items)",
          saleId: operation.entityId,
          updateFields: Object.keys(payload),
        });
        await this.deps.saleRepo.update(ctx, operation.entityId, {
          ...(payload.customerId !== undefined && { customerId: this.optionalString(payload.customerId) }),
          ...(payload.deliveryDate !== undefined && { deliveryDate: this.optionalString(payload.deliveryDate) }),
          ...(payload.saleType !== undefined && { saleType: this.requiredSaleType(payload.saleType) }),
          ...(payload.totalAmount !== undefined && { totalAmount: this.requiredNumericString(payload.totalAmount, "totalAmount") }),
        });
        logger.info({ msg: "✅ Sale updated", saleId: operation.entityId });
      }
      return;
    }

    if (operation.operation === "delete") {
      const existing = await this.deps.saleRepo.findById(ctx, operation.entityId);
      if (!existing) {
        logger.warn({ msg: "⚠️ Sale delete skipped - not found", saleId: operation.entityId });
        return;
      }

      logger.info({ msg: "🗑️ Deleting sale", saleId: operation.entityId, status: existing.status });
      await this.deps.saleRepo.delete(ctx, operation.entityId);
      logger.info({ msg: "✅ Sale deleted", saleId: operation.entityId });
      return;
    }

    logger.error({ msg: "❌ Unsupported sale operation", operation: operation.operation });
    throw new ValidationError("Acción no soportada para ventas");
  }

  private async applyAbonosOperation(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ) {
    const payload = operation.payload;

    logger.info({
      msg: "💳 Applying abonos operation",
      operation: operation.operation,
      entityId: operation.entityId,
      payload,
    });

    if (operation.operation === "create") {
      logger.info({
        msg: "💳 Creating abono",
        customerId: payload.customerId,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
      });

      await this.deps.paymentRepo.create(ctx, {
        customerId: this.requiredString(payload.customerId, "customerId"),
        amount: this.requiredNumericString(payload.amount, "amount"),
        paymentMethod: this.requiredPaymentMethod(payload.paymentMethod),
        notes: this.optionalString(payload.notes),
      });
      return;
    }

    if (operation.operation === "delete") {
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
    operation: SyncOperationInput,
    tx?: DbTransaction
  ) {
    const payload = operation.payload;

    if (operation.operation === "create") {
      const parsed = this.parseDistribucionInsert(payload);
      await this.deps.distribucionService.createDistribucion(ctx, parsed);
      return;
    }

    if (operation.operation === "update") {
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

  private async applySaleItemOperation(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx?: DbTransaction
  ) {
    const payload = operation.payload;

    // Validate saleId is present for all operations
    const saleId = this.requiredString(payload.saleId, "saleId");

    if (operation.operation === "create") {
      // Use provided transaction or create new one
      const executeCreate = async (executor: DbTransaction) => {
        // Get sale within transaction to avoid race conditions
        const sale = await this.deps.saleRepo.findById(ctx, saleId, executor);
        if (!sale) {
          throw new ValidationError(`Venta ${saleId} no encontrada`);
        }

        await this.deps.saleRepo.addItem(ctx, saleId, {
          id: operation.entityId, // Use the ID from the sync operation
          productId: this.requiredString(payload.productId, "productId"),
          productName: this.requiredString(payload.productName, "productName"),
          variantId: this.requiredString(payload.variantId, "variantId"),
          variantName: this.requiredString(payload.variantName, "variantName"),
          quantity: this.optionalNumericString(payload.quantity),
          orderedQuantity: this.optionalNumericString(payload.orderedQuantity),
          unitPrice: this.optionalNumericString(payload.unitPrice),
          unitPriceQuoted: this.optionalNumericString(payload.unitPriceQuoted),
          subtotal: this.requiredNumericString(payload.subtotal, "subtotal"),
        }, executor);

        // Update sale totals
        const itemSubtotal = parseFloat(this.requiredNumericString(payload.subtotal, "subtotal"));
        const newTotal = parseFloat(sale.totalAmount) + itemSubtotal;
        const newBalanceDue = Math.max(newTotal - parseFloat(sale.amountPaid), 0);

        await this.deps.saleRepo.update(ctx, saleId, {
          totalAmount: newTotal.toFixed(2),
          balanceDue: newBalanceDue.toFixed(2),
        }, executor);
      };

      if (tx) {
        await executeCreate(tx);
      } else {
        await db.transaction(executeCreate);
      }
      return;
    }

    if (operation.operation === "update") {
      const executeUpdate = async (executor: DbTransaction) => {
        // Get sale within transaction to avoid race conditions
        const sale = await this.deps.saleRepo.findById(ctx, saleId, executor);
        if (!sale) {
          throw new ValidationError(`Venta ${saleId} no encontrada`);
        }

        const existingItem = await this.deps.saleRepo.findItemById(ctx, saleId, operation.entityId, executor);
        if (!existingItem) {
          throw new ValidationError("Item no encontrado");
        }

        const oldSubtotal = parseFloat(existingItem.subtotal);
        const newSubtotal = payload.subtotal !== undefined
          ? parseFloat(this.requiredNumericString(payload.subtotal, "subtotal"))
          : oldSubtotal;
        const subtotalDiff = newSubtotal - oldSubtotal;

        await this.deps.saleRepo.updateItem(ctx, saleId, operation.entityId, {
          quantity: this.optionalNumericString(payload.quantity),
          unitPrice: this.optionalNumericString(payload.unitPrice),
          subtotal: this.optionalNumericString(payload.subtotal),
          isModified: true,
        }, executor);

        // Update sale totals if subtotal changed
        if (Math.abs(subtotalDiff) > 0.01) {
          const newTotal = parseFloat(sale.totalAmount) + subtotalDiff;
          const newBalanceDue = Math.max(newTotal - parseFloat(sale.amountPaid), 0);

          await this.deps.saleRepo.update(ctx, saleId, {
            totalAmount: newTotal.toFixed(2),
            balanceDue: newBalanceDue.toFixed(2),
          }, executor);
        }
      };

      if (tx) {
        await executeUpdate(tx);
      } else {
        await db.transaction(executeUpdate);
      }
      return;
    }

    if (operation.operation === "delete") {
      const executeDelete = async (executor: DbTransaction) => {
        // Get sale within transaction to avoid race conditions
        const sale = await this.deps.saleRepo.findById(ctx, saleId, executor);
        if (!sale) {
          throw new ValidationError(`Venta ${saleId} no encontrada`);
        }

        const existingItem = await this.deps.saleRepo.findItemById(ctx, saleId, operation.entityId, executor);
        if (!existingItem) {
          return; // Already deleted, idempotent
        }

        const subtotal = parseFloat(existingItem.subtotal);

        await this.deps.saleRepo.deleteItem(ctx, saleId, operation.entityId, executor);

        // Update sale totals
        const newTotal = parseFloat(sale.totalAmount) - subtotal;
        const newBalanceDue = Math.max(newTotal - parseFloat(sale.amountPaid), 0);

        await this.deps.saleRepo.update(ctx, saleId, {
          totalAmount: newTotal.toFixed(2),
          balanceDue: newBalanceDue.toFixed(2),
        }, executor);
      };

      if (tx) {
        await executeDelete(tx);
      } else {
        await db.transaction(executeDelete);
      }
      return;
    }

    throw new ValidationError("Acción no soportada para sale_items");
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
    const customerId = this.optionalString(payload.customerId);

    if (saleType === "credito" && !customerId) {
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
      customerId,
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

  private parseSaleItemsForUpdate(
    rawItems: unknown[]
  ): Array<{
    id?: string;
    productId: string;
    productName: string;
    variantId: string;
    variantName: string;
    quantity?: string;
    orderedQuantity?: string;
    unitPrice?: string;
    unitPriceQuoted?: string;
    subtotal: string;
  }> {
    if (!Array.isArray(rawItems)) {
      return [];
    }

    return rawItems.map((item, index) => {
      if (!item || typeof item !== "object") {
        throw new ValidationError(`Item inválido en posición ${index}`);
      }

      const safe = item as Record<string, unknown>;

      return {
        id: this.optionalString(safe.id),
        productId: this.requiredString(safe.productId, "productId"),
        productName: this.requiredString(safe.productName, "productName"),
        variantId: this.requiredString(safe.variantId, "variantId"),
        variantName: this.requiredString(safe.variantName, "variantName"),
        quantity: this.optionalNumericString(safe.quantity),
        orderedQuantity: this.optionalNumericString(safe.orderedQuantity),
        unitPrice: this.optionalNumericString(safe.unitPrice),
        unitPriceQuoted: this.optionalNumericString(safe.unitPriceQuoted),
        subtotal: this.requiredNumericString(safe.subtotal, "subtotal"),
      };
    });
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
