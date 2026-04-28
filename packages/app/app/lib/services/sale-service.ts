/**
 * SaleService
 * Provides atomic operations for sales with their items
 * Extends BaseService for common sync and ID generation functionality
 *
 * NOTE: This service does NOT extend the generated SalesService directly
 * because it manages TWO entities atomically (sales + sale_items) with
 * complex business logic (confirm, deliver, cancel, finalize delivery).
 * Instead, it composes GeneratedSalesService and GeneratedItemsService
 * to delegate basic CRUD while preserving atomic multi-entity operations.
 */

import type { SyncClientEngineLike } from "./base-service";
import { BaseService, type EntityType } from "./base-service";
import { generateId } from "~/lib/utils";
import { mapToCamelCase, mapToCamelCaseWithDates } from "../mappers/entity-mapper";
import { eq, sql, and, gte, lte, inArray, isNull } from "drizzle-orm";
import {
  AbonosService as GeneratedAbonosService,
  SalesService as GeneratedSalesService,
  SaleItemsService as GeneratedItemsService,
} from "~/lib/sync/generated/services";

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
  businessId: string;
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
 * Extends BaseService for common sync and ID generation functionality
 */
export class SaleService extends BaseService {
  private generatedSalesService: GeneratedSalesService;
  private generatedItemsService: GeneratedItemsService;
  private generatedAbonosService: GeneratedAbonosService;

  constructor(engine: SyncClientEngineLike) {
    super(engine);
    this.generatedSalesService = new GeneratedSalesService(engine);
    this.generatedItemsService = new GeneratedItemsService(engine);
    this.generatedAbonosService = new GeneratedAbonosService(engine);
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

  /**
   * Normalizes sale monetary and weight fields after reading from DB
   */
  private normalizeSale<T extends { totalAmount: string | number; amountPaid: string | number; balanceDue: string | number; tara: string | number | null; netWeight: string | number | null }>(sale: T): T {
    return this.generatedSalesService.normalizeRow(sale as any) as unknown as T;
  }

  /**
   * Normalizes sale item monetary and weight fields after reading from DB
   */
  private normalizeSaleItem<T extends { subtotal: string | number; quantity: string | number | null; orderedQuantity: string | number | null; deliveredQuantity: string | number | null; unitPrice: string | number | null; unitPriceQuoted: string | number | null; unitPriceFinal: string | number | null }>(item: T): T {
    return this.generatedItemsService.normalizeRow(item as any) as unknown as T;
  }

  private buildPagedSalesWhere(query: SalePageQuery) {
    const conditions = [eq(this.tables.sales.businessId, this.businessId)];

    if (query.distribucionId && query.distribucionId !== "all") {
      if (query.distribucionId === "none") {
        conditions.push(isNull(this.tables.sales.distribucionId));
      } else {
        conditions.push(eq(this.tables.sales.distribucionId, query.distribucionId));
      }
    }

    if (query.customerId) {
      conditions.push(eq(this.tables.sales.customerId, query.customerId));
    }

    if (query.status) {
      conditions.push(eq(this.tables.sales.status, query.status));
    }

    if (query.type) {
      conditions.push(eq(this.tables.sales.type, query.type));
    }

    if (query.saleType) {
      conditions.push(eq(this.tables.sales.saleType, query.saleType));
    }

    if (query.startDate) {
      conditions.push(gte(this.tables.sales.saleDate, query.startDate));
    }

    if (query.endDate) {
      conditions.push(lte(this.tables.sales.saleDate, query.endDate));
    }

    if (query.hasBalanceDue) {
      conditions.push(sql`CAST(${this.tables.sales.balanceDue} AS NUMERIC) > 0`);
    }

    if (query.search?.trim()) {
      const searchPattern = `%${query.search.trim()}%`;
      conditions.push(
        sql`(
          ${this.tables.sales.id} LIKE ${searchPattern}
          OR EXISTS (
            SELECT 1
            FROM this.tables.customers c
            WHERE c.id = ${this.tables.sales.customerId}
              AND c.name LIKE ${searchPattern}
          )
          OR ${this.tables.sales.saleType} LIKE ${searchPattern}
        )`
      );
    }

    return and(...conditions);
  }

  /**
   * Find a sale by ID with its items (enriched with customer and items)
   * Overrides the generated SalesService.findById to include related data
   */
  async findById(id: string): Promise<SaleWithItems | null> {
    const saleResult = await this.db
      .select()
      .from(this.tables.sales)
      .where(eq(this.tables.sales.id, id))
      .limit(1);

    if (saleResult.length === 0) {
      return null;
    }

    const sale = this.normalizeSale(mapToCamelCaseWithDates(saleResult[0]) as unknown as Sale);

    // Fetch customer data if customerId exists
    let customer: SaleCustomer | null = null;
    if (sale.customerId) {
      const customerResult = await this.db
        .select({
          id: this.tables.customers.id,
          name: this.tables.customers.name,
          dni: this.tables.customers.dni,
          phone: this.tables.customers.phone,
        })
        .from(this.tables.customers)
        .where(eq(this.tables.customers.id, sale.customerId))
        .limit(1);
      if (customerResult.length > 0) {
        customer = customerResult[0] as unknown as SaleCustomer;
      }
    }

    const itemsResult = await this.db
      .select()
      .from(this.tables.saleItems)
      .where(
        and(
          eq(this.tables.saleItems.saleId, id),
          eq(this.tables.saleItems.businessId, this.businessId)
        )
      );

    const items = itemsResult.map((row) => this.normalizeSaleItem(mapToCamelCase(row) as unknown as SaleItem));

    return {
      ...sale,
      customer,
      items,
    };
  }

  /**
   * Batch-load this.tables.customers and sale items for an array of sales.
   * Replaces N+1 pattern (2 queries per sale) with 2 fixed queries total.
   */
  private async enrichSalesBatch(sales: Sale[]): Promise<SaleWithItems[]> {
    if (sales.length === 0) return [];

    const customerIds = [...new Set(
      sales.map(s => s.customerId).filter((id): id is string => Boolean(id))
    )];

    const customerMap = new Map<string, SaleCustomer>();
    if (customerIds.length > 0) {
      const customerResult = await this.db
        .select({
          id: this.tables.customers.id,
          name: this.tables.customers.name,
          dni: this.tables.customers.dni,
          phone: this.tables.customers.phone,
        })
        .from(this.tables.customers)
        .where(inArray(this.tables.customers.id, customerIds));
      for (const row of customerResult) {
        customerMap.set(row.id, row as unknown as SaleCustomer);
      }
    }

    const saleIds = sales.map(s => s.id);
    const itemsMap = new Map<string, SaleItem[]>();
    if (saleIds.length > 0) {
      const itemsResult = await this.db
        .select()
        .from(this.tables.saleItems)
        .where(
          and(
            inArray(this.tables.saleItems.saleId, saleIds),
            eq(this.tables.saleItems.businessId, this.businessId)
          )
        );
      for (const row of itemsResult) {
        const item = this.normalizeSaleItem(mapToCamelCase(row) as unknown as SaleItem);
        const list = itemsMap.get(item.saleId) || [];
        list.push(item);
        itemsMap.set(item.saleId, list);
      }
    }

    return sales.map(sale => ({
      ...sale,
      customer: sale.customerId ? customerMap.get(sale.customerId) ?? undefined : undefined,
      items: itemsMap.get(sale.id) || [],
    }));
  }

  /**
   * Find all sales for the business (enriched with items and customer)
   * Overrides the generated SalesService.findByBusiness to include related data
   */
  async findByBusiness(): Promise<SaleWithItems[]> {
    const salesResult = await this.db
      .select()
      .from(this.tables.sales)
      .where(eq(this.tables.sales.businessId, this.businessId))
      .orderBy(sql`${this.tables.sales.saleDate} DESC`, sql`${this.tables.sales.createdAt} DESC`);

    const sales = salesResult.map(row => this.normalizeSale(mapToCamelCaseWithDates(row) as unknown as Sale));

    return this.enrichSalesBatch(sales);
  }

  async countByBusiness(query: Omit<SalePageQuery, "limit" | "offset"> = {}): Promise<number> {
    const where = this.buildPagedSalesWhere({ limit: 0, offset: 0, ...query });
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(this.tables.sales)
      .where(where);

    return result[0]?.count ?? 0;
  }

  async findPageByBusiness(query: SalePageQuery): Promise<SaleListPage> {
    const perfStart = performance.now();
    const where = this.buildPagedSalesWhere(query);

    const [rows, totalResult] = await Promise.all([
      this.db
        .select()
        .from(this.tables.sales)
        .where(where)
        .orderBy(sql`${this.tables.sales.saleDate} DESC`, sql`${this.tables.sales.createdAt} DESC`)
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(this.tables.sales)
        .where(where),
    ]);

    const sales = rows.map((row) => this.normalizeSale(mapToCamelCaseWithDates(row) as unknown as SaleListItem));
    const customerIds = Array.from(
      new Set(
        sales
          .map((sale) => sale.customerId)
          .filter((customerId): customerId is string => Boolean(customerId))
      )
    );

    const customerMap = new Map<string, SaleCustomer>();
    if (customerIds.length > 0) {
      const customerResult = await this.db
        .select({
          id: this.tables.customers.id,
          name: this.tables.customers.name,
          dni: this.tables.customers.dni,
          phone: this.tables.customers.phone,
        })
        .from(this.tables.customers)
        .where(inArray(this.tables.customers.id, customerIds));

      for (const row of customerResult) {
        customerMap.set(row.id, row as unknown as SaleCustomer);
      }
    }

    const result = {
      items: sales.map((sale) => ({
        ...sale,
        customer: sale.customerId ? customerMap.get(sale.customerId) ?? undefined : undefined,
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
      .from(this.tables.sales)
      .where(and(eq(this.tables.sales.customerId, customerId), eq(this.tables.sales.businessId, this.businessId)))
      .orderBy(sql`${this.tables.sales.saleDate} DESC`, sql`${this.tables.sales.createdAt} DESC`);

    const sales = salesResult.map(row => this.normalizeSale(mapToCamelCaseWithDates(row) as unknown as Sale));

    return this.enrichSalesBatch(sales);
  }

  /**
   * Find sales by status
   */
  async findByStatus(status: SaleStatus): Promise<SaleWithItems[]> {
    const salesResult = await this.db
      .select()
      .from(this.tables.sales)
      .where(and(eq(this.tables.sales.status, status), eq(this.tables.sales.businessId, this.businessId)))
      .orderBy(sql`${this.tables.sales.saleDate} DESC`, sql`${this.tables.sales.createdAt} DESC`);

    const sales = salesResult.map(row => this.normalizeSale(mapToCamelCaseWithDates(row) as unknown as Sale));

    return this.enrichSalesBatch(sales);
  }

  /**
   * Find sales by distribution ID
   */
  async findByDistribucionId(distribucionId: string): Promise<SaleWithItems[]> {
    const salesResult = await this.db
      .select()
      .from(this.tables.sales)
      .where(and(eq(this.tables.sales.distribucionId, distribucionId), eq(this.tables.sales.businessId, this.businessId)))
      .orderBy(sql`${this.tables.sales.saleDate} DESC`, sql`${this.tables.sales.createdAt} DESC`);

    const sales = salesResult.map(row => this.normalizeSale(mapToCamelCaseWithDates(row) as unknown as Sale));

    return this.enrichSalesBatch(sales);
  }

  /**
   * Find sales with no distribution (libres)
   */
  async findByDistribucionIdIsNull(): Promise<SaleWithItems[]> {
    const salesResult = await this.db
      .select()
      .from(this.tables.sales)
      .where(and(isNull(this.tables.sales.distribucionId), eq(this.tables.sales.businessId, this.businessId)))
      .orderBy(sql`${this.tables.sales.saleDate} DESC`, sql`${this.tables.sales.createdAt} DESC`);

    const sales = salesResult.map(row => this.normalizeSale(mapToCamelCaseWithDates(row) as unknown as Sale));

    return this.enrichSalesBatch(sales);
  }

  /**
   * Create a draft sale without items
   * Used for creating a new sale that will be edited later
   */
  async createDraft(saleInput: Omit<CreateSaleInput, "totalAmount"> & { totalAmount?: number }): Promise<Sale> {
    const perfStart = performance.now();

    const saleDate = this.now();
    const sellerId = saleInput.sellerId;
    const totalAmount = saleInput.totalAmount || 0;
    const type = saleInput.type || "instant_sale";
    const saleType = saleInput.saleType || "contado";

    const result = await this.generatedSalesService.create({
      customerId: saleInput.customerId ?? undefined,
      sellerId,
      distribucionId: saleInput.distribucionId ?? undefined,
      visitaId: saleInput.visitaId ?? undefined,
      type,
      saleType,
      paymentMode: saleInput.paymentMode ?? undefined,
      totalAmount,
      amountPaid: 0,
      balanceDue: totalAmount,
      tara: saleInput.tara ?? undefined,
      netWeight: saleInput.netWeight ?? undefined,
      saleDate,
      deliveryDate: saleInput.deliveryDate ?? undefined,
      orderDate: saleInput.orderDate ?? undefined,
      status: "draft",
      allowCustomerEdit: true,
      advancePaymentMethod: undefined,
      advanceReferenceNumber: undefined,
      advanceProofImageId: undefined,
      cancelledAt: undefined,
      cancelledBy: undefined,
      cancelReason: undefined,
      refundAmount: undefined,
      refundDate: undefined,
      refundMethod: undefined,
      refundReference: undefined,
      refundNotes: undefined,
    });

    const totalMs = performance.now() - perfStart;
    console.log("[Perf][SaleService] createDraft", {
      saleId: result.id,
      type,
      saleType,
      totalMs: Number(totalMs.toFixed(2)),
    });

    return result as unknown as Sale;
  }

  /**
   * Create a sale with items atomically
   * Uses PGlite transaction for atomicity
   */
  async createWithItems(
    saleInput: CreateSaleInput,
    items: CreateSaleItemInput[]
  ): Promise<Sale> {
    if (items.length === 0) {
      throw new Error("A sale must have at least 1 item");
    }

    const saleDate = this.now();
    const sellerId = saleInput.sellerId;
    const totalAmount = saleInput.totalAmount;
    const amountPaid = saleInput.amountPaid ?? 0;
    const balanceDue = totalAmount - amountPaid;

    const saleId = this.generateId();
    const correlationId = `sale:create:${saleId}`;
    const itemRows = items.map((item) => ({
      id: this.generateId(),
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
    }));

    await this.engine.batch(async (ctx) => {
      await this.generatedSalesService.createInBatch(ctx, {
        customerId: saleInput.customerId ?? undefined,
        sellerId,
        distribucionId: saleInput.distribucionId ?? undefined,
        visitaId: saleInput.visitaId ?? undefined,
        type: saleInput.type || "instant_sale",
        saleType: saleInput.saleType || "contado",
        paymentMode: saleInput.paymentMode ?? undefined,
        totalAmount,
        amountPaid,
        balanceDue,
        tara: saleInput.tara,
        netWeight: saleInput.netWeight,
        saleDate,
        deliveryDate: saleInput.deliveryDate ?? undefined,
        orderDate: saleInput.orderDate ?? undefined,
        status: "draft",
        allowCustomerEdit: true,
      }, {
        id: saleId,
        idempotencyKey: `sale:create:${saleId}`,
        correlationId,
        syncPayloadExtra: {
          items: itemRows.map((item) => ({
            id: item.id,
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
      });

      for (const item of itemRows) {
        await this.generatedItemsService.createInBatch(ctx, {
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
        }, {
          id: item.id,
          correlationId,
          skipSync: true,
        });
      }

      if (saleInput.saleType === "credito" && amountPaid > 0 && saleInput.customerId) {
        const abonoId = this.generateId();
        await this.generatedAbonosService.createInBatch(ctx, {
          customerId: saleInput.customerId,
          sellerId,
          amount: amountPaid,
          paymentMethod: "efectivo",
          referenceNumber: `init-sale:${saleId}`,
          relatedSaleId: saleId,
          notes: "Abono inicial registrado en la venta",
        }, {
          id: abonoId,
          idempotencyKey: `abono:create:${abonoId}`,
          correlationId,
        });
      }
    });

    const createdSale = await this.findById(saleId);
    if (!createdSale) {
      throw new Error("Failed to retrieve created sale");
    }

    return createdSale;
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

    if (sale.items.length === 0) {
      throw new Error("No puedes confirmar una venta sin productos");
    }

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

    await this.generatedSalesService.update(id, {
      status: "active",
      saleType: paymentMode === "pago_total" ? "contado" : "credito",
      totalAmount,
      amountPaid,
      balanceDue,
      paymentMode,
    });
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

    if (sale.items.length === 0) {
      throw new Error("No puedes confirmar un pedido sin productos");
    }

    if (sale.version !== baseVersion) {
      throw new Error("La venta fue modificada por otro usuario. Por favor, intenta de nuevo.");
    }

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

    await this.generatedSalesService.update(id, {
      status: "confirmed",
      saleType: paymentMode === "pago_total" ? "contado" : "credito",
      totalAmount,
      amountPaid,
      balanceDue,
      paymentMode,
    });
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

    await this.generatedSalesService.update(id, {
      status: "delivered" as const,
      saleType: sale.saleType,
    });
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

    const adjustments: Array<{
      itemId: string;
      deliveredQuantity: number;
      unitPriceFinal: number | null;
      newSubtotal: number;
    }> = [];
    let totalAmount = 0;

    for (const itemUpdate of options.items) {
      const item = sale.items.find((i) => i.id === itemUpdate.itemId);
      if (!item) continue;

      const deliveredQty = itemUpdate.deliveredQuantity ?? parseFloat(item.orderedQuantity || "0");
      const finalPrice = itemUpdate.unitPriceFinal ?? parseFloat(item.unitPriceQuoted || "0");
      const subtotal = itemUpdate.subtotal ?? deliveredQty * finalPrice;

      totalAmount += subtotal;

      adjustments.push({
        itemId: itemUpdate.itemId,
        deliveredQuantity: deliveredQty,
        unitPriceFinal: finalPrice,
        newSubtotal: subtotal,
      });
    }

    const amountPaid = options.amountPaid ?? parseFloat(sale.amountPaid);
    const newBalance = totalAmount - amountPaid;

    const saleUpdate = {
      status: "delivered",
      totalAmount,
      balanceDue: newBalance,
      paymentMode: (options.paymentMode ?? sale.paymentMode ?? undefined) as "pago_total" | "a_cuenta" | "debe_todo" | undefined,
    } as const;
    const correlationId = `sale:finalize:${id}:${Date.now()}`;

    await this.engine.batch(async (ctx) => {
      for (const adjustment of adjustments) {
        await this.generatedItemsService.updateInBatch(
          ctx,
          adjustment.itemId,
          {
            saleId: id,
            deliveredQuantity: adjustment.deliveredQuantity,
            unitPriceFinal: adjustment.unitPriceFinal ?? undefined,
            subtotal: adjustment.newSubtotal,
            isModified: true,
          },
          {
            idempotencyKey: `sale_item:update:${adjustment.itemId}:${correlationId}`,
            correlationId,
          }
        );
      }

      await this.generatedSalesService.updateInBatch(ctx, id, saleUpdate, {
        idempotencyKey: `sale:update:${id}:${correlationId}`,
        correlationId,
      });
    });
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

    await this.generatedSalesService.update(id, {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      cancelledBy: this.engine.getConfig().userId,
      cancelReason: reason ?? undefined,
    });
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

    await this.generatedSalesService.update(id, input);
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

    const items = await this.db
      .select({ id: this.tables.saleItems.id })
      .from(this.tables.saleItems)
      .where(
        and(
          eq(this.tables.saleItems.saleId, id),
          eq(this.tables.saleItems.businessId, this.businessId)
        )
      );
    const correlationId = `sale:delete:${id}:${Date.now()}`;
    await this.engine.batch(async (ctx) => {
      for (const item of items) {
        await this.generatedItemsService.deleteInBatch(ctx, item.id, { correlationId });
      }
      await this.generatedSalesService.deleteInBatch(ctx, id, { correlationId });
    });
  }

  /**
   * Add an item to an existing sale
   */
  async addItem(saleId: string, item: CreateSaleItemInput): Promise<SaleItem> {
    const perfStart = performance.now();
    const saleResult = await this.db
      .select({
        id: this.tables.sales.id,
        type: this.tables.sales.type,
        status: this.tables.sales.status,
      })
      .from(this.tables.sales)
      .where(
        and(
          eq(this.tables.sales.id, saleId),
          eq(this.tables.sales.businessId, this.businessId)
        )
      )
      .limit(1);

    if (saleResult.length === 0) {
      throw new Error("Sale not found");
    }

    const saleMeta = saleResult[0] as { id: string; type: SaleType; status: SaleStatus };

    const isConfirmedPreOrder = saleMeta.type === "pre_order" && saleMeta.status === "confirmed";
    if (saleMeta.status !== "draft" && !isConfirmedPreOrder) {
      throw new Error("Only draft or confirmed pre_order sales can have items added");
    }

    const existingItemResult = await this.db
      .select({ id: this.tables.saleItems.id })
      .from(this.tables.saleItems)
      .where(
        and(
          eq(this.tables.saleItems.saleId, saleId),
          eq(this.tables.saleItems.businessId, this.businessId),
          eq(this.tables.saleItems.productId, item.productId),
          eq(this.tables.saleItems.variantId, item.variantId)
        )
      )
      .limit(1);

    if (existingItemResult.length > 0) {
      throw new Error("El producto ya está en la venta. Edita la cantidad desde el carrito.");
    }

    const sale = await this.findById(saleId);
    if (!sale) {
      throw new Error("Sale not found");
    }

    const itemId = this.generateId();
    const itemPayload = {
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
    };

    const currentTotal = parseFloat(sale.totalAmount || "0");
    const currentBalance = parseFloat(sale.balanceDue || "0");
    const newTotal = currentTotal + Number(item.subtotal);
    const newBalance = currentBalance + Number(item.subtotal);
    const saleUpdate = {
      totalAmount: newTotal,
      balanceDue: newBalance,
    };
    const correlationId = `sale:item:add:${saleId}:${itemId}`;

    await this.engine.batch(async (ctx) => {
      await this.generatedItemsService.createInBatch(ctx, itemPayload, {
        id: itemId,
        idempotencyKey: `sale_item:create:${itemId}`,
        correlationId,
      });

      await this.generatedSalesService.updateInBatch(ctx, saleId, saleUpdate, {
        idempotencyKey: `sale:update:${saleId}:${correlationId}`,
        correlationId,
      });
    });

    console.log("[Perf][SaleService] addItem", {
      saleId,
      itemId,
      totalMs: Number((performance.now() - perfStart).toFixed(2)),
    });

    const created = await this.db
      .select()
      .from(this.tables.saleItems)
      .where(and(
        eq(this.tables.saleItems.id, itemId),
        eq(this.tables.saleItems.businessId, this.businessId)
      ))
      .limit(1);

    return mapToCamelCase(created[0]) as unknown as SaleItem;
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
    const saleResult = await this.db
      .select({
        id: this.tables.sales.id,
        type: this.tables.sales.type,
        status: this.tables.sales.status,
      })
      .from(this.tables.sales)
      .where(
        and(
          eq(this.tables.sales.id, saleId),
          eq(this.tables.sales.businessId, this.businessId)
        )
      )
      .limit(1);

    if (saleResult.length === 0) {
      throw new Error("Sale not found");
    }

    const saleMeta = saleResult[0] as { id: string; type: SaleType; status: SaleStatus };

    const isConfirmedPreOrder = saleMeta.type === "pre_order" && saleMeta.status === "confirmed";
    if (saleMeta.status !== "draft" && !isConfirmedPreOrder) {
      throw new Error("Only draft or confirmed pre_order sales can have items updated");
    }

    const itemResult = await this.db
      .select()
      .from(this.tables.saleItems)
      .where(
        and(
          eq(this.tables.saleItems.id, itemId),
          eq(this.tables.saleItems.saleId, saleId),
          eq(this.tables.saleItems.businessId, this.businessId)
        )
      )
      .limit(1);

    if (itemResult.length === 0) {
      throw new Error("Item not found in sale");
    }

    const existingItem = mapToCamelCase(itemResult[0]) as unknown as SaleItem;
    const oldSubtotal = parseFloat(existingItem.subtotal || "0");
    const newSubtotal = data.subtotal ?? oldSubtotal;
    const subtotalDiff = newSubtotal - oldSubtotal;

    const updateData: Record<string, unknown> = {};
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.unitPrice !== undefined) updateData.unitPrice = data.unitPrice;
    if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
    updateData.isModified = true;

    const correlationId = `sale:item:update:${saleId}:${itemId}:${Date.now()}`;
    const sale = await this.findById(saleId);
    const saleUpdate: Record<string, unknown> = {};
    if (Math.abs(subtotalDiff) > 0.01) {
      if (sale) {
        const currentTotal = parseFloat(sale.totalAmount || "0");
        const currentBalance = parseFloat(sale.balanceDue || "0");
        const newTotal = currentTotal + subtotalDiff;
        const newBalance = currentBalance + subtotalDiff;

        saleUpdate.totalAmount = newTotal;
        saleUpdate.balanceDue = newBalance;
      }
    }

    await this.engine.batch(async (ctx) => {
      await this.generatedItemsService.updateInBatch(
        ctx,
        itemId,
        { saleId, ...updateData },
        {
          idempotencyKey: `sale_item:update:${itemId}:${correlationId}`,
          correlationId,
        }
      );

      if (Object.keys(saleUpdate).length > 0 && sale) {
        await this.generatedSalesService.updateInBatch(ctx, saleId, saleUpdate, {
          idempotencyKey: `sale:update:${saleId}:${correlationId}`,
          correlationId,
        });
      }
    });

    console.log("[Perf][SaleService] updateItem", {
      saleId,
      itemId,
      totalMs: Number((performance.now() - perfStart).toFixed(2)),
    });

    return existingItem;
  }

  /**
   * Remove an item from a sale
   */
  async removeItem(saleId: string, itemId: string): Promise<void> {
    const perfStart = performance.now();
    const saleResult = await this.db
      .select({
        id: this.tables.sales.id,
        type: this.tables.sales.type,
        status: this.tables.sales.status,
      })
      .from(this.tables.sales)
      .where(
        and(
          eq(this.tables.sales.id, saleId),
          eq(this.tables.sales.businessId, this.businessId)
        )
      )
      .limit(1);

    if (saleResult.length === 0) {
      throw new Error("Sale not found");
    }

    const saleMeta = saleResult[0] as { id: string; type: SaleType; status: SaleStatus };

    const isConfirmedPreOrder = saleMeta.type === "pre_order" && saleMeta.status === "confirmed";
    if (saleMeta.status !== "draft" && !isConfirmedPreOrder) {
      throw new Error("Only draft or confirmed pre_order sales can have items removed");
    }

    const itemResult = await this.db
      .select({ subtotal: this.tables.saleItems.subtotal })
      .from(this.tables.saleItems)
      .where(
        and(
          eq(this.tables.saleItems.id, itemId),
          eq(this.tables.saleItems.saleId, saleId),
          eq(this.tables.saleItems.businessId, this.businessId)
        )
      )
      .limit(1);

    if (itemResult.length === 0) {
      throw new Error("Item not found in sale");
    }

    const subtotal = parseFloat(itemResult[0].subtotal);

    const sale = await this.findById(saleId);
    const currentTotal = parseFloat(sale?.totalAmount || "0");
    const currentBalance = parseFloat(sale?.balanceDue || "0");
    const saleUpdate = {
      totalAmount: currentTotal - subtotal,
      balanceDue: currentBalance - subtotal,
    };
    const correlationId = `sale:item:remove:${saleId}:${itemId}:${Date.now()}`;

    await this.engine.batch(async (ctx) => {
      await this.generatedItemsService.deleteInBatch(ctx, itemId, {
        payload: { saleId, productId: "deleted", variantId: "deleted", productName: "deleted", variantName: "deleted", subtotal: "0" },
        idempotencyKey: `sale_item:delete:${itemId}:${correlationId}`,
        correlationId,
      });

      if (sale) {
        await this.generatedSalesService.updateInBatch(ctx, saleId, saleUpdate, {
          idempotencyKey: `sale:update:${saleId}:${correlationId}`,
          correlationId,
        });
      }
    });

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

    const currentAmountPaid = parseFloat(sale.amountPaid || "0");
    const currentBalanceDue = parseFloat(sale.balanceDue || "0");
    const newAmountPaid = currentAmountPaid + amount;
    const newBalanceDue = Math.max(currentBalanceDue - amount, 0);

    await this.generatedSalesService.update(saleId, {
      amountPaid: newAmountPaid,
      balanceDue: newBalanceDue,
    });
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
      eq(this.tables.sales.businessId, this.businessId),
      inArray(this.tables.sales.status, ["active", "delivered"]),
      gte(this.tables.sales.saleDate, startDate),
    ];

    if (period.endDate) {
      conditions.push(lte(this.tables.sales.saleDate, new Date(period.endDate)));
    }

    const result = await this.db
      .select({
        amount: sql<string>`COALESCE(SUM(${this.tables.sales.totalAmount}), 0)`,
        kilos: sql<string>`COALESCE(SUM(${this.tables.sales.netWeight}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(this.tables.sales)
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
        totalDebt: sql<string>`COALESCE(SUM(${this.tables.sales.balanceDue}), 0)`,
        debtorsCount: sql<number>`COUNT(DISTINCT ${this.tables.sales.customerId})`,
      })
      .from(this.tables.sales)
      .where(
        and(
          eq(this.tables.sales.businessId, this.businessId),
          sql`${this.tables.sales.balanceDue} > 0`,
          sql`${this.tables.sales.status} NOT IN ('cancelled', 'draft')`,
          sql`${this.tables.sales.customerId} IS NOT NULL`
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
      eq(this.tables.sales.businessId, this.businessId),
      inArray(this.tables.sales.status, ["active", "delivered"]),
      gte(this.tables.sales.saleDate, startDate),
    ];

    if (period.endDate) {
      conditions.push(lte(this.tables.sales.saleDate, new Date(period.endDate)));
    }

    // Get daily sales totals using Drizzle
    const result = await this.db
      .select({
        date: sql<string>`DATE(${this.tables.sales.saleDate})`,
        total: sql<string>`COALESCE(SUM(${this.tables.sales.totalAmount}), 0)`,
      })
      .from(this.tables.sales)
      .where(and(...conditions))
      .groupBy(sql`DATE(${this.tables.sales.saleDate})`)
      .orderBy(sql`DATE(${this.tables.sales.saleDate})`);

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
