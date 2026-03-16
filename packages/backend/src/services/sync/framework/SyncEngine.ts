import type { RequestContext } from "../../../context/request-context";
import type { DbTransaction } from "../../../lib/txid";
import { db, syncOperations } from "../../../lib/db";
import { logger } from "../../../lib/logger";
import { toISODate, now } from "../../../lib/date-utils";
import { and, eq, sql } from "drizzle-orm";
import type { SyncOperationInput, SyncOperationResult, SyncBatchResult } from "../types";
import type { SyncContext } from "./types";
import type { CustomerRepository } from "../../repository/customer.repository";
import type { SaleRepository } from "../../repository/sale.repository";
import type { PaymentRepository } from "../../repository/payment.repository";
import type { DistribucionRepository } from "../../repository/distribucion.repository";
import type { DistribucionService } from "../../business/distribucion.service";
import { HandlerRegistry } from "./HandlerRegistry";
import { ConflictResolverRegistry } from "./ConflictResolver";
import { syncPipeline } from "./SyncPipeline";
import { syncLogger } from "../sync-logger";

export interface SyncEngineDeps {
  customerRepo: CustomerRepository;
  saleRepo: SaleRepository;
  paymentRepo: PaymentRepository;
  distribucionRepo: DistribucionRepository;
  distribucionService: DistribucionService;
}

export class SyncEngine {
  private deps: SyncEngineDeps;

  constructor(deps: SyncEngineDeps) {
    this.deps = deps;
  }

  async processBatch(
    ctx: RequestContext,
    operations: SyncOperationInput[]
  ): Promise<SyncBatchResult> {
    const batchCorrelationId = syncLogger.generateCorrelationId();

    logger.info({
      msg: "📥 Sync batch received",
      correlationId: batchCorrelationId,
      operations: operations.length,
      businessId: ctx.businessId,
      userId: ctx.businessUserId,
    });

    const results: SyncOperationResult[] = [];
    const nowIso = toISODate(now());

    // Process ALL operations in a single transaction with SAVEPOINTs per operation.
    // SAVEPOINTs allow individual operation failures to be rolled back without
    // aborting the entire PostgreSQL transaction (which enters "aborted" state on any error).
    try {
      await db.transaction(async (tx) => {
        for (let i = 0; i < operations.length; i++) {
          const operation = operations[i];
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
            const result = await this.processOperation(ctx, operation, correlationId, batchCorrelationId, tx, nowIso);
            await tx.execute(sql.raw(`RELEASE SAVEPOINT ${savepointName}`));
            results.push(result);
          } catch (opError) {
            // Rollback to savepoint so the transaction stays usable for subsequent operations
            try {
              await tx.execute(sql.raw(`ROLLBACK TO SAVEPOINT ${savepointName}`));
            } catch (rollbackError) {
              logger.error({
                msg: "Failed to rollback savepoint",
                savepointName,
                error: rollbackError,
              });
            }

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
      for (const op of operations) {
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

  private async processOperation(
    ctx: RequestContext,
    operation: SyncOperationInput,
    correlationId: string,
    batchCorrelationId: string,
    tx: DbTransaction,
    nowIso: string
  ): Promise<SyncOperationResult> {
    const existingOp = await tx.query.syncOperations.findFirst({
      where: and(
        eq(syncOperations.businessId, ctx.businessId),
        eq(syncOperations.operationId, operation.idempotencyKey)
      ),
    });

    if (existingOp?.status === "processed") {
      return {
        idempotencyKey: operation.idempotencyKey,
        success: true,
        serverTimestamp: existingOp.processedAt?.toISOString() ?? nowIso,
      };
    }

    const conflictResolver = ConflictResolverRegistry.getResolver(operation.entityType);
    const conflict = await conflictResolver.checkConflict(ctx, operation, tx);

    if (conflict.hasConflict) {
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

    try {
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
    } catch (insertError) {
      if (this.isUniqueConstraintViolation(insertError)) {
        return {
          idempotencyKey: operation.idempotencyKey,
          success: true,
          serverTimestamp: nowIso,
        };
      }
      throw insertError;
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

    await tx
      .update(syncOperations)
      .set({
        status: result.success ? "processed" : "failed",
        error: result.error ?? null,
        processedAt: now(),
      })
      .where(
        and(
          eq(syncOperations.businessId, ctx.businessId),
          eq(syncOperations.operationId, operation.idempotencyKey)
        )
      );

    return {
      idempotencyKey: operation.idempotencyKey,
      success: result.success,
      error: result.error,
      serverTimestamp: nowIso,
    };
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    if (error && typeof error === "object") {
      const pgError = error as { code?: string };
      return pgError.code === "23505";
    }
    return false;
  }
}
