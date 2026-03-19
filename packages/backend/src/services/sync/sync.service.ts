import { and, asc, eq, gte } from "drizzle-orm";
import type { RequestContext } from "../../context/request-context";
import { db, syncOperations } from "../../lib/db";
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
import { TagSyncHandler } from "./handlers/TagSyncHandler";
import { CustomerTagSyncHandler } from "./handlers/CustomerTagSyncHandler";
import { PurchaseSyncHandler } from "./handlers/PurchaseSyncHandler";
import { PurchaseItemSyncHandler } from "./handlers/PurchaseItemSyncHandler";
import { InventorySyncHandler } from "./handlers/InventorySyncHandler";
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
      return new AbonoSyncHandler(deps.paymentRepo);
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

    HandlerRegistry.register("tags", () => {
      return new TagSyncHandler(deps.tagRepo);
    });

    HandlerRegistry.register("customer_tags", () => {
      return new CustomerTagSyncHandler(deps.customerTagRepo);
    });

    HandlerRegistry.register("purchases", () => {
      return new PurchaseSyncHandler(deps.purchaseRepo);
    });

    HandlerRegistry.register("purchase_items", () => {
      return new PurchaseItemSyncHandler(deps.purchaseRepo);
    });

    HandlerRegistry.register("inventory", () => {
      return new InventorySyncHandler(deps.variantRepo);
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

  async getChanges(ctx: RequestContext, since?: Date, limit = 100) {
    const effectiveLimit = Math.min(limit, 500);

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
      limit: effectiveLimit + 1,
    });

    const hasMore = operations.length > effectiveLimit;
    const results = hasMore ? operations.slice(0, effectiveLimit) : operations;
    const last = results[results.length - 1];
    const serverTimestamp = toISODate(now());

    const nextSince = last?.processedAt?.toISOString() ?? serverTimestamp;

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
