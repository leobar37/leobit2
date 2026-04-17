import { and, asc, eq, gt, gte, inArray, isNull, or } from "drizzle-orm";
import type { RequestContext } from "../../context/request-context";
import { db, sales, syncOperations } from "../../lib/db";
import { toISODate, now } from "../../lib/date-utils";
import type { SyncEntity, SyncOperationInput, SyncBatchResult } from "./types";
import type { SyncEngineDeps } from "./framework/SyncEngine";
import { SyncEngine } from "./framework/SyncEngine";
import { HandlerRegistry } from "./framework/HandlerRegistry";
import { CustomerSyncHandler } from "./handlers/CustomerSyncHandler";
import { SaleSyncHandler } from "./handlers/SaleSyncHandler";
import { AbonoSyncHandler } from "./handlers/AbonoSyncHandler";
import { DistribucionSyncHandler } from "./handlers/DistribucionSyncHandler";
import { SaleItemSyncHandler } from "./handlers/SaleItemSyncHandler";
import { ProductSyncHandler } from "./handlers/ProductSyncHandler";
import { ProductVariantSyncHandler } from "./handlers/ProductVariantSyncHandler";
import { TagSyncHandler } from "./handlers/TagSyncHandler";
import { CustomerTagSyncHandler } from "./handlers/CustomerTagSyncHandler";
import { PurchaseSyncHandler } from "./handlers/PurchaseSyncHandler";
import { PurchaseItemSyncHandler } from "./handlers/PurchaseItemSyncHandler";
import { CustomerGroupSyncHandler } from "./handlers/CustomerGroupSyncHandler";
import { CustomerGroupMemberSyncHandler } from "./handlers/CustomerGroupMemberSyncHandler";
import { VisitaSyncHandler } from "./handlers/VisitaSyncHandler";
import { SupplierSyncHandler } from "./handlers/SupplierSyncHandler";

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
    HandlerRegistry.register("customers", () => {
      return new CustomerSyncHandler(deps.customerRepo);
    });

    HandlerRegistry.register("sales", () => {
      return new SaleSyncHandler(deps.saleRepo, deps.paymentRepo);
    });

    HandlerRegistry.register("abonos", () => {
      return new AbonoSyncHandler(deps.paymentRepo, deps.customerRepo);
    });

    HandlerRegistry.register("distribuciones", () => {
      return new DistribucionSyncHandler(deps.distribucionRepo, deps.distribucionService);
    });

    HandlerRegistry.register("sale_items", () => {
      return new SaleItemSyncHandler(deps.saleRepo);
    });

    HandlerRegistry.register("products", () => {
      return new ProductSyncHandler(deps.productRepo);
    });

    HandlerRegistry.register("product_variants", () => {
      return new ProductVariantSyncHandler(deps.variantRepo, deps.productRepo);
    });

    HandlerRegistry.register("tags", () => {
      return new TagSyncHandler(deps.tagRepo);
    });

    HandlerRegistry.register("customer_tags", () => {
      return new CustomerTagSyncHandler(deps.customerTagRepo, deps.customerRepo, deps.tagRepo);
    });

    HandlerRegistry.register("purchases", (deps) => {
      return new PurchaseSyncHandler(deps);
    });

    HandlerRegistry.register("purchase_items", () => {
      return new PurchaseItemSyncHandler(deps.purchaseRepo);
    });

    HandlerRegistry.register("customer_groups", () => {
      return new CustomerGroupSyncHandler(deps.customerGroupRepo);
    });

    HandlerRegistry.register("customer_group_members", () => {
      return new CustomerGroupMemberSyncHandler(deps.customerGroupRepo);
    });

    HandlerRegistry.register("visitas", () => {
      return new VisitaSyncHandler(deps.visitaRepo);
    });

    HandlerRegistry.register("suppliers", () => {
      return new SupplierSyncHandler(deps.supplierRepo);
    });
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
