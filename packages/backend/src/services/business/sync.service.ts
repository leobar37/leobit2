import { and, asc, eq, gt, inArray, or, sql } from "drizzle-orm";
import type { RequestContext } from "../../context/request-context";
import type { DbTransaction } from "../../lib/txid";
import { db, sales, syncConflicts, syncDeadLetter, syncOperations } from "../../lib/db";
import { toISODate, now } from "../../lib/date-utils";
import type { SyncOperationInput, SyncBatchResult } from "../sync-handlers/types";
import type { SyncEngineDeps } from "../sync-handlers/types";
import {
  SyncEngine,
  SyncService as LibSyncService,
  DrizzleSyncOperationRepository,
  DrizzleSyncConflictRepository,
  DrizzleSyncDeadLetterRepository,
  type SyncEngineMiddleware,
  type SyncHandlerResult,
  type DbClient,
  HandlerRegistry as LibHandlerRegistry,
} from "@avileo/drizzle-sync/server";
import { SyncMetricsService } from "./sync-metrics.service";
import { createConflictResolverRegistry } from "../sync-handlers/conflict-resolvers";
import { syncOperationSchema } from "../sync-handlers/schemas";
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
  createSaleHandler,
  createDistribucionHandler,
  createPurchaseHandler,
} from "../sync-handlers/registry";
import { logger } from "../../lib/logger";
import { syncConfig } from "../../sync.config";
import { ZodError } from "zod";

export type SyncBatchEntry =
  | { kind: "single"; operation: SyncOperationInput }
  | { kind: "batch"; operations: SyncOperationInput[] };

export type {
  SyncEntity,
  SyncOperationInput,
  SyncOperationResult,
  SyncBatchResult,
} from "../sync-handlers/types";

interface SyncServiceDeps extends SyncEngineDeps {}

function createSyncValidationMiddleware(): SyncEngineMiddleware<RequestContext, DbTransaction> {
  return {
    beforeExecute: async (ctx, operation, handler, tx) => {
      const structResult = syncOperationSchema.safeParse(operation);
      if (!structResult.success) {
        const zodError = structResult.error as ZodError;
        return {
          success: false,
          idempotencyKey: operation.idempotencyKey,
          error: `Invalid operation structure: ${zodError.issues.map((e) => e.message).join(", ")}`,
          serverTimestamp: new Date().toISOString(),
        };
      }

      try {
        await handler.validateBusinessRules(ctx, operation.payload, operation.operation, tx);
      } catch (error) {
        return {
          success: false,
          idempotencyKey: operation.idempotencyKey,
          error: error instanceof Error ? error.message : "Validation failed",
          serverTimestamp: new Date().toISOString(),
        };
      }

      return null;
    },

    afterExecute: async (_ctx, _operation, result) => {
      return result;
    },

    onError: async (_ctx, _operation, error) => {
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
  private libSyncService: LibSyncService<RequestContext, DbTransaction>;
  private syncMetricsService: SyncMetricsService;

  constructor(deps: SyncServiceDeps) {
    const syncOpRepo = new DrizzleSyncOperationRepository<RequestContext, DbTransaction>({
      table: syncOperations,
      tenantColumn: "businessId",
      db: db as any,
    });

    const syncConflictRepo = new DrizzleSyncConflictRepository<RequestContext, DbTransaction>({
      table: syncConflicts,
      tenantColumn: "businessId",
      db: db as any,
    });

    const syncDeadLetterRepo = new DrizzleSyncDeadLetterRepository<RequestContext, DbTransaction>({
      table: syncDeadLetter,
      tenantColumn: "businessId",
      db: db as any,
    });

    this.syncMetricsService = new SyncMetricsService();

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
      entityRelations[name] = {
        relations: (entity as { relations?: { parents?: { entity: string; foreignKey: string; payloadKey?: string; required?: boolean }[]; children?: { entity: string; foreignKey: string; payloadKey?: string; cascade?: boolean }[] } }).relations,
        priority: (entity as { priority?: number }).priority,
      };
    }

    this.engine = new SyncEngine<RequestContext, DbTransaction, SyncServiceDeps>(deps, {
      db: {
        transaction: <T>(fn: (tx: DbTransaction) => Promise<T>) => db.transaction(fn as any),
        execute: (sqlQuery: unknown) => db.execute(sqlQuery as any),
      } as DbClient<DbTransaction>,
      syncOpRepo,
      syncConflictRepo,
      conflictResolverRegistry: createConflictResolverRegistry(),
      entityRelations,
      middleware: createSyncValidationMiddleware(),
      now: () => toISODate(now()),
      savepointSql: (name: string) => sql.raw(`SAVEPOINT ${name}`),
      releaseSavepointSql: (name: string) => sql.raw(`RELEASE SAVEPOINT ${name}`),
      rollbackSavepointSql: (name: string) => sql.raw(`ROLLBACK TO SAVEPOINT ${name}`),
    });

    this.registerHandlers(deps);

    this.libSyncService = new LibSyncService<RequestContext, DbTransaction>({
      engine: this.engine,
      syncOpRepo,
      syncConflictRepo,
      syncDeadLetterRepo,
      conflictResolverRegistry: createConflictResolverRegistry(),
      getChanges: (ctx, options) => this.customGetChanges(ctx, options),
      metricsCollector: this.syncMetricsService,
      now: () => toISODate(now()),
    });
  }

  private registerHandlers(deps: SyncServiceDeps): void {
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

    LibHandlerRegistry.register("sales", () => createSaleHandler(deps));
    LibHandlerRegistry.register("distribuciones", () => createDistribucionHandler(deps));
    LibHandlerRegistry.register("purchases", () => createPurchaseHandler(deps));
  }

  async processBatch(
    ctx: RequestContext,
    operations: SyncOperationInput[]
  ): Promise<SyncBatchResult> {
    return this.libSyncService.processBatch(ctx, operations);
  }

  async processEntries(
    ctx: RequestContext,
    entries: SyncBatchEntry[]
  ): Promise<SyncBatchResult> {
    return this.libSyncService.processEntries(ctx, entries);
  }

  async getChanges(
    ctx: RequestContext,
    since?: Date,
    limit = 100,
    entityTypes?: string[],
    cursorOperationId?: string
  ) {
    return this.libSyncService.getChanges(ctx, {
      since,
      limit,
      entityTypes,
      cursorOperationId,
    });
  }

  async getConflicts(
    ctx: RequestContext,
    options?: { status?: string; entityType?: string; limit?: number; offset?: number }
  ) {
    return this.libSyncService.getConflicts(ctx, options);
  }

  async resolveConflict(
    ctx: RequestContext,
    id: string,
    resolution: { resolution: "server" | "local" | "merge"; mergedData?: Record<string, unknown> }
  ) {
    return this.libSyncService.resolveConflict(ctx, id, resolution);
  }

  async getDeadLetterItems(
    ctx: RequestContext,
    options: { limit: number; offset: number; entity?: string }
  ) {
    return this.libSyncService.getDeadLetterItems(ctx, options);
  }

  async deleteDeadLetterItem(ctx: RequestContext, id: string) {
    return this.libSyncService.deleteDeadLetterItem(ctx, id);
  }

  async getMetrics(ctx: RequestContext, hours?: number) {
    return this.libSyncService.getMetrics(ctx, hours);
  }

  async getHealth(ctx: RequestContext) {
    return this.libSyncService.getHealth(ctx);
  }

  private async customGetChanges(
    ctx: RequestContext,
    options?: {
      since?: Date;
      limit?: number;
      entityTypes?: string[];
      cursorOperationId?: string;
    }
  ): Promise<{
    changes: {
      idempotencyKey: string;
      entityType: string;
      operation: string;
      entityId: string;
      payload: Record<string, unknown>;
      localTimestamp: string;
      processedAt: string;
    }[];
    nextSince: string;
    serverTimestamp: string;
    hasMore: boolean;
  }> {
    const { since, limit = 100, entityTypes, cursorOperationId } = options ?? {};
    const effectiveLimit = Math.min(limit, 500);

    const baseConditions = [
      eq(syncOperations.businessId, ctx.businessId),
      eq(syncOperations.status, "processed"),
    ];

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
