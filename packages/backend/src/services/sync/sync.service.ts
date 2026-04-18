import { and, asc, eq, gt, gte, inArray, isNull, or } from "drizzle-orm";
import type { RequestContext } from "../../context/request-context";
import { db, sales, syncOperations } from "../../lib/db";
import { toISODate, now } from "../../lib/date-utils";
import type { SyncEntity, SyncOperationInput, SyncBatchResult } from "./types";
import type { SyncEngineDeps } from "./framework/SyncEngine";
import { SyncEngine } from "./framework/SyncEngine";
import { HandlerRegistry } from "./framework/HandlerRegistry";
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

export type {
  SyncEntity,
  SyncOperationInput,
  SyncOperationResult,
  SyncBatchResult,
} from "./types";

interface SyncServiceDeps extends SyncEngineDeps {}

export class SyncService {
  private engine: SyncEngine;

  constructor(deps: SyncServiceDeps) {
    this.engine = new SyncEngine(deps);
    this.registerHandlers(deps);
  }

  private registerHandlers(deps: SyncServiceDeps): void {
    // ─── Builder-generated handlers (simple CRUD) ───────────────────────────
    HandlerRegistry.register("tags", () => createTagHandler(deps));
    HandlerRegistry.register("customers", () => createCustomerHandler(deps));
    HandlerRegistry.register("products", () => createProductHandler(deps));
    HandlerRegistry.register("suppliers", () => createSupplierHandler(deps));
    HandlerRegistry.register("customer_groups", () => createCustomerGroupHandler(deps));
    HandlerRegistry.register("product_variants", () => createProductVariantHandler(deps));

    // ─── Builder-generated handlers (custom operations) ──────────────────────
    HandlerRegistry.register("customer_group_members", () => createCustomerGroupMemberHandler(deps));
    HandlerRegistry.register("customer_tags", () => createCustomerTagHandler(deps));
    HandlerRegistry.register("visitas", () => createVisitaHandler(deps));
    HandlerRegistry.register("sale_items", () => createSaleItemHandler(deps));
    HandlerRegistry.register("purchase_items", () => createPurchaseItemHandler(deps));
    HandlerRegistry.register("abonos", () => createAbonoHandler(deps));
    HandlerRegistry.register("distribucion_items", () => createDistribucionItemHandler(deps));

    // ─── Explicit handlers (complex state machines, non-migratable) ───────────
    HandlerRegistry.register("sales", () => new SaleSyncHandler(deps.saleRepo, deps.paymentRepo));
    HandlerRegistry.register("distribuciones", () => new DistribucionSyncHandler(deps.distribucionRepo, deps.distribucionService));
    HandlerRegistry.register("purchases", () => new PurchaseSyncHandler(deps));
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
    syncGroupId?: string,
    entityTypes?: string[],
    cursorOperationId?: string
  ) {
    const effectiveLimit = Math.min(limit, 500);

    // Build where clause with optional filters
    const baseConditions = [
      eq(syncOperations.businessId, ctx.businessId),
      eq(syncOperations.status, "processed"),
    ];

    // Add syncGroupId filter if provided
    // If syncGroupId is specified, only return changes for that group OR changes without a group
    if (syncGroupId) {
      baseConditions.push(
        or(
          eq(syncOperations.syncGroupId, syncGroupId),
          isNull(syncOperations.syncGroupId)
        )!
      );
    }

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
