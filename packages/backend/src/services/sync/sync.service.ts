import { and, asc, eq, gt, gte, inArray, isNull, or } from "drizzle-orm";
import type { RequestContext } from "../../context/request-context";
import type { DbTransaction } from "../../lib/txid";
import { db, sales, syncOperations } from "../../lib/db";
import { toISODate, now } from "../../lib/date-utils";
import { sql } from "drizzle-orm";
import type { SyncEntity, SyncOperationInput, SyncBatchResult } from "./types";
import type { SyncEngineDeps } from "./types";
import {
  SyncEngine,
  type SyncEngineMiddleware,
  type SyncHandlerResult,
  type DbClient,
  HandlerRegistry as LibHandlerRegistry,
} from "@avileo/drizzle-sync/server";
import { SyncOperationRepository } from "./framework/SyncOperationRepository";
import { SyncConflictRepository } from "./framework/SyncConflictRepository";
import { syncPipeline } from "./framework/SyncPipeline";
import { createConflictResolvers, createConflictResolverRegistry } from "./framework/ConflictResolver";
import type { SyncContext } from "./framework/types";
import {
  createTagHandler,
  createCustomerHandler,
  createProductHandler,
  createSupplierHandler,
  createCustomerGroupHandler,
  createProductVariantHandler,
  createCustomerGroupMemberHandler,
  createCustomerTagHandler,
  createVisitaHandler,
  createSaleItemHandler,
  createPurchaseItemHandler,
  createAbonoHandler,
  createDistribucionItemHandler,
} from "./handlers/registry";
import { SaleSyncHandler } from "./handlers/SaleSyncHandler";
import { DistribucionSyncHandler } from "./handlers/DistribucionSyncHandler";
import { PurchaseSyncHandler } from "./handlers/PurchaseSyncHandler";
import { logger } from "../../lib/logger";
import { syncConfig } from "../../sync.config";

export type {
  SyncEntity,
  SyncOperationInput,
  SyncOperationResult,
  SyncBatchResult,
} from "./types";

interface SyncServiceDeps extends SyncEngineDeps {}

/**
 * WeakMap to track pipeline execution state per handler instance.
 * This enables idempotent handler execution when library calls execute() after beforeExecute().
 */
const pipelineStateMap = new WeakMap<object, { result: SyncHandlerResult | null; executed: boolean }>();

/**
 * Creates a SyncEngine middleware that wraps the backend's SyncPipeline.
 * The middleware runs the pipeline in beforeExecute, and the handler wrapper
 * ensures idempotent execution when the library's engine calls execute() afterward.
 */
function createSyncPipelineMiddleware(): SyncEngineMiddleware<RequestContext, DbTransaction> {
  return {
    beforeExecute: async (ctx, operation, handler, tx) => {
      let state = pipelineStateMap.get(handler);
      if (!state) {
        state = { result: null, executed: false };
        pipelineStateMap.set(handler, state);
      }

      if (state.executed) {
        return state.result;
      }

      state.executed = true;

      const context: SyncContext = {
        ctx,
        correlationId: operation.correlationId || `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        batchCorrelationId: "",
      };

      state.result = await syncPipeline.execute(context, operation, handler, tx);

      return null; // Let library call execute() - idempotent handler returns cached result
    },

    afterExecute: async (_ctx, _operation, result) => {
      // Pipeline already executed in beforeExecute; this hook receives the cached result.
      // Return as-is to preserve the pipeline's result through the engine.
      return result;
    },

    onError: async (_ctx, _operation, error, handler) => {
      // If pipeline already executed and cached a result, return it instead of error
      const state = pipelineStateMap.get(handler);
      if (state?.executed && state.result) {
        return state.result;
      }

      // Pipeline didn't execute; convert error to failure result
      return {
        success: false,
        idempotencyKey: "",
        error: error.message,
        serverTimestamp: new Date().toISOString(),
      };
    },
  };
}

export class SyncService {
  private engine: SyncEngine<RequestContext, DbTransaction, SyncServiceDeps>;

  constructor(deps: SyncServiceDeps) {
    const syncOpRepo = new SyncOperationRepository();
    const syncConflictRepo = deps.syncConflictRepo ?? new SyncConflictRepository();

    const entityRelations: Record<string, { relations?: { parents?: { entity: string; foreignKey: string; payloadKey?: string; required?: boolean }[] } }> = {};
    for (const [name, entity] of Object.entries(syncConfig.entities)) {
      entityRelations[name] = { relations: entity.relations };
    }

    this.engine = new SyncEngine<RequestContext, DbTransaction, SyncServiceDeps>(deps, {
      db: {
        transaction: <T>(fn: (tx: DbTransaction) => Promise<T>) => db.transaction(fn as any),
        execute: (sql: unknown) => db.execute(sql as any),
      } as DbClient<DbTransaction>,
      syncOpRepo,
      syncConflictRepo,
      conflictResolverRegistry: createConflictResolverRegistry(),
      entityRelations,
      middleware: createSyncPipelineMiddleware(),
      now: () => toISODate(now()),
      savepointSql: (name: string) => sql.raw(`SAVEPOINT ${name}`),
      releaseSavepointSql: (name: string) => sql.raw(`RELEASE SAVEPOINT ${name}`),
      rollbackSavepointSql: (name: string) => sql.raw(`ROLLBACK TO SAVEPOINT ${name}`),
    });

    this.registerHandlers(deps);
  }

  private registerHandlers(deps: SyncServiceDeps): void {
    // Clear any existing registrations from previous instances
    LibHandlerRegistry.clear();

    // ─── Builder-generated handlers (simple CRUD) ───────────────────────────
    LibHandlerRegistry.register("tags", () => createTagHandler(deps));
    LibHandlerRegistry.register("customers", () => createCustomerHandler(deps));
    LibHandlerRegistry.register("products", () => createProductHandler(deps));
    LibHandlerRegistry.register("suppliers", () => createSupplierHandler(deps));
    LibHandlerRegistry.register("customer_groups", () => createCustomerGroupHandler(deps));
    LibHandlerRegistry.register("product_variants", () => createProductVariantHandler(deps));

    // ─── Builder-generated handlers (custom operations) ──────────────────────
    LibHandlerRegistry.register("customer_group_members", () => createCustomerGroupMemberHandler(deps));
    LibHandlerRegistry.register("customer_tags", () => createCustomerTagHandler(deps));
    LibHandlerRegistry.register("visitas", () => createVisitaHandler(deps));
    LibHandlerRegistry.register("sale_items", () => createSaleItemHandler(deps));
    LibHandlerRegistry.register("purchase_items", () => createPurchaseItemHandler(deps));
    LibHandlerRegistry.register("abonos", () => createAbonoHandler(deps));
    LibHandlerRegistry.register("distribucion_items", () => createDistribucionItemHandler(deps));

    // ─── Explicit handlers (complex state machines, non-migratable) ───────────
    LibHandlerRegistry.register("sales", () => new SaleSyncHandler(deps.saleRepo, deps.paymentRepo));
    LibHandlerRegistry.register("distribuciones", () => new DistribucionSyncHandler(deps.distribucionRepo, deps.distribucionService));
    LibHandlerRegistry.register("purchases", () => new PurchaseSyncHandler(deps));
  }

  async processBatch(
    ctx: RequestContext,
    operations: SyncOperationInput[]
  ): Promise<SyncBatchResult> {
    return this.engine.processBatch(ctx, operations);
  }

  async getChanges(
    ctx: RequestContext,
    since?: Date,
    limit = 100,
    _syncGroupId?: string,
    entityTypes?: string[],
    cursorOperationId?: string
  ) {
    const effectiveLimit = Math.min(limit, 500);

    // Build where clause with optional filters
    const baseConditions = [
      eq(syncOperations.businessId, ctx.businessId),
      eq(syncOperations.status, "processed"),
    ];

    // Note: syncGroupId filter is deprecated - FK-based ordering is now used instead
    // The _syncGroupId parameter is kept for backward compatibility but ignored

    // Add since filter if provided
    // Use strict greater-than to avoid returning the same record in next page
    if (since) {
      if (cursorOperationId) {
        baseConditions.push(
          or(
            gt(syncOperations.processedAt, since),
            and(
              eq(syncOperations.processedAt, since),
              gt(syncOperations.operationId, cursorOperationId)
            )
          )!
        );
      } else {
        baseConditions.push(gt(syncOperations.processedAt, since));
      }
    }

    // Add entityTypes filter if provided (for staged loading)
    if (entityTypes && entityTypes.length > 0) {
      baseConditions.push(inArray(syncOperations.entity, entityTypes));
    }

    const where = and(...baseConditions);

    const operations = await db.query.syncOperations.findMany({
      where,
      orderBy: [asc(syncOperations.processedAt), asc(syncOperations.operationId)],
      limit: effectiveLimit + 1,
    });

    const hasMore = operations.length > effectiveLimit;

    const results = hasMore ? operations.slice(0, effectiveLimit) : operations;

    const last = results[results.length - 1];
    const serverTimestamp = toISODate(now());

    const nextSince = last?.processedAt && last.operationId
      ? `${last.processedAt.toISOString()}_${last.operationId}`
      : serverTimestamp;

    const saleOps = results.filter((op) => op.entity === "sales" && op.action !== "delete");

    if (saleOps.length > 0) {
      const saleIds = saleOps.map((op) => op.entityId);
      const currentSales = await db
        .select({
          id: sales.id,
          totalAmount: sales.totalAmount,
          amountPaid: sales.amountPaid,
          balanceDue: sales.balanceDue,
        })
        .from(sales)
        .where(and(eq(sales.businessId, ctx.businessId), inArray(sales.id, saleIds)));

      const saleMap = new Map(currentSales.map((s) => [s.id, s]));

      for (const op of saleOps) {
        const current = saleMap.get(op.entityId);
        if (current && op.payload && typeof op.payload === "object") {
          const payload = op.payload as Record<string, unknown>;
          payload.totalAmount = current.totalAmount;
          payload.amountPaid = current.amountPaid;
          payload.balanceDue = current.balanceDue;
        }
      }
    }

    return {
      changes: results.map((item) => ({
        idempotencyKey: item.operationId,
        entityType: item.entity,
        operation: item.action,
        entityId: item.entityId,
        payload: item.payload,
        localTimestamp: item.clientTimestamp.toISOString(),
        processedAt: item.processedAt?.toISOString() ?? item.createdAt.toISOString(),
      })),
      nextSince,
      serverTimestamp,
      hasMore,
    };
  }
}
