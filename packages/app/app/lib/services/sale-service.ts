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
import { SyncStatus, sales as salesTable, saleItems as saleItemsTable } from "@avileo/shared";
import { generateId } from "~/lib/utils";
import { mapToCamelCase, mapToCamelCaseWithDates } from "../mappers/entity-mapper";
import { eq, sql, and, gte, lte, inArray, isNull } from "drizzle-orm";
import { SalesService as GeneratedSalesService, SaleItemsService as GeneratedItemsService } from "~/lib/sync/generated/services";

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
 * Extends BaseService for common sync and ID generation functionality
 */
export class SaleService extends BaseService {
  private generatedSalesService: GeneratedSalesService;
  private generatedItemsService: GeneratedItemsService;

  constructor(engine: SyncClientEngineLike) {
    super(engine);
    this.generatedSalesService = new GeneratedSalesService(engine);
    this.generatedItemsService = new GeneratedItemsService(engine);
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
    return {
      ...sale,
      totalAmount: this.normalizeCurrency(sale.totalAmount),
      amountPaid: this.normalizeCurrency(sale.amountPaid),
      balanceDue: this.normalizeCurrency(sale.balanceDue),
      tara: this.normalizeWeight(sale.tara),
      netWeight: this.normalizeWeight(sale.netWeight),
    };
  }

  /**
   * Normalizes sale item monetary and weight fields after reading from DB
   */
  private normalizeSaleItem<T extends { subtotal: string | number; quantity: string | number | null; orderedQuantity: string | number | null; deliveredQuantity: string | number | null; unitPrice: string | number | null; unitPriceQuoted: string | number | null; unitPriceFinal: string | number | null }>(item: T): T {
    return {
      ...item,
      subtotal: this.normalizeCurrency(item.subtotal),
      quantity: this.normalizeWeight(item.quantity),
      orderedQuantity: this.normalizeWeight(item.orderedQuantity),
      deliveredQuantity: this.normalizeWeight(item.deliveredQuantity),
      unitPrice: this.normalizeNullableCurrency(item.unitPrice),
      unitPriceQuoted: this.normalizeNullableCurrency(item.unitPriceQuoted),
      unitPriceFinal: this.normalizeNullableCurrency(item.unitPriceFinal),
    };
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
   * Find a sale by ID with its items (enriched with customer and items)
   * Overrides the generated SalesService.findById to include related data
   */
  async findById(id: string): Promise<SaleWithItems | null> {
    const saleResult = await this.pg.query<Record<string, unknown>>(
      `SELECT * FROM sales WHERE id = $1`,
      [id]
    );

    if (saleResult.rows.length === 0) {
      return null;
    }

    const sale = this.normalizeSale(mapToCamelCaseWithDates(saleResult.rows[0]) as unknown as Sale);

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

    const items = itemsResult.rows.map((row) => this.normalizeSaleItem(mapToCamelCase(row) as unknown as SaleItem));

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
        const item = this.normalizeSaleItem(mapToCamelCase(row) as unknown as SaleItem);
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
   * Find all sales for the business (enriched with items and customer)
   * Overrides the generated SalesService.findByBusiness to include related data
   */
  async findByBusiness(): Promise<SaleWithItems[]> {
    const salesResult = await this.db
      .select()
      .from(salesTable)
      .where(eq(salesTable.businessId, this.businessId))
      .orderBy(sql`${salesTable.saleDate} DESC`, sql`${salesTable.createdAt} DESC`);

    const sales = salesResult.map(row => this.normalizeSale(mapToCamelCaseWithDates(row) as unknown as Sale));

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
        .orderBy(sql`${salesTable.saleDate} DESC`, sql`${salesTable.createdAt} DESC`)
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(salesTable)
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
      .orderBy(sql`${salesTable.saleDate} DESC`, sql`${salesTable.createdAt} DESC`);

    const sales = salesResult.map(row => this.normalizeSale(mapToCamelCaseWithDates(row) as unknown as Sale));

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
      .orderBy(sql`${salesTable.saleDate} DESC`, sql`${salesTable.createdAt} DESC`);

    const sales = salesResult.map(row => this.normalizeSale(mapToCamelCaseWithDates(row) as unknown as Sale));

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
      .orderBy(sql`${salesTable.saleDate} DESC`, sql`${salesTable.createdAt} DESC`);

    const sales = salesResult.map(row => this.normalizeSale(mapToCamelCaseWithDates(row) as unknown as Sale));

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
      .orderBy(sql`${salesTable.saleDate} DESC`, sql`${salesTable.createdAt} DESC`);

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
      customerId: saleInput.customerId ?? null,
      sellerId,
      distribucionId: saleInput.distribucionId ?? null,
      visitaId: saleInput.visitaId ?? null,
      type: type as string,
      saleType: saleType as string,
      paymentMode: saleInput.paymentMode ?? null,
      totalAmount: this.normalizeCurrency(totalAmount),
      amountPaid: this.normalizeCurrency(0),
      balanceDue: this.normalizeCurrency(totalAmount),
      tara: this.normalizeWeight(saleInput.tara),
      netWeight: this.normalizeWeight(saleInput.netWeight),
      saleDate,
      deliveryDate: saleInput.deliveryDate ?? null,
      orderDate: saleInput.orderDate ?? null,
      status: "draft",
      allowCustomerEdit: true,
      advancePaymentMethod: null,
      advanceReferenceNumber: null,
      advanceProofImageId: null,
      cancelledAt: null,
      cancelledBy: null,
      cancelReason: null,
      refundAmount: null,
      refundDate: null,
      refundMethod: null,
      refundReference: null,
      refundNotes: null,
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

    const sale = await this.generatedSalesService.create({
      customerId: saleInput.customerId ?? null,
      sellerId,
      distribucionId: saleInput.distribucionId ?? null,
      visitaId: saleInput.visitaId ?? null,
      type: saleInput.type || "instant_sale",
      saleType: saleInput.saleType || "contado",
      paymentMode: saleInput.paymentMode ?? null,
      totalAmount: this.normalizeCurrency(totalAmount),
      amountPaid: this.normalizeCurrency(amountPaid),
      balanceDue: this.normalizeCurrency(balanceDue),
      tara: this.normalizeWeight(saleInput.tara),
      netWeight: this.normalizeWeight(saleInput.netWeight),
      saleDate,
      deliveryDate: saleInput.deliveryDate ?? null,
      orderDate: saleInput.orderDate ?? null,
      status: "draft",
      allowCustomerEdit: true,
      advancePaymentMethod: null,
      advanceReferenceNumber: null,
      advanceProofImageId: null,
      cancelledAt: null,
      cancelledBy: null,
      cancelReason: null,
      refundAmount: null,
      refundDate: null,
      refundMethod: null,
      refundReference: null,
      refundNotes: null,
    });

    for (const item of items) {
      await this.generatedItemsService.create({
        saleId: sale.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        quantity: this.normalizeWeight(item.quantity),
        orderedQuantity: this.normalizeWeight(item.orderedQuantity),
        unitPrice: this.normalizeNullableCurrency(item.unitPrice),
        unitPriceQuoted: this.normalizeNullableCurrency(item.unitPriceQuoted),
        subtotal: this.normalizeCurrency(item.subtotal),
      });
    }

    const createdSale = await this.findById(sale.id);
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
      totalAmount: this.normalizeCurrency(totalAmount),
      amountPaid: this.normalizeCurrency(amountPaid),
      balanceDue: this.normalizeCurrency(balanceDue),
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
      totalAmount: this.normalizeCurrency(totalAmount),
      amountPaid: this.normalizeCurrency(amountPaid),
      balanceDue: this.normalizeCurrency(balanceDue),
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
      status: "delivered",
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
      deliveredQuantity: string;
      unitPriceFinal: string | null;
      newSubtotal: string;
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
        deliveredQuantity: this.normalizeWeight(deliveredQty),
        unitPriceFinal: this.normalizeNullableCurrency(finalPrice),
        newSubtotal: this.normalizeCurrency(subtotal),
      });
    }

    const amountPaid = options.amountPaid ?? parseFloat(sale.amountPaid);
    const newBalance = totalAmount - amountPaid;

    for (const adjustment of adjustments) {
      await this.generatedItemsService.update(adjustment.itemId, {
        deliveredQuantity: adjustment.deliveredQuantity,
        unitPriceFinal: adjustment.unitPriceFinal,
        subtotal: adjustment.newSubtotal,
        isModified: true,
      });
    }

    await this.generatedSalesService.update(id, {
      status: "delivered",
      totalAmount: this.normalizeCurrency(totalAmount),
      balanceDue: this.normalizeCurrency(newBalance),
      paymentMode: options.paymentMode ?? sale.paymentMode ?? null,
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
      cancelReason: reason ?? null,
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

    const syncPayload: Record<string, unknown> = {};

    if (input.customerId !== undefined) {
      syncPayload.customerId = input.customerId || null;
    }

    if (input.saleType !== undefined) {
      syncPayload.saleType = input.saleType;
    }

    if (input.type !== undefined) {
      syncPayload.type = input.type;
    }

    if (input.totalAmount !== undefined) {
      syncPayload.totalAmount = this.normalizeCurrency(input.totalAmount);
    }

    if (input.amountPaid !== undefined) {
      syncPayload.amountPaid = this.normalizeCurrency(input.amountPaid);
    }

    if (input.balanceDue !== undefined) {
      syncPayload.balanceDue = this.normalizeCurrency(input.balanceDue);
    }

    if (input.tara !== undefined) {
      syncPayload.tara = this.normalizeWeight(input.tara);
    }

    if (input.netWeight !== undefined) {
      syncPayload.netWeight = this.normalizeWeight(input.netWeight);
    }

    if (input.deliveryDate !== undefined) {
      syncPayload.deliveryDate = input.deliveryDate || null;
    }

    if (input.orderDate !== undefined) {
      syncPayload.orderDate = input.orderDate || null;
    }

    if (input.paymentMode !== undefined) {
      syncPayload.paymentMode = input.paymentMode || null;
    }

    if (Object.keys(syncPayload).length === 0) {
      return;
    }

    await this.generatedSalesService.update(id, syncPayload);
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

    const items = await this.pg.query(`SELECT id FROM sale_items WHERE sale_id = $1 AND business_id = $2`, [id, this.businessId]);
    for (const item of items.rows) {
      await this.generatedItemsService.delete(item.id);
    }
    await this.generatedSalesService.delete(id);
  }

  /**
   * Add an item to an existing sale
   */
  async addItem(saleId: string, item: CreateSaleItemInput): Promise<SaleItem> {
    const perfStart = performance.now();
    const saleResult = await this.pg.query<Record<string, unknown>>(
      `SELECT id, type, status FROM sales WHERE id = $1 AND business_id = $2 LIMIT 1`,
      [saleId, this.businessId]
    );

    if (saleResult.rows.length === 0) {
      throw new Error("Sale not found");
    }

    const saleMeta = mapToCamelCase(saleResult.rows[0]) as {
      id: string;
      type: SaleType;
      status: SaleStatus;
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

    const sale = await this.findById(saleId);
    if (!sale) {
      throw new Error("Sale not found");
    }

    const result = await this.generatedItemsService.create({
      saleId,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName,
      quantity: this.normalizeWeight(item.quantity),
      orderedQuantity: this.normalizeWeight(item.orderedQuantity),
      unitPrice: this.normalizeNullableCurrency(item.unitPrice),
      unitPriceQuoted: this.normalizeNullableCurrency(item.unitPriceQuoted),
      subtotal: this.normalizeCurrency(item.subtotal),
    });

    const currentTotal = parseFloat(sale.totalAmount || "0");
    const currentBalance = parseFloat(sale.balanceDue || "0");
    const newTotal = currentTotal + parseFloat(item.subtotal);
    const newBalance = currentBalance + parseFloat(item.subtotal);

    await this.generatedSalesService.update(saleId, {
      totalAmount: this.normalizeCurrency(newTotal),
      balanceDue: this.normalizeCurrency(newBalance),
    });

    console.log("[Perf][SaleService] addItem", {
      saleId,
      itemId: result.id,
      totalMs: Number((performance.now() - perfStart).toFixed(2)),
    });

    return result as unknown as SaleItem;
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
      `SELECT id, type, status FROM sales WHERE id = $1 AND business_id = $2 LIMIT 1`,
      [saleId, this.businessId]
    );

    if (saleResult.rows.length === 0) {
      throw new Error("Sale not found");
    }

    const saleMeta = mapToCamelCase(saleResult.rows[0]) as {
      id: string;
      type: SaleType;
      status: SaleStatus;
    };

    const isConfirmedPreOrder = saleMeta.type === "pre_order" && saleMeta.status === "confirmed";
    if (saleMeta.status !== "draft" && !isConfirmedPreOrder) {
      throw new Error("Only draft or confirmed pre_order sales can have items updated");
    }

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

    const updateData: Record<string, unknown> = {};
    if (data.quantity !== undefined) updateData.quantity = this.normalizeWeight(data.quantity);
    if (data.unitPrice !== undefined) updateData.unitPrice = this.normalizeNullableCurrency(data.unitPrice);
    if (data.subtotal !== undefined) updateData.subtotal = this.normalizeCurrency(data.subtotal);
    updateData.isModified = true;

    await this.generatedItemsService.update(itemId, updateData);

    if (Math.abs(subtotalDiff) > 0.01) {
      const sale = await this.findById(saleId);
      if (sale) {
        const currentTotal = parseFloat(sale.totalAmount || "0");
        const currentBalance = parseFloat(sale.balanceDue || "0");
        const newTotal = currentTotal + subtotalDiff;
        const newBalance = currentBalance + subtotalDiff;

        await this.generatedSalesService.update(saleId, {
          totalAmount: this.normalizeCurrency(newTotal),
          balanceDue: this.normalizeCurrency(newBalance),
        });
      }
    }

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
    const saleResult = await this.pg.query<Record<string, unknown>>(
      `SELECT id, type, status FROM sales WHERE id = $1 AND business_id = $2 LIMIT 1`,
      [saleId, this.businessId]
    );

    if (saleResult.rows.length === 0) {
      throw new Error("Sale not found");
    }

    const saleMeta = mapToCamelCase(saleResult.rows[0]) as {
      id: string;
      type: SaleType;
      status: SaleStatus;
    };

    const isConfirmedPreOrder = saleMeta.type === "pre_order" && saleMeta.status === "confirmed";
    if (saleMeta.status !== "draft" && !isConfirmedPreOrder) {
      throw new Error("Only draft or confirmed pre_order sales can have items removed");
    }

    const itemResult = await this.pg.query<{ subtotal: string }>(
      `SELECT subtotal FROM sale_items WHERE id = $1 AND sale_id = $2`,
      [itemId, saleId]
    );

    if (itemResult.rows.length === 0) {
      throw new Error("Item not found in sale");
    }

    const subtotal = parseFloat(itemResult.rows[0].subtotal);

    await this.generatedItemsService.delete(itemId);

    const sale = await this.findById(saleId);
    if (sale) {
      const currentTotal = parseFloat(sale.totalAmount || "0");
      const currentBalance = parseFloat(sale.balanceDue || "0");
      const newTotal = currentTotal - subtotal;
      const newBalance = currentBalance - subtotal;

      await this.generatedSalesService.update(saleId, {
        totalAmount: this.normalizeCurrency(newTotal),
        balanceDue: this.normalizeCurrency(newBalance),
      });
    }

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
      amountPaid: this.normalizeCurrency(newAmountPaid),
      balanceDue: this.normalizeCurrency(newBalanceDue),
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
