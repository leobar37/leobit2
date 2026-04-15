/**
 * SaleService
 * Provides atomic operations for sales with their items
 * Extends BaseService for common sync and ID generation functionality
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { BaseService, type EntityType } from "./base-service";
import { SyncService } from "../sync/sync-service";
import { SyncStatus, sales as salesTable, saleItems as saleItemsTable } from "@avileo/shared";
import { generateId } from "~/lib/utils";
import { mapToCamelCase, mapToCamelCaseWithDates, normalizeRow } from "../mappers/entity-mapper";
import { eq, sql, and, gte, lte, inArray, isNull } from "drizzle-orm";

/**
 * Sale status types
 */
export type SaleStatus = "draft" | "confirmed" | "active" | "delivered" | "cancelled";

/**
 * Sale type (instant_sale or pre_order)
 */
export type SaleType = "instant_sale" | "pre_order";

/**
 * Sale payment type
 */
export type SalePaymentType = "contado" | "credito";

/**
 * Sale item from database
 */
export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: string | null;
  orderedQuantity: string | null;
  deliveredQuantity: string | null;
  unitPrice: string | null;
  unitPriceQuoted: string | null;
  unitPriceFinal: string | null;
  subtotal: string;
  isModified: boolean;
  originalQuantity: string | null;
}

/**
 * Customer from database (minimal for joining)
 */
interface SaleCustomer {
  id: string;
  name: string;
  dni: string | null;
  phone: string | null;
}

/**
 * Sale from database
 */
export interface Sale {
  id: string;
  businessId: string;
  customerId: string | null;
  customer?: SaleCustomer | null;
  sellerId: string;
  distribucionId: string | null;
  visitaId: string | null;
  type: SaleType;
  saleType: SalePaymentType;
  paymentMode: "pago_total" | "a_cuenta" | "debe_todo" | null;
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  tara: string | null;
  netWeight: string | null;
  saleDate: string;
  deliveryDate: string | null;
  orderDate: string | null;
  status: SaleStatus;
  version: number;
  confirmedSnapshot: Record<string, unknown> | null;
  deliveredSnapshot: Record<string, unknown> | null;
  allowCustomerEdit: boolean;
  syncStatus: "pending" | "synced" | "error";
  syncAttempts: number;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  refundAmount: string | null;
  refundDate: string | null;
  refundMethod: "efectivo" | "yape" | "plin" | "transferencia" | "saldo" | null;
  refundReference: string | null;
  refundNotes: string | null;
  advancePaymentMethod: string | null;
  advanceReferenceNumber: string | null;
  advanceProofImageId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sale with its items (for queries that include items)
 */
export type SaleWithItems = Sale & { items: SaleItem[] };
export type SaleListItem = Sale & { items?: SaleItem[] };

export interface SalePageQuery {
  limit: number;
  offset: number;
  customerId?: string;
  status?: SaleStatus;
  distribucionId?: string | "none" | "all";
  search?: string;
  type?: SaleType;
  saleType?: SalePaymentType;
  startDate?: string;
  endDate?: string;
  hasBalanceDue?: boolean;
}

export interface SaleListPage {
  items: SaleListItem[];
  total: number;
}

/**
 * Input for creating a sale
 */
export interface CreateSaleInput {
  customerId?: string;
  sellerId: string;
  distribucionId?: string;
  visitaId?: string;
  type?: SaleType;
  saleType?: SalePaymentType;
  totalAmount: number;
  amountPaid?: number;
  tara?: number;
  netWeight?: number;
  deliveryDate?: string;
  orderDate?: string;
  paymentMode?: "pago_total" | "a_cuenta" | "debe_todo";
}

/**
 * Input for creating a sale item
 */
export interface CreateSaleItemInput {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity?: number;
  orderedQuantity?: number;
  unitPrice?: number;
  unitPriceQuoted?: number;
  subtotal: number;
}

/**
 * Input for updating a sale
 */
export interface UpdateSaleInput {
  customerId?: string;
  saleType?: SalePaymentType;
  type?: SaleType;
  totalAmount?: number;
  amountPaid?: number;
  balanceDue?: number;
  tara?: number;
  netWeight?: number;
  deliveryDate?: string;
  orderDate?: string;
  paymentMode?: "pago_total" | "a_cuenta" | "debe_todo";
}

/**
 * SaleService
 * Provides atomic CRUD operations for sales with their items
 */
export class SaleService extends BaseService {
  constructor(
    pg: PGlite,
    db: ReturnType<typeof drizzle>,
    syncService: SyncService,
    businessId: string,
    businessUserId: string
  ) {
    super(pg, db, syncService, businessId, businessUserId);
  }

  /**
   * Returns the entity type for this service
   */
  getEntityType(): EntityType {
    return "sales";
  }

  /**
   * Returns the ID prefix for this entity
   */
  getEntityPrefix(): string {
    return "sale";
  }

  private buildPagedSalesWhere(query: SalePageQuery) {
    const conditions = [eq(salesTable.businessId, this.businessId)];

    if (query.distribucionId && query.distribucionId !== "all") {
      if (query.distribucionId === "none") {
        conditions.push(isNull(salesTable.distribucionId));
      } else {
        conditions.push(eq(salesTable.distribucionId, query.distribucionId));
      }
    }

    if (query.customerId) {
      conditions.push(eq(salesTable.customerId, query.customerId));
    }

    if (query.status) {
      conditions.push(eq(salesTable.status, query.status));
    }

    if (query.type) {
      conditions.push(eq(salesTable.type, query.type));
    }

    if (query.saleType) {
      conditions.push(eq(salesTable.saleType, query.saleType));
    }

    if (query.startDate) {
      conditions.push(sql`${salesTable.saleDate} >= ${query.startDate}`);
    }

    if (query.endDate) {
      conditions.push(sql`${salesTable.saleDate} <= ${query.endDate}`);
    }

    if (query.hasBalanceDue) {
      conditions.push(sql`CAST(${salesTable.balanceDue} AS NUMERIC) > 0`);
    }

    if (query.search?.trim()) {
      const searchPattern = `%${query.search.trim()}%`;
      conditions.push(
        sql`(
          ${salesTable.id} LIKE ${searchPattern}
          OR EXISTS (
            SELECT 1
            FROM customers c
            WHERE c.id = ${salesTable.customerId}
              AND c.name LIKE ${searchPattern}
          )
          OR ${salesTable.saleType} LIKE ${searchPattern}
        )`
      );
    }

    return and(...conditions);
  }

  /**
   * Find a sale by ID with its items
   */
  async findById(id: string): Promise<SaleWithItems | null> {
    const saleResult = await this.pg.query<Record<string, unknown>>(
      `SELECT * FROM sales WHERE id = $1`,
      [id]
    );

    if (saleResult.rows.length === 0) {
      return null;
    }

    const sale = mapToCamelCaseWithDates(saleResult.rows[0]) as unknown as Sale;

    // Fetch customer data if customerId exists
    let customer: SaleCustomer | null = null;
    if (sale.customerId) {
      const customerResult = await this.pg.query<Record<string, unknown>>(
        `SELECT id, name, dni, phone FROM customers WHERE id = $1`,
        [sale.customerId]
      );
      if (customerResult.rows.length > 0) {
        customer = mapToCamelCase(customerResult.rows[0]) as unknown as SaleCustomer;
      }
    }

    const itemsResult = await this.pg.query<Record<string, unknown>>(
      `SELECT * FROM sale_items WHERE sale_id = $1 AND business_id = $2`,
      [id, this.businessId]
    );

    const items = itemsResult.rows.map((row) => mapToCamelCase(row) as unknown as SaleItem);

    return {
      ...sale,
      customer,
      items,
    };
  }

  /**
   * Batch-load customers and sale items for an array of sales.
   * Replaces N+1 pattern (2 queries per sale) with 2 fixed queries total.
   */
  private async enrichSalesBatch(sales: Sale[]): Promise<SaleWithItems[]> {
    if (sales.length === 0) return [];

    const customerIds = [...new Set(
      sales.map(s => s.customerId).filter((id): id is string => Boolean(id))
    )];

    const customerMap = new Map<string, SaleCustomer>();
    if (customerIds.length > 0) {
      const customerResult = await this.pg.query<Record<string, unknown>>(
        `SELECT id, name, dni, phone FROM customers WHERE id = ANY($1)`,
        [customerIds]
      );
      for (const row of customerResult.rows) {
        const customer = mapToCamelCase(row) as unknown as SaleCustomer;
        customerMap.set(customer.id, customer);
      }
    }

    const saleIds = sales.map(s => s.id);
    const itemsMap = new Map<string, SaleItem[]>();
    if (saleIds.length > 0) {
      const itemsResult = await this.pg.query<Record<string, unknown>>(
        `SELECT * FROM sale_items WHERE sale_id = ANY($1) AND business_id = $2`,
        [saleIds, this.businessId]
      );
      for (const row of itemsResult.rows) {
        const item = mapToCamelCase(row) as unknown as SaleItem;
        const list = itemsMap.get(item.saleId) || [];
        list.push(item);
        itemsMap.set(item.saleId, list);
      }
    }

    return sales.map(sale => ({
      ...sale,
      customer: sale.customerId ? customerMap.get(sale.customerId) ?? null : null,
      items: itemsMap.get(sale.id) || [],
    }));
  }

  /**
   * Find all sales for the business
   */
  async findByBusiness(): Promise<SaleWithItems[]> {
    const salesResult = await this.db
      .select()
      .from(salesTable)
      .where(eq(salesTable.businessId, this.businessId))
      .orderBy(sql`${salesTable.saleDate} DESC`);

    const sales = salesResult.map(row => mapToCamelCaseWithDates(row) as unknown as Sale);

    return this.enrichSalesBatch(sales);
  }

  async countByBusiness(query: Omit<SalePageQuery, "limit" | "offset"> = {}): Promise<number> {
    const where = this.buildPagedSalesWhere({ limit: 0, offset: 0, ...query });
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(salesTable)
      .where(where);

    return result[0]?.count ?? 0;
  }

  async findPageByBusiness(query: SalePageQuery): Promise<SaleListPage> {
    const perfStart = performance.now();
    const where = this.buildPagedSalesWhere(query);

    const [rows, totalResult] = await Promise.all([
      this.db
        .select()
        .from(salesTable)
        .where(where)
        .orderBy(sql`${salesTable.saleDate} DESC`)
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(salesTable)
        .where(where),
    ]);

    const sales = rows.map((row) => mapToCamelCaseWithDates(row) as unknown as SaleListItem);
    const customerIds = Array.from(
      new Set(
        sales
          .map((sale) => sale.customerId)
          .filter((customerId): customerId is string => Boolean(customerId))
      )
    );

    const customerMap = new Map<string, SaleCustomer>();
    if (customerIds.length > 0) {
      const customerResult = await this.pg.query<Record<string, unknown>>(
        `SELECT id, name, dni, phone FROM customers WHERE id = ANY($1)`,
        [customerIds]
      );

      for (const row of customerResult.rows) {
        const customer = mapToCamelCase(row) as unknown as SaleCustomer;
        customerMap.set(customer.id, customer);
      }
    }

    const result = {
      items: sales.map((sale) => ({
        ...sale,
        customer: sale.customerId ? customerMap.get(sale.customerId) ?? null : null,
      })),
      total: totalResult[0]?.count ?? 0,
    };

    console.log("[Perf][SaleService] findPageByBusiness", {
      offset: query.offset,
      limit: query.limit,
      rows: result.items.length,
      hasSearch: Boolean(query.search?.trim()),
      totalMs: Number((performance.now() - perfStart).toFixed(2)),
    });

    return result;
  }

  /**
   * Find sales by customer ID
   */
  async findByCustomerId(customerId: string): Promise<SaleWithItems[]> {
    const salesResult = await this.db
      .select()
      .from(salesTable)
      .where(and(eq(salesTable.customerId, customerId), eq(salesTable.businessId, this.businessId)))
      .orderBy(sql`${salesTable.saleDate} DESC`);

    const sales = salesResult.map(row => mapToCamelCaseWithDates(row) as unknown as Sale);

    return this.enrichSalesBatch(sales);
  }

  /**
   * Find sales by status
   */
  async findByStatus(status: SaleStatus): Promise<SaleWithItems[]> {
    const salesResult = await this.db
      .select()
      .from(salesTable)
      .where(and(eq(salesTable.status, status), eq(salesTable.businessId, this.businessId)))
      .orderBy(sql`${salesTable.saleDate} DESC`);

    const sales = salesResult.map(row => mapToCamelCaseWithDates(row) as unknown as Sale);

    return this.enrichSalesBatch(sales);
  }

  /**
   * Find sales by distribution ID
   */
  async findByDistribucionId(distribucionId: string): Promise<SaleWithItems[]> {
    const salesResult = await this.db
      .select()
      .from(salesTable)
      .where(and(eq(salesTable.distribucionId, distribucionId), eq(salesTable.businessId, this.businessId)))
      .orderBy(sql`${salesTable.saleDate} DESC`);

    const sales = salesResult.map(row => mapToCamelCaseWithDates(row) as unknown as Sale);

    return this.enrichSalesBatch(sales);
  }

  /**
   * Find sales with no distribution (libres)
   */
  async findByDistribucionIdIsNull(): Promise<SaleWithItems[]> {
    const salesResult = await this.db
      .select()
      .from(salesTable)
      .where(and(isNull(salesTable.distribucionId), eq(salesTable.businessId, this.businessId)))
      .orderBy(sql`${salesTable.saleDate} DESC`);

    const sales = salesResult.map(row => mapToCamelCaseWithDates(row) as unknown as Sale);

    return this.enrichSalesBatch(sales);
  }

  /**
   * Create a draft sale without items
   * Used for creating a new sale that will be edited later
   */
  async createDraft(saleInput: Omit<CreateSaleInput, "totalAmount"> & { totalAmount?: number }): Promise<Sale> {
    const perfStart = performance.now();

    const syncGroupId = this.generateSyncGroup();
    const now = this.now();
    const saleId = generateId();
    const sellerId = saleInput.sellerId;
    const totalAmount = saleInput.totalAmount || 0;
    const type = saleInput.type || "instant_sale";
    const saleType = saleInput.saleType || "contado";

    const insertStart = performance.now();
    await this.pg.exec("BEGIN");

    try {
      await this.pg.query(
        `INSERT INTO sales (
          id, business_id, customer_id, seller_id, distribucion_id, visita_id,
          type, sale_type, payment_mode, total_amount, amount_paid, balance_due,
          tara, net_weight, sale_date, delivery_date, order_date,
          status, version, allow_customer_edit,
          sync_status, sync_attempts, sync_group_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $24)`,
        [
          saleId,
          this.businessId,
          saleInput.customerId || null,
          sellerId,
          saleInput.distribucionId || null,
          saleInput.visitaId || null,
          type,
          saleType,
          saleInput.paymentMode || null,
          totalAmount,
          0,
          totalAmount,
          saleInput.tara || null,
          saleInput.netWeight || null,
          now,
          saleInput.deliveryDate || null,
          saleInput.orderDate || null,
          "draft",
          1,
          true,
          SyncStatus.PENDING,
          0,
          syncGroupId, // Store syncGroupId on the sale record
          now,
        ]
      );

      await this.pg.exec("COMMIT");
      const insertMs = performance.now() - insertStart;

      const enqueueStart = performance.now();
      await this.queueSync(
        "create",
        saleId,
        {
          customerId: saleInput.customerId,
          sellerId,
          distribucionId: saleInput.distribucionId,
          visitaId: saleInput.visitaId,
          type,
          saleType,
          paymentMode: saleInput.paymentMode,
          totalAmount,
          amountPaid: 0,
          balanceDue: totalAmount,
          tara: saleInput.tara,
          netWeight: saleInput.netWeight,
          deliveryDate: saleInput.deliveryDate,
          orderDate: saleInput.orderDate,
          items: [],
        },
        syncGroupId,
        undefined,
        undefined,
        {
          fastPath: true,
          idempotencyKey: `sale:create:${saleId}`,
        }
      );
      const enqueueMs = performance.now() - enqueueStart;

      const totalMs = performance.now() - perfStart;
      console.log("[Perf][SaleService] createDraft", {
        saleId,
        type,
        saleType,
        insertMs: Number(insertMs.toFixed(2)),
        enqueueMs: Number(enqueueMs.toFixed(2)),
        totalMs: Number(totalMs.toFixed(2)),
      });

      return {
        id: saleId,
        businessId: this.businessId,
        customerId: saleInput.customerId || null,
        customer: null,
        sellerId,
        distribucionId: saleInput.distribucionId || null,
        visitaId: saleInput.visitaId || null,
        type,
        saleType,
        paymentMode: saleInput.paymentMode || null,
        totalAmount: totalAmount.toString(),
        amountPaid: "0",
        balanceDue: totalAmount.toString(),
        tara: saleInput.tara?.toString() ?? null,
        netWeight: saleInput.netWeight?.toString() ?? null,
        saleDate: now,
        deliveryDate: saleInput.deliveryDate || null,
        orderDate: saleInput.orderDate || null,
        status: "draft",
        version: 1,
        confirmedSnapshot: null,
        deliveredSnapshot: null,
        allowCustomerEdit: true,
        syncStatus: SyncStatus.PENDING,
        syncAttempts: 0,
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: null,
        refundAmount: null,
        refundDate: null,
        refundMethod: null,
        refundReference: null,
        refundNotes: null,
        advancePaymentMethod: null,
        advanceReferenceNumber: null,
        advanceProofImageId: null,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      console.error("[SaleService] createDraft error:", error);
      await this.pg.exec("ROLLBACK");
      throw error;
    }
  }

  /**
   * Create a sale with items atomically
   * Uses PGlite transaction for atomicity
   * All operations are grouped with the same syncGroupId
   */
  async createWithItems(
    saleInput: CreateSaleInput,
    items: CreateSaleItemInput[]
  ): Promise<Sale> {
    // Validate that we have at least 1 item
    if (items.length === 0) {
      throw new Error("A sale must have at least 1 item");
    }

    // Generate sync group ID for atomic operation
    const syncGroupId = this.generateSyncGroup();
    const now = this.now();

    // Generate IDs
    const saleId = generateId();
    const sellerId = saleInput.sellerId;

    // Calculate amounts
    const totalAmount = saleInput.totalAmount;
    const amountPaid = saleInput.amountPaid ?? 0;
    const balanceDue = totalAmount - amountPaid;

    // Generate item IDs upfront to ensure consistency between local and sync
    const itemIds = items.map(() => generateId());

    // Start transaction
    await this.pg.exec("BEGIN");

    try {
      // Insert sale record
      await this.pg.query(
        `INSERT INTO sales (
          id, business_id, customer_id, seller_id, distribucion_id, visita_id,
          type, sale_type, payment_mode, total_amount, amount_paid, balance_due,
          tara, net_weight, sale_date, delivery_date, order_date,
          status, version, allow_customer_edit,
          sync_status, sync_attempts, sync_group_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $24)`,
        [
          saleId,
          this.businessId,
          saleInput.customerId || null,
          sellerId,
          saleInput.distribucionId || null,
          saleInput.visitaId || null,
          saleInput.type || "instant_sale",
          saleInput.saleType || "contado",
          saleInput.paymentMode || null,
          totalAmount,
          amountPaid,
          balanceDue,
          saleInput.tara || null,
          saleInput.netWeight || null,
          now,
          saleInput.deliveryDate || null,
          saleInput.orderDate || null,
          "draft",
          1,
          true,
          SyncStatus.PENDING,
          0,
          syncGroupId, // Store syncGroupId on the sale record
          now,
        ]
      );

      // Insert all sale items with Drizzle
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemId = itemIds[i];

        await this.db.insert(saleItemsTable).values({
          id: itemId,
          businessId: this.businessId,
          saleId: saleId,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity?.toString() ?? null,
          orderedQuantity: item.orderedQuantity?.toString() ?? null,
          unitPrice: item.unitPrice?.toString() ?? null,
          unitPriceQuoted: item.unitPriceQuoted?.toString() ?? null,
          subtotal: item.subtotal.toString(),
          isModified: false,
        });
      }

      // Commit transaction
      await this.pg.exec("COMMIT");

      // Queue sync operation for sale with items included in payload
      await this.queueSync(
        "create",
        saleId,
        {
          customerId: saleInput.customerId,
          sellerId,
          distribucionId: saleInput.distribucionId,
          visitaId: saleInput.visitaId,
          type: saleInput.type || "instant_sale",
          saleType: saleInput.saleType || "contado",
          paymentMode: saleInput.paymentMode,
          totalAmount,
          amountPaid,
          balanceDue,
          tara: saleInput.tara,
          netWeight: saleInput.netWeight,
          deliveryDate: saleInput.deliveryDate,
          orderDate: saleInput.orderDate,
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            quantity: item.quantity,
            orderedQuantity: item.orderedQuantity,
            unitPrice: item.unitPrice,
            unitPriceQuoted: item.unitPriceQuoted,
            subtotal: item.subtotal,
          })),
        },
        syncGroupId
      );

      // Return the created sale
      const createdSale = await this.findById(saleId);
      if (!createdSale) {
        throw new Error("Failed to retrieve created sale");
      }

      return createdSale;
    } catch (error) {
      // Rollback on any error
      await this.pg.exec("ROLLBACK");
      throw error;
    }
  }

  /**
   * Get the syncGroupId from the sale record directly
   * This is more reliable than querying sync_operations which may not be committed yet
   */
  private async getSaleSyncGroupId(saleId: string): Promise<string | undefined> {
    const result = await this.pg.query<{ sync_group_id: string }>(
      `SELECT sync_group_id FROM sales WHERE id = $1 AND business_id = $2`,
      [saleId, this.businessId]
    );
    return result.rows[0]?.sync_group_id ?? undefined;
  }

  /**
   * Confirm a sale (change status from draft to active)
   * For instant_sales
   */
  async confirm(id: string): Promise<void> {
    const sale = await this.findById(id);

    if (!sale) {
      throw new Error("Sale not found");
    }

    if (sale.status !== "draft") {
      throw new Error("Only draft sales can be confirmed");
    }

    if (sale.type !== "instant_sale") {
      throw new Error("Only instant_sales can be confirmed directly");
    }

    // Validate that sale has items before confirming
    if (sale.items.length === 0) {
      throw new Error("No puedes confirmar una venta sin productos");
    }

    const now = this.now();

    // Recalculate totals from items to ensure consistency
    const totalAmount = sale.items.reduce(
      (sum, item) => sum + parseFloat(item.subtotal || "0"), 0
    );
    const paymentMode = sale.paymentMode || "pago_total";
    const amountPaid = paymentMode === "pago_total"
      ? totalAmount
      : paymentMode === "debe_todo"
        ? 0
        : parseFloat(sale.amountPaid || "0");
    const balanceDue = Math.max(totalAmount - amountPaid, 0);

    await this.pg.query(
      `UPDATE sales SET
        status = 'active',
        total_amount = $1,
        amount_paid = $2,
        balance_due = $3,
        payment_mode = $4,
        sale_type = $5,
        updated_at = $6,
        sync_status = $7
      WHERE id = $8`,
      [
        totalAmount,
        amountPaid,
        balanceDue,
        paymentMode,
        paymentMode === "pago_total" ? "contado" : "credito",
        now,
        SyncStatus.PENDING,
        id,
      ]
    );

    const syncGroupId = await this.getSaleSyncGroupId(id);

    await this.queueSync(
      "update",
      id,
      {
        status: "active",
        saleType: paymentMode === "pago_total" ? "contado" : "credito",
        totalAmount,
        amountPaid,
        balanceDue,
        paymentMode,
      },
      syncGroupId,
      undefined,
      sale.version
    );
  }

  /**
   * Confirm a pre_order (change status from draft to confirmed)
   * For pre_orders
   */
  async confirmPreOrder(id: string, baseVersion: number): Promise<void> {
    const sale = await this.findById(id);

    if (!sale) {
      throw new Error("Sale not found");
    }

    if (sale.status !== "draft") {
      throw new Error("Only draft sales can be confirmed");
    }

    if (sale.type !== "pre_order") {
      throw new Error("Only pre_orders use confirmPreOrder");
    }

    // Validate that sale has items before confirming
    if (sale.items.length === 0) {
      throw new Error("No puedes confirmar un pedido sin productos");
    }

    if (sale.version !== baseVersion) {
      throw new Error("La venta fue modificada por otro usuario. Por favor, intenta de nuevo.");
    }

    const now = this.now();

    // Recalculate totals from items to ensure consistency
    const totalAmount = sale.items.reduce(
      (sum, item) => sum + parseFloat(item.subtotal || "0"), 0
    );
    const paymentMode = sale.paymentMode || "pago_total";
    const amountPaid = paymentMode === "pago_total"
      ? totalAmount
      : paymentMode === "debe_todo"
        ? 0
        : parseFloat(sale.amountPaid || "0");
    const balanceDue = Math.max(totalAmount - amountPaid, 0);

    await this.pg.query(
      `UPDATE sales SET
        status = 'confirmed',
        version = version + 1,
        total_amount = $1,
        amount_paid = $2,
        balance_due = $3,
        payment_mode = $4,
        sale_type = $5,
        updated_at = $6,
        sync_status = $7
      WHERE id = $8 AND version = $9`,
      [
        totalAmount,
        amountPaid,
        balanceDue,
        paymentMode,
        paymentMode === "pago_total" ? "contado" : "credito",
        now,
        SyncStatus.PENDING,
        id,
        baseVersion,
      ]
    );

    const syncGroupId = await this.getSaleSyncGroupId(id);

    await this.queueSync(
      "update",
      id,
      {
        status: "confirmed",
        saleType: paymentMode === "pago_total" ? "contado" : "credito",
        totalAmount,
        amountPaid,
        balanceDue,
        paymentMode,
      },
      syncGroupId,
      undefined,
      sale.version
    );
  }

  /**
   * Mark a pre_order as delivered
   */
  async deliver(id: string): Promise<void> {
    const sale = await this.findById(id);

    if (!sale) {
      throw new Error("Sale not found");
    }

    if (sale.status !== "confirmed") {
      throw new Error("Only confirmed sales can be delivered");
    }

    if (sale.type !== "pre_order") {
      throw new Error("Only pre_orders can be delivered");
    }

    const now = this.now();

    await this.pg.query(
      `UPDATE sales SET status = 'delivered', updated_at = $1, sync_status = $2 WHERE id = $3`,
      [now, SyncStatus.PENDING, id]
    );

    const syncGroupId = await this.getSaleSyncGroupId(id);

    await this.queueSync(
      "update",
      id,
      {
        status: "delivered",
        saleType: sale.saleType,
      },
      syncGroupId,
      undefined,
      sale.version
    );
  }

  /**
   * Finalize delivery of a pre_order with adjustments
   * Allows modifying quantities, prices, and payment before marking as delivered
   */
  async finalizeDelivery(
    id: string,
    options: {
      items: Array<{
        itemId: string;
        deliveredQuantity?: number;
        unitPriceFinal?: number;
        subtotal?: number;
      }>;
      amountPaid?: number;
      paymentMode?: string;
    }
  ): Promise<void> {
    const sale = await this.findById(id);

    if (!sale) {
      throw new Error("Sale not found");
    }

    if (sale.status !== "confirmed") {
      throw new Error("Only confirmed sales can be finalized for delivery");
    }

    if (sale.type !== "pre_order") {
      throw new Error("Only pre_orders can use finalize delivery");
    }

    const now = this.now();
    const syncGroupId = await this.getSaleSyncGroupId(id);

    // Start transaction
    await this.pg.exec("BEGIN");

    try {
      let totalAmount = 0;

      // Update each item with final delivery details
      for (const itemUpdate of options.items) {
        const item = sale.items.find((i) => i.id === itemUpdate.itemId);
        if (!item) continue;

        const deliveredQty = itemUpdate.deliveredQuantity ?? parseFloat(item.orderedQuantity || "0");
        const finalPrice = itemUpdate.unitPriceFinal ?? parseFloat(item.unitPriceQuoted || "0");
        const subtotal = itemUpdate.subtotal ?? deliveredQty * finalPrice;

        totalAmount += subtotal;

        await this.pg.query(
          `UPDATE sale_items SET
            delivered_quantity = $1,
            unit_price_final = $2,
            subtotal = $3,
            is_modified = true
          WHERE id = $4 AND sale_id = $5`,
          [deliveredQty, finalPrice, subtotal, itemUpdate.itemId, id]
        );

        // Queue sync for item update
        await this.queueSync(
          "update",
          itemUpdate.itemId,
          {
            deliveredQuantity: deliveredQty,
            unitPriceFinal: finalPrice,
            subtotal,
            isModified: true,
          },
          syncGroupId,
          "sale_items"
        );
      }

      // Calculate final amounts
      const amountPaid = options.amountPaid ?? parseFloat(sale.amountPaid);
      const balanceDue = totalAmount - amountPaid;

      // Update sale with final totals and mark as delivered
      await this.pg.query(
        `UPDATE sales SET
          status = 'delivered',
          total_amount = $1,
          amount_paid = $2,
          balance_due = $3,
          payment_mode = $4,
          updated_at = $5,
          sync_status = $6
        WHERE id = $7`,
        [totalAmount, amountPaid, balanceDue, options.paymentMode ?? sale.paymentMode, now, SyncStatus.PENDING, id]
      );

      // Commit transaction
      await this.pg.exec("COMMIT");

      // Queue sync for sale update
      await this.queueSync(
        "update",
        id,
        {
          status: "delivered",
          saleType: sale.saleType,
          totalAmount,
          amountPaid,
          balanceDue,
          paymentMode: options.paymentMode ?? sale.paymentMode,
        },
        syncGroupId,
        undefined,
        sale.version
      );
    } catch (error) {
      await this.pg.exec("ROLLBACK");
      throw error;
    }
  }

  /**
   * Cancel a sale
   */
  async cancel(id: string, reason: string): Promise<void> {
    const sale = await this.findById(id);

    if (!sale) {
      throw new Error("Sale not found");
    }

    if (sale.status === "cancelled") {
      throw new Error("Sale is already cancelled");
    }

    const now = this.now();

    await this.pg.query(
      `UPDATE sales SET
        status = 'cancelled',
        cancelled_at = $1,
        cancelled_by = $2,
        cancel_reason = $3,
        updated_at = $1,
        sync_status = $4
      WHERE id = $5`,
      [now, this.businessUserId, reason, SyncStatus.PENDING, id]
    );

    const syncGroupId = await this.getSaleSyncGroupId(id);

    await this.queueSync(
      "update",
      id,
      {
        status: "cancelled",
        cancelReason: reason,
        cancelledAt: now,
        cancelledBy: this.businessUserId,
      },
      syncGroupId,
      undefined,
      sale.version
    );
  }

  /**
   * Update a sale
   */
  async update(id: string, input: UpdateSaleInput): Promise<void> {
    const sale = await this.findById(id);

    if (!sale) {
      throw new Error("Sale not found");
    }

    if (sale.status === "cancelled") {
      throw new Error("Cannot update a cancelled sale");
    }

    const updates: string[] = [];
    const params: (string | number | null)[] = [];
    let paramIndex = 1;
    const now = this.now();

    if (input.customerId !== undefined) {
      updates.push(`customer_id = $${paramIndex}`);
      params.push(input.customerId || null);
      paramIndex++;
    }

    if (input.saleType !== undefined) {
      updates.push(`sale_type = $${paramIndex}`);
      params.push(input.saleType);
      paramIndex++;
    }

    if (input.type !== undefined) {
      updates.push(`type = $${paramIndex}`);
      params.push(input.type);
      paramIndex++;
    }

    if (input.totalAmount !== undefined) {
      updates.push(`total_amount = $${paramIndex}`);
      params.push(input.totalAmount);
      paramIndex++;
    }

    if (input.amountPaid !== undefined) {
      updates.push(`amount_paid = $${paramIndex}`);
      params.push(input.amountPaid);
      paramIndex++;
    }

    if (input.balanceDue !== undefined) {
      updates.push(`balance_due = $${paramIndex}`);
      params.push(input.balanceDue);
      paramIndex++;
    }

    if (input.tara !== undefined) {
      updates.push(`tara = $${paramIndex}`);
      params.push(input.tara);
      paramIndex++;
    }

    if (input.netWeight !== undefined) {
      updates.push(`net_weight = $${paramIndex}`);
      params.push(input.netWeight);
      paramIndex++;
    }

    if (input.deliveryDate !== undefined) {
      updates.push(`delivery_date = $${paramIndex}`);
      params.push(input.deliveryDate || null);
      paramIndex++;
    }

    if (input.orderDate !== undefined) {
      updates.push(`order_date = $${paramIndex}`);
      params.push(input.orderDate || null);
      paramIndex++;
    }

    if (input.paymentMode !== undefined) {
      updates.push(`payment_mode = $${paramIndex}`);
      params.push(input.paymentMode || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return;
    }

    updates.push(`updated_at = $${paramIndex}`);
    params.push(now);
    paramIndex++;
    updates.push(`sync_status = $${paramIndex}`);
    params.push(SyncStatus.PENDING);
    paramIndex++;

    // Add id as the last parameter
    params.push(id);

    await this.pg.query(
      `UPDATE sales SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      params
    );

    const syncGroupId = await this.getSaleSyncGroupId(id);

    await this.queueSync(
      "update",
      id,
      input as Record<string, unknown>,
      syncGroupId,
      undefined,
      sale.version,
      {
        fastPath: true,
      }
    );
  }

  /**
   * Delete a sale (only allowed for draft sales)
   */
  async delete(id: string): Promise<void> {
    const sale = await this.findById(id);

    if (!sale) {
      throw new Error("Sale not found");
    }

    if (sale.status !== "draft") {
      throw new Error("Only draft sales can be deleted");
    }

    // Start transaction for atomic deletion
    await this.pg.exec("BEGIN");

    try {
      // Delete sale items first (cascade on server will handle the sync)
      await this.pg.query(`DELETE FROM sale_items WHERE sale_id = $1`, [id]);

      // Delete the sale
      await this.pg.query(`DELETE FROM sales WHERE id = $1`, [id]);

      await this.pg.exec("COMMIT");

      // Queue deletion sync for the sale only (items are handled by cascade)
      await this.queueSync(
        "delete",
        id,
        {}
      );
    } catch (error) {
      await this.pg.exec("ROLLBACK");
      throw error;
    }
  }

  /**
   * Add an item to an existing sale
   */
  async addItem(saleId: string, item: CreateSaleItemInput): Promise<SaleItem> {
    const perfStart = performance.now();
    const saleResult = await this.pg.query<Record<string, unknown>>(
      `SELECT id, type, status, sync_group_id FROM sales WHERE id = $1 AND business_id = $2 LIMIT 1`,
      [saleId, this.businessId]
    );

    if (saleResult.rows.length === 0) {
      throw new Error("Sale not found");
    }

    const saleMeta = mapToCamelCase(saleResult.rows[0]) as {
      id: string;
      type: SaleType;
      status: SaleStatus;
      syncGroupId?: string | null;
    };

    const isConfirmedPreOrder = saleMeta.type === "pre_order" && saleMeta.status === "confirmed";
    if (saleMeta.status !== "draft" && !isConfirmedPreOrder) {
      throw new Error("Only draft or confirmed pre_order sales can have items added");
    }

    const existingItemResult = await this.pg.query<Record<string, unknown>>(
      `SELECT id
       FROM sale_items
       WHERE sale_id = $1 AND business_id = $2 AND product_id = $3 AND variant_id = $4
       LIMIT 1`,
      [saleId, this.businessId, item.productId, item.variantId]
    );
    
    if (existingItemResult.rows.length > 0) {
      throw new Error("El producto ya está en la venta. Edita la cantidad desde el carrito.");
    }

    const saleSyncGroupId = saleMeta.syncGroupId ?? undefined;

    const itemId = this.generateId();
    const now = this.now();

    // Use Drizzle to insert the item with the sale's syncGroupId
    await this.db.insert(saleItemsTable).values({
      id: itemId,
      businessId: this.businessId,
      saleId: saleId,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName,
      quantity: item.quantity?.toString() ?? null,
      orderedQuantity: item.orderedQuantity?.toString() ?? null,
      unitPrice: item.unitPrice?.toString() ?? null,
      unitPriceQuoted: item.unitPriceQuoted?.toString() ?? null,
      subtotal: item.subtotal.toString(),
      isModified: false,
      syncGroupId: saleSyncGroupId,
    });

    // Update sale total atomically to prevent race conditions
    await this.pg.query(
      `UPDATE sales SET
        total_amount = total_amount + $1,
        balance_due = balance_due + $1,
        updated_at = $2,
        sync_status = $3
      WHERE id = $4`,
      [item.subtotal, now, SyncStatus.PENDING, saleId]
    );

    // Queue sync for the new item (use same syncGroupId as the sale insert to ensure correct order)
    console.log("[SaleService] addItem - saleSyncGroupId:", saleSyncGroupId, "saleId:", saleId);
    await this.queueSync(
      "create",
      itemId,
      {
        saleId,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        orderedQuantity: item.orderedQuantity,
        unitPrice: item.unitPrice,
        unitPriceQuoted: item.unitPriceQuoted,
        subtotal: item.subtotal,
      },
      saleSyncGroupId,
      "sale_items",
      undefined,
      {
        fastPath: true,
      }
    );

    // Return the created item
    const itemResult = await this.pg.query<Record<string, unknown>>(
      `SELECT * FROM sale_items WHERE id = $1`,
      [itemId]
    );

    console.log("[Perf][SaleService] addItem", {
      saleId,
      itemId,
      totalMs: Number((performance.now() - perfStart).toFixed(2)),
    });

    return mapToCamelCase(itemResult.rows[0]) as unknown as SaleItem;
  }

  /**
   * Update an item in a sale
   */
  async updateItem(
    saleId: string,
    itemId: string,
    data: {
      quantity?: number;
      unitPrice?: number;
      subtotal?: number;
    }
  ): Promise<SaleItem> {
    const perfStart = performance.now();
    const saleResult = await this.pg.query<Record<string, unknown>>(
      `SELECT id, type, status, sync_group_id FROM sales WHERE id = $1 AND business_id = $2 LIMIT 1`,
      [saleId, this.businessId]
    );

    if (saleResult.rows.length === 0) {
      throw new Error("Sale not found");
    }

    const saleMeta = mapToCamelCase(saleResult.rows[0]) as {
      id: string;
      type: SaleType;
      status: SaleStatus;
      syncGroupId?: string | null;
    };

    const isConfirmedPreOrder = saleMeta.type === "pre_order" && saleMeta.status === "confirmed";
    if (saleMeta.status !== "draft" && !isConfirmedPreOrder) {
      throw new Error("Only draft or confirmed pre_order sales can have items updated");
    }

    // Get existing item to calculate difference
    const itemResult = await this.pg.query<Record<string, unknown>>(
      `SELECT * FROM sale_items WHERE id = $1 AND sale_id = $2`,
      [itemId, saleId]
    );

    if (itemResult.rows.length === 0) {
      throw new Error("Item not found in sale");
    }

    const existingItem = mapToCamelCase(itemResult.rows[0]) as unknown as SaleItem;
    const oldSubtotal = parseFloat(existingItem.subtotal || "0");
    const newSubtotal = data.subtotal ?? oldSubtotal;
    const subtotalDiff = newSubtotal - oldSubtotal;
    const now = this.now();

    // Update the item using Drizzle
    await this.db.update(saleItemsTable)
      .set({
        quantity: data.quantity?.toString() ?? existingItem.quantity,
        unitPrice: data.unitPrice?.toString() ?? existingItem.unitPrice,
        subtotal: data.subtotal?.toString() ?? existingItem.subtotal,
        isModified: true,
      })
      .where(eq(saleItemsTable.id, itemId));

    // Update sale total if subtotal changed
    if (Math.abs(subtotalDiff) > 0.01) {
      await this.pg.query(
        `UPDATE sales SET
          total_amount = total_amount + $1,
          balance_due = balance_due + $1,
          updated_at = $2,
          sync_status = $3
        WHERE id = $4`,
        [subtotalDiff, now, SyncStatus.PENDING, saleId]
      );
    }

    // Queue sync for the updated item with same syncGroupId as the sale insert
    const saleSyncGroupId = saleMeta.syncGroupId ?? undefined;
    await this.queueSync(
      "update",
      itemId,
      {
        saleId,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        subtotal: data.subtotal,
      },
      saleSyncGroupId,
      "sale_items",
      undefined,
      {
        fastPath: true,
      }
    );

    // Return updated item
    const updatedResult = await this.pg.query<Record<string, unknown>>(
      `SELECT * FROM sale_items WHERE id = $1`,
      [itemId]
    );

    console.log("[Perf][SaleService] updateItem", {
      saleId,
      itemId,
      totalMs: Number((performance.now() - perfStart).toFixed(2)),
    });

    return mapToCamelCase(updatedResult.rows[0]) as unknown as SaleItem;
  }

  /**
   * Remove an item from a sale
   */
  async removeItem(saleId: string, itemId: string): Promise<void> {
    const perfStart = performance.now();
    const saleResult = await this.pg.query<Record<string, unknown>>(
      `SELECT id, type, status, sync_group_id FROM sales WHERE id = $1 AND business_id = $2 LIMIT 1`,
      [saleId, this.businessId]
    );

    if (saleResult.rows.length === 0) {
      throw new Error("Sale not found");
    }

    const saleMeta = mapToCamelCase(saleResult.rows[0]) as {
      id: string;
      type: SaleType;
      status: SaleStatus;
      syncGroupId?: string | null;
    };

    const isConfirmedPreOrder = saleMeta.type === "pre_order" && saleMeta.status === "confirmed";
    if (saleMeta.status !== "draft" && !isConfirmedPreOrder) {
      throw new Error("Only draft or confirmed pre_order sales can have items removed");
    }

    // Get item to calculate refund
    const itemResult = await this.pg.query<{ subtotal: string }>(
      `SELECT subtotal FROM sale_items WHERE id = $1 AND sale_id = $2`,
      [itemId, saleId]
    );

    if (itemResult.rows.length === 0) {
      throw new Error("Item not found in sale");
    }

    const subtotal = parseFloat(itemResult.rows[0].subtotal);
    const now = this.now();

    // Delete the item using Drizzle
    await this.db.delete(saleItemsTable).where(eq(saleItemsTable.id, itemId));

    // Update sale total atomically to prevent race conditions
    await this.pg.query(
      `UPDATE sales SET
        total_amount = total_amount - $1,
        balance_due = balance_due - $1,
        updated_at = $2,
        sync_status = $3
      WHERE id = $4`,
      [subtotal, now, SyncStatus.PENDING, saleId]
    );

    // Queue sync for the deleted item with same syncGroupId as the sale insert
    const saleSyncGroupId = saleMeta.syncGroupId ?? undefined;
    await this.queueSync(
      "delete",
      itemId,
      {
        saleId,
      },
      saleSyncGroupId,
      "sale_items",
      undefined,
      {
        fastPath: true,
      }
    );

    console.log("[Perf][SaleService] removeItem", {
      saleId,
      itemId,
      totalMs: Number((performance.now() - perfStart).toFixed(2)),
    });
  }

  /**
   * Record a payment for a sale
   */
  async recordPayment(saleId: string, amount: number, paymentMethod: string): Promise<void> {
    const sale = await this.findById(saleId);

    if (!sale) {
      throw new Error("Sale not found");
    }

    if (sale.status === "cancelled") {
      throw new Error("Cannot record payment for cancelled sale");
    }

    const now = this.now();

    // Use atomic UPDATE to prevent race conditions with concurrent payments
    await this.pg.query(
      `UPDATE sales SET
        amount_paid = amount_paid + $1,
        balance_due = balance_due - $1,
        updated_at = $2,
        sync_status = $3
      WHERE id = $4`,
      [amount, now, SyncStatus.PENDING, saleId]
    );

    // Fetch updated values for sync
    const updatedSale = await this.findById(saleId);
    if (!updatedSale) {
      throw new Error("Sale not found after payment");
    }

    // Get syncGroupId to ensure payment is grouped with the sale operations
    const syncGroupId = await this.getSaleSyncGroupId(saleId);

    await this.queueSync(
      "update",
      saleId,
      {
        amountPaid: parseFloat(updatedSale.amountPaid),
        balanceDue: parseFloat(updatedSale.balanceDue),
      },
      syncGroupId,
      undefined,
      sale.version
    );
  }

  /**
   * Get start date for a period
   */
  private getStartDate(period: { type: string; startDate?: string; endDate?: string }): Date {
    const now = new Date();

    if (period.startDate) {
      return new Date(period.startDate);
    }

    switch (period.type) {
      case "day":
        now.setHours(0, 0, 0, 0);
        return now;
      case "week":
        now.setDate(now.getDate() - now.getDay());
        now.setHours(0, 0, 0, 0);
        return now;
      case "month":
        now.setDate(1);
        now.setHours(0, 0, 0, 0);
        return now;
      case "year":
        now.setMonth(0, 1);
        now.setHours(0, 0, 0, 0);
        return now;
      default:
        now.setHours(0, 0, 0, 0);
        return now;
    }
  }

  /**
   * Get sales stats for dashboard (current period)
   */
  async getSalesStats(period: { type: string; startDate?: string; endDate?: string }): Promise<{
    amount: number;
    kilos: number;
    count: number;
  }> {
    const startDate = this.getStartDate(period);

    // Build where conditions
    const conditions = [
      eq(salesTable.businessId, this.businessId),
      inArray(salesTable.status, ["active", "delivered"]),
      gte(salesTable.saleDate, startDate),
    ];

    if (period.endDate) {
      conditions.push(lte(salesTable.saleDate, new Date(period.endDate)));
    }

    const result = await this.db
      .select({
        amount: sql<string>`COALESCE(SUM(${salesTable.totalAmount}), 0)`,
        kilos: sql<string>`COALESCE(SUM(${salesTable.netWeight}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(salesTable)
      .where(and(...conditions));

    const row = result[0];
    return {
      amount: parseFloat(row?.amount || "0"),
      kilos: parseFloat(row?.kilos || "0"),
      count: Number(row?.count || 0),
    };
  }

  /**
   * Get debtors summary from local sales data
   */
  async getDebtorsSummary(): Promise<{
    totalDebt: number;
    debtorsCount: number;
  }> {
    const result = await this.db
      .select({
        totalDebt: sql<string>`COALESCE(SUM(${salesTable.balanceDue}), 0)`,
        debtorsCount: sql<number>`COUNT(DISTINCT ${salesTable.customerId})`,
      })
      .from(salesTable)
      .where(
        and(
          eq(salesTable.businessId, this.businessId),
          sql`${salesTable.balanceDue} > 0`,
          sql`${salesTable.status} NOT IN ('cancelled', 'draft')`,
          sql`${salesTable.customerId} IS NOT NULL`
        )
      );

    const row = result[0];
    return {
      totalDebt: parseFloat(row?.totalDebt || "0"),
      debtorsCount: Number(row?.debtorsCount || 0),
    };
  }

  /**
   * Get sales chart data (daily totals for the period)
   */
  async getSalesChart(period: { type: string; startDate?: string; endDate?: string }): Promise<{
    labels: string[];
    data: number[];
  }> {
    const startDate = this.getStartDate(period);

    // Build where conditions
    const conditions = [
      eq(salesTable.businessId, this.businessId),
      inArray(salesTable.status, ["active", "delivered"]),
      gte(salesTable.saleDate, startDate),
    ];

    if (period.endDate) {
      conditions.push(lte(salesTable.saleDate, new Date(period.endDate)));
    }

    // Get daily sales totals using Drizzle
    const result = await this.db
      .select({
        date: sql<string>`DATE(${salesTable.saleDate})`,
        total: sql<string>`COALESCE(SUM(${salesTable.totalAmount}), 0)`,
      })
      .from(salesTable)
      .where(and(...conditions))
      .groupBy(sql`DATE(${salesTable.saleDate})`)
      .orderBy(sql`DATE(${salesTable.saleDate})`);

    const labels: string[] = [];
    const data: number[] = [];

    for (const row of result) {
      // Format date as day name (Lun, Mar, etc.)
      const date = new Date(row.date);
      const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      labels.push(dayNames[date.getDay()]);
      data.push(parseFloat(row.total));
    }

    return { labels, data };
  }
}
