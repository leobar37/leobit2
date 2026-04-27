/**
 * Sync Setup
 *
 * Configures the drizzle-sync framework for Avileo backend.
 * Creates repositories, hooks, and the SyncService instance.
 */

import { db, sales } from "./lib/db";
import { syncOperations, syncConflicts, syncDeadLetter } from "./db/schema";
import {
  DrizzleSyncOperationRepository,
  DrizzleSyncConflictRepository,
  DrizzleSyncDeadLetterRepository,
  SyncService,
  SyncEngine,
  HandlerRegistry as LibHandlerRegistry,
  type SyncEngineMiddleware,
  type SyncHandlerResult,
  type DbClient,
} from "@avileo/drizzle-sync/server";
import { sql, eq, and, inArray, asc, gt } from "drizzle-orm";
import type { RequestContext } from "./context/request-context";
import type { DbTransaction } from "./lib/txid";
import { toISODate, now } from "./lib/date-utils";
import { syncConfig } from "./sync.config";
import { syncPipeline } from "./services/sync/SyncPipeline";
import { createConflictResolverRegistry } from "./services/sync/ConflictResolver";
import type { SyncContext, SyncEngineDeps } from "./services/sync/types";
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
  createFileHandler,
} from "./services/sync/handlers/registry";
import { SaleSyncHandler } from "./services/sync/handlers/SaleSyncHandler";
import { DistribucionSyncHandler } from "./services/sync/handlers/DistribucionSyncHandler";
import { PurchaseSyncHandler } from "./services/sync/handlers/PurchaseSyncHandler";

const pipelineStateMap = new WeakMap<object, { result: SyncHandlerResult | null; executed: boolean }>();

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

      state.result = await syncPipeline.execute(context, operation as any, handler, tx);
      return null;
    },

    afterExecute: async (_ctx, _operation, result) => {
      return result;
    },

    onError: async (_ctx, _operation, error, handler) => {
      const state = pipelineStateMap.get(handler);
      if (state?.executed && state.result) {
        return state.result;
      }

      return {
        success: false,
        idempotencyKey: "",
        error: error.message,
        serverTimestamp: new Date().toISOString(),
      };
    },
  };
}

/**
 * Custom getChanges for Avileo - includes sales enrichment
 */
async function getAvileoChanges(
  ctx: RequestContext,
  options?: {
    since?: Date;
    limit?: number;
    entityTypes?: string[];
    cursorOperationId?: string;
  }
) {
  const { since, limit = 100, entityTypes, cursorOperationId } = options ?? {};
  const effectiveLimit = Math.min(limit, 500);

  const baseConditions = [
    eq(syncOperations.businessId, ctx.businessId),
    eq(syncOperations.status, "processed"),
  ];

  if (since) {
    if (cursorOperationId) {
      baseConditions.push(
        sql`${syncOperations.processedAt} > ${since} OR (${syncOperations.processedAt} = ${since} AND ${syncOperations.operationId} > ${cursorOperationId})`
      );
    } else {
      baseConditions.push(gt(syncOperations.processedAt, since));
    }
  }

  if (entityTypes && entityTypes.length > 0) {
    baseConditions.push(inArray(syncOperations.entity, entityTypes));
  }

  const operations = await db.query.syncOperations.findMany({
    where: and(...baseConditions),
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

  // Enrich sales with current amounts
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

export function createAvileoSyncService(deps: SyncEngineDeps) {
  // 1. Create Drizzle repositories
  const syncOpRepo = new DrizzleSyncOperationRepository({
    table: syncOperations,
    tenantColumn: "business_id",
    db: db as any,
  });

  const syncConflictRepo = new DrizzleSyncConflictRepository({
    table: syncConflicts,
    tenantColumn: "business_id",
    db: db as any,
  });

  const syncDeadLetterRepo = new DrizzleSyncDeadLetterRepository({
    table: syncDeadLetter,
    tenantColumn: "business_id",
    db: db as any,
  });

  // 2. Build entity relations from sync config
  const entityRelations: Record<
    string,
    {
      relations?: {
        parents?: { entity: string; foreignKey: string; payloadKey?: string; required?: boolean }[];
        children?: { entity: string; foreignKey: string; payloadKey?: string; cascade?: boolean }[];
      };
      priority?: number;
    }
  > = {};
  for (const [name, entity] of Object.entries(syncConfig.entities)) {
    const e = entity as any;
    entityRelations[name] = {
      relations: e.relations,
      priority: e.priority,
    };
  }

  // 3. Create SyncEngine
  const engine = new SyncEngine<RequestContext, DbTransaction, SyncEngineDeps>(deps, {
    db: {
      transaction: <T>(fn: (tx: DbTransaction) => Promise<T>) => db.transaction(fn as any),
      execute: (sqlCmd: unknown) => db.execute(sqlCmd as any),
    } as DbClient<DbTransaction>,
    syncOpRepo: syncOpRepo as any,
    syncConflictRepo: syncConflictRepo as any,
    conflictResolverRegistry: createConflictResolverRegistry(),
    entityRelations,
    middleware: createSyncPipelineMiddleware(),
    now: () => toISODate(now()),
    savepointSql: (name: string) => sql.raw(`SAVEPOINT ${name}`),
    releaseSavepointSql: (name: string) => sql.raw(`RELEASE SAVEPOINT ${name}`),
    rollbackSavepointSql: (name: string) => sql.raw(`ROLLBACK TO SAVEPOINT ${name}`),
  });

  // 4. Register handlers
  LibHandlerRegistry.clear();
  LibHandlerRegistry.register("tags", () => createTagHandler(deps));
  LibHandlerRegistry.register("customers", () => createCustomerHandler(deps));
  LibHandlerRegistry.register("products", () => createProductHandler(deps));
  LibHandlerRegistry.register("suppliers", () => createSupplierHandler(deps));
  LibHandlerRegistry.register("customer_groups", () => createCustomerGroupHandler(deps));
  LibHandlerRegistry.register("product_variants", () => createProductVariantHandler(deps));
  LibHandlerRegistry.register("customer_group_members", () => createCustomerGroupMemberHandler(deps));
  LibHandlerRegistry.register("customer_tags", () => createCustomerTagHandler(deps));
  LibHandlerRegistry.register("visitas", () => createVisitaHandler(deps));
  LibHandlerRegistry.register("sale_items", () => createSaleItemHandler(deps));
  LibHandlerRegistry.register("purchase_items", () => createPurchaseItemHandler(deps));
  LibHandlerRegistry.register("abonos", () => createAbonoHandler(deps));
  LibHandlerRegistry.register("distribucion_items", () => createDistribucionItemHandler(deps));
  LibHandlerRegistry.register("files", () => createFileHandler(deps));
  LibHandlerRegistry.register("sales", () => new SaleSyncHandler(deps.saleRepo, deps.paymentRepo));
  LibHandlerRegistry.register("distribuciones", () => new DistribucionSyncHandler(deps.distribucionRepo, deps.distribucionService));
  LibHandlerRegistry.register("purchases", () => new PurchaseSyncHandler(deps));

  // 5. Create SyncService with hooks
  const syncService = new SyncService<RequestContext, DbTransaction>({
    engine,
    syncOpRepo: syncOpRepo as any,
    syncConflictRepo: syncConflictRepo as any,
    syncDeadLetterRepo: syncDeadLetterRepo as any,
    conflictResolverRegistry: createConflictResolverRegistry(),
    getChanges: getAvileoChanges,
    now: () => toISODate(now()),
  });

  return syncService;
}
