import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import { db } from "../../../lib/db";
import { logger } from "../../../lib/logger";
import { toISODate, now } from "../../../lib/date-utils";
import { sql } from "drizzle-orm";
import type { SyncOperationInput, SyncOperationResult, SyncBatchResult } from "../types";
import type { SyncContext } from "./types";
import type { CustomerRepository } from "../../repository/customer.repository";
import type { SaleRepository } from "../../repository/sale.repository";
import type { PaymentRepository } from "../../repository/payment.repository";
import type { DistribucionRepository } from "../../repository/distribucion.repository";
import type { DistribucionService } from "../../business/distribucion.service";
import type { ProductRepository } from "../../repository/product.repository";
import type { TagRepository } from "../../repository/tag.repository";
import type { CustomerTagRepository } from "../../repository/customer-tag.repository";
import type { PurchaseRepository } from "../../repository/purchase.repository";
import type { ProductVariantRepository } from "../../repository/product-variant.repository";
import type { CustomerGroupRepository } from "../../repository/customer-group.repository";
import type { VisitaRepository } from "../../repository/visita.repository";
import type { SupplierRepository } from "../../repository/supplier.repository";
import { HandlerRegistry } from "./HandlerRegistry";
import { ConflictResolverRegistry } from "./ConflictResolver";
import { syncPipeline } from "./SyncPipeline";
import { syncLogger } from "../sync-logger";
import { SyncOperationRepository } from "./SyncOperationRepository";
import { SyncConflictRepository } from "./SyncConflictRepository";
import { OperationSorter } from "./OperationSorter";

export interface SyncEngineDeps {
  customerRepo: CustomerRepository;
  saleRepo: SaleRepository;
  paymentRepo: PaymentRepository;
  distribucionRepo: DistribucionRepository;
  distribucionService: DistribucionService;
  productRepo: ProductRepository;
  tagRepo: TagRepository;
  customerTagRepo: CustomerTagRepository;
  purchaseRepo: PurchaseRepository;
  variantRepo: ProductVariantRepository;
  customerGroupRepo: CustomerGroupRepository;
  visitaRepo: VisitaRepository;
  supplierRepo: SupplierRepository;
  syncConflictRepo?: SyncConflictRepository;
}

export class SyncEngine {
  private deps: SyncEngineDeps;
  private syncOpRepo: SyncOperationRepository;
  private syncConflictRepo: SyncConflictRepository;
  private operationSorter: OperationSorter;

  constructor(deps: SyncEngineDeps) {
    this.deps = deps;
    this.syncOpRepo = new SyncOperationRepository();
    this.syncConflictRepo = deps.syncConflictRepo ?? new SyncConflictRepository();
    this.operationSorter = new OperationSorter();
  }

  async processBatch(
    ctx: RequestContext,
    operations: SyncOperationInput[]
  ): Promise<SyncBatchResult> {
    const batchCorrelationId = syncLogger.generateCorrelationId();
    const nowIso = toISODate(now());

    logger.info({
      msg: "📥 Sync batch received",
      correlationId: batchCorrelationId,
      operations: operations.length,
      businessId: ctx.businessId,
      userId: ctx.businessUserId,
    });

    const { operations: sortedOperations, groupCount } = this.operationSorter.sort(operations);

    logger.info({
      msg: "📥 Sync batch sorted",
      correlationId: batchCorrelationId,
      totalOperations: sortedOperations.length,
      uniqueGroups: groupCount,
      priorityMap: this.operationSorter.getPriorityMap(),
    });

    const results: SyncOperationResult[] = [];

    try {
      await db.transaction(async (tx) => {
        for (let i = 0; i < sortedOperations.length; i++) {
          const operation = sortedOperations[i];
          const correlationId = operation.correlationId || syncLogger.generateCorrelationId();
          const savepointName = `sp_op_${i}`;

          logger.info({
            msg: "📋 Processing operation",
            correlationId,
            batchCorrelationId,
            idempotencyKey: operation.idempotencyKey,
            entityType: operation.entityType,
            operation: operation.operation,
            entityId: operation.entityId,
          });

          try {
            await tx.execute(sql.raw(`SAVEPOINT ${savepointName}`));
            const result = await this.processOperation(
              ctx,
              operation,
              correlationId,
              batchCorrelationId,
              tx,
              nowIso
            );
            await tx.execute(sql.raw(`RELEASE SAVEPOINT ${savepointName}`));
            results.push(result);
          } catch (opError) {
            await this.rollbackSavepoint(tx, savepointName);

            const errorMessage = opError instanceof Error ? opError.message : String(opError);

            logger.error({
              msg: "Operation failed in batch (rolled back via savepoint)",
              correlationId,
              savepointName,
              operation: operation.operation,
              entityType: operation.entityType,
              entityId: operation.entityId,
              error: errorMessage,
            });

            results.push({
              idempotencyKey: operation.idempotencyKey,
              success: false,
              error: errorMessage,
              serverTimestamp: nowIso,
            });
          }
        }
      });
    } catch (txError) {
      logger.error({
        msg: "Transaction failed entirely",
        error: txError instanceof Error ? txError.message : String(txError),
      });

      const processedKeys = new Set(results.map((r) => r.idempotencyKey));
      for (const op of sortedOperations) {
        if (!processedKeys.has(op.idempotencyKey)) {
          results.push({
            idempotencyKey: op.idempotencyKey,
            success: false,
            error: txError instanceof Error ? txError.message : "Transaction failed",
            serverTimestamp: nowIso,
          });
        }
      }
    }

    const succeeded = results.filter((item) => item.success && !item.conflict).length;
    const conflicts = results.filter((item) => item.conflict !== undefined).length;
    const failed = results.length - succeeded - conflicts;

    logger.info({
      msg: "📤 Sync batch completed",
      summary: { total: results.length, succeeded, failed, conflicts },
    });

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

  private async rollbackSavepoint(tx: DbTransaction, savepointName: string): Promise<void> {
    try {
      await tx.execute(sql.raw(`ROLLBACK TO SAVEPOINT ${savepointName}`));
    } catch (rollbackError) {
      logger.error({
        msg: "Failed to rollback savepoint",
        savepointName,
        error: rollbackError,
      });
    }
  }

  private async processOperation(
    ctx: RequestContext,
    operation: SyncOperationInput,
    correlationId: string,
    batchCorrelationId: string,
    tx: DbTransaction,
    nowIso: string
  ): Promise<SyncOperationResult> {
    const existingOp = await this.syncOpRepo.findByIdempotencyKey(
      ctx,
      operation.idempotencyKey,
      tx
    );

    if (existingOp?.status === "processed") {
      return {
        idempotencyKey: operation.idempotencyKey,
        success: true,
        serverTimestamp: existingOp.processedAt?.toISOString() ?? nowIso,
      };
    }

    if (existingOp?.status === "pending" || existingOp?.status === "failed") {
      logger.info({
        msg: "🔄 Retrying existing pending/failed operation",
        idempotencyKey: operation.idempotencyKey,
        existingStatus: existingOp.status,
      });
    }

    const conflictResolver = ConflictResolverRegistry.getResolver(operation.entityType);
    const conflict = await conflictResolver.checkConflict(ctx, operation, tx);

    if (conflict.hasConflict) {
      logger.info({
        msg: "⚠️ Conflict detected, persisting for admin resolution",
        correlationId,
        entityType: operation.entityType,
        entityId: operation.entityId,
        serverVersion: conflict.serverVersion,
        localVersion: operation.localVersion,
      });

      try {
        await this.syncConflictRepo.create(ctx, {
          operationId: operation.idempotencyKey,
          entityType: operation.entityType,
          entityId: operation.entityId,
          localData: operation.payload,
          serverData: conflict.serverData!,
          localVersion: operation.localVersion,
          serverVersion: conflict.serverVersion!,
        }, tx);
      } catch (persistError) {
        logger.error({
          msg: "Failed to persist conflict",
          correlationId,
          error: persistError instanceof Error ? persistError.message : String(persistError),
        });
      }

      return {
        idempotencyKey: operation.idempotencyKey,
        success: false,
        conflict: {
          serverVersion: conflict.serverVersion!,
          serverData: conflict.serverData!,
        },
        serverTimestamp: nowIso,
      };
    }

    const persistResult = await this.syncOpRepo.insertOrUpdate(ctx, operation, tx);

    if (persistResult === "already-processed") {
      return {
        idempotencyKey: operation.idempotencyKey,
        success: true,
        serverTimestamp: nowIso,
      };
    }

    const handler = HandlerRegistry.getHandler(operation.entityType, this.deps);

    const context: SyncContext = {
      ctx,
      correlationId,
      batchCorrelationId,
    };

    logger.debug({
      msg: "⚡ Executing pipeline",
      entityType: operation.entityType,
      operation: operation.operation,
      entityId: operation.entityId,
    });

    const result = await syncPipeline.execute(context, operation, handler);

    await this.syncOpRepo.updateStatus(
      ctx,
      operation.idempotencyKey,
      result.success ? "processed" : "failed",
      result.error ?? null,
      tx
    );

    return {
      idempotencyKey: operation.idempotencyKey,
      success: result.success,
      error: result.error,
      serverTimestamp: nowIso,
    };
  }
}
