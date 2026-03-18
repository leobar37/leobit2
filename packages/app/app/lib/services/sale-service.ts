/**
 * SaleService
 * Provides atomic operations for sales with their items
 * Extends BaseService for common sync and ID generation functionality
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { BaseService, type EntityType } from "./base-service";
import { SyncService } from "../sync/sync-service";
import { SyncStatus, sales, saleItems } from "@avileo/shared";
import { generateId } from "~/lib/utils";
import { mapToCamelCase, mapToCamelCaseWithDates, normalizeRow } from "../mappers/entity-mapper";
import { eq, sql, and, gte, lte, inArray } from "drizzle-orm";

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
  paymentMode: string | null;
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  tara: string | null;
  netWeight: string | null;
  saleDate: Date;
  deliveryDate: Date | null;
  orderDate: Date | null;
  status: SaleStatus;
  version: number;
  confirmedSnapshot: Record<string, unknown> | null;
  deliveredSnapshot: Record<string, unknown> | null;
  allowCustomerEdit: boolean;
  syncStatus: "pending" | "synced" | "error";
  syncAttempts: number;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  refundAmount: string | null;
  refundDate: Date | null;
  refundMethod: string | null;
  refundReference: string | null;
  refundNotes: string | null;
  advancePaymentMethod: string | null;
  advanceReferenceNumber: string | null;
  advanceProofImageId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sale with its items (for queries that include items)
 */
export type SaleWithItems = Sale & { items: SaleItem[] };

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
  paymentMode?: string;
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
  totalAmount?: number;
  amountPaid?: number;
  balanceDue?: number;
  tara?: number;
  netWeight?: number;
  deliveryDate?: string;
  orderDate?: string;
  paymentMode?: string;
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
   * Find all sales for the business
   */
  async findByBusiness(): Promise<SaleWithItems[]> {
    const salesResult = await this.db
      .select()
      .from(sales)
      .where(eq(sales.businessId, this.businessId))
      .orderBy(sql`${sales.saleDate} DESC`);

    const sales: SaleWithItems[] = [];

    for (const row of salesResult) {
      const sale = mapToCamelCaseWithDates(row) as unknown as Sale;

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
        [sale.id, this.businessId]
      );

      sales.push({
        ...sale,
        customer,
        items: itemsResult.rows.map((itemRow) => mapToCamelCase(itemRow) as unknown as SaleItem),
      });
    }

    return sales;
  }

  /**
   * Find sales by customer ID
   */
  async findByCustomerId(customerId: string): Promise<SaleWithItems[]> {
    const salesResult = await this.db
      .select()
      .from(sales)
      .where(and(eq(sales.customerId, customerId), eq(sales.businessId, this.businessId)))
      .orderBy(sql`${sales.saleDate} DESC`);

    const sales: SaleWithItems[] = [];

    for (const row of salesResult) {
      const sale = mapToCamelCaseWithDates(row) as unknown as Sale;

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
        [sale.id, this.businessId]
      );

      sales.push({
        ...sale,
        customer,
        items: itemsResult.rows.map((itemRow) => mapToCamelCase(itemRow) as unknown as SaleItem),
      });
    }

    return sales;
  }

  /**
   * Find sales by status
   */
  async findByStatus(status: SaleStatus): Promise<SaleWithItems[]> {
    const salesResult = await this.db
      .select()
      .from(sales)
      .where(and(eq(sales.status, status), eq(sales.businessId, this.businessId)))
      .orderBy(sql`${sales.saleDate} DESC`);

    const sales: SaleWithItems[] = [];

    for (const row of salesResult) {
      const sale = mapToCamelCaseWithDates(row) as unknown as Sale;

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
        [sale.id, this.businessId]
      );

      sales.push({
        ...sale,
        customer,
        items: itemsResult.rows.map((itemRow) => mapToCamelCase(itemRow) as unknown as SaleItem),
      });
    }

    return sales;
  }

  /**
   * Create a draft sale without items
   * Used for creating a new sale that will be edited later
   */
  async createDraft(saleInput: Omit<CreateSaleInput, "totalAmount"> & { totalAmount?: number }): Promise<Sale> {
    console.log("[SaleService] createDraft called with saleInput:", saleInput);
    console.log("[SaleService] this.businessId:", this.businessId);
    console.log("[SaleService] sellerId:", saleInput.sellerId);

    const syncGroupId = this.generateSyncGroup();
    const now = this.now();
    const saleId = generateId();
    const sellerId = saleInput.sellerId;

    console.log("[SaleService] Starting transaction for saleId:", saleId);
    await this.pg.exec("BEGIN");

    try {
      await this.pg.query(
        `INSERT INTO sales (
          id, business_id, customer_id, seller_id, distribucion_id, visita_id,
          type, sale_type, payment_mode, total_amount, amount_paid, balance_due,
          tara, net_weight, sale_date, delivery_date, order_date,
          status, version, allow_customer_edit,
          sync_status, sync_attempts, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $23)`,
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
          saleInput.totalAmount || 0,
          0,
          saleInput.totalAmount || 0,
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
          now,
        ]
      );

      await this.pg.exec("COMMIT");

      await this.queueSync(
        "insert",
        saleId,
        {
          customerId: saleInput.customerId,
          sellerId,
          distribucionId: saleInput.distribucionId,
          visitaId: saleInput.visitaId,
          type: saleInput.type || "instant_sale",
          saleType: saleInput.saleType || "contado",
          paymentMode: saleInput.paymentMode,
          totalAmount: saleInput.totalAmount || 0,
          amountPaid: 0,
          balanceDue: saleInput.totalAmount || 0,
          tara: saleInput.tara,
          netWeight: saleInput.netWeight,
          deliveryDate: saleInput.deliveryDate,
          orderDate: saleInput.orderDate,
          items: [],
        },
        syncGroupId
      );

      const createdSale = await this.findById(saleId);
      if (!createdSale) {
        throw new Error("Failed to retrieve created sale");
      }

      return createdSale;
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
          sync_status, sync_attempts, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $23)`,
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
          now,
        ]
      );

      // Insert all sale items with Drizzle
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemId = itemIds[i];

        await this.db.insert(saleItems).values({
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
        "insert",
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
   * Get the syncGroupId from an insert operation for this sale
   * This ensures confirm/update/item operations are in the same sync group
   */
  private async getInsertSyncGroupId(saleId: string): Promise<string | undefined> {
    const result = await this.pg.query<{ sync_group_id: string }>(
      `SELECT sync_group_id FROM sync_operations 
       WHERE entity_id = $1 AND operation = 'insert' 
       ORDER BY created_at DESC LIMIT 1`,
      [saleId]
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

    const now = this.now();

    await this.pg.query(
      `UPDATE sales SET status = 'active', updated_at = $1, sync_status = $2 WHERE id = $3`,
      [now, SyncStatus.PENDING, id]
    );

    const syncGroupId = await this.getInsertSyncGroupId(id);

    await this.queueSync(
      "update",
      id,
      {
        status: "active",
        saleType: sale.saleType,
      },
      syncGroupId
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

    if (sale.version !== baseVersion) {
      throw new Error("La venta fue modificada por otro usuario. Por favor, intenta de nuevo.");
    }

    const now = this.now();

    await this.pg.query(
      `UPDATE sales SET status = 'confirmed', version = version + 1, updated_at = $1, sync_status = $2 WHERE id = $3 AND version = $4`,
      [now, SyncStatus.PENDING, id, baseVersion]
    );

    const syncGroupId = await this.getInsertSyncGroupId(id);

    await this.queueSync(
      "update",
      id,
      {
        status: "confirmed",
        saleType: sale.saleType,
      },
      syncGroupId
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

    const syncGroupId = await this.getInsertSyncGroupId(id);

    await this.queueSync(
      "update",
      id,
      {
        status: "delivered",
        saleType: sale.saleType,
      },
      syncGroupId
    );
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

    const syncGroupId = await this.getInsertSyncGroupId(id);

    await this.queueSync(
      "update",
      id,
      {
        status: "cancelled",
        cancelReason: reason,
        cancelledAt: now,
        cancelledBy: this.businessUserId,
      },
      syncGroupId
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

    const syncGroupId = await this.getInsertSyncGroupId(id);

    await this.queueSync(
      "update",
      id,
      input as Record<string, unknown>,
      syncGroupId
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

    // Delete sale items first using Drizzle (cascade on server will handle the sync)
    await this.db.delete(saleItems).where(eq(saleItems.saleId, id));

    // Delete the sale
    await this.pg.query(`DELETE FROM sales WHERE id = $1`, [id]);

    // Queue deletion sync for the sale only (items are handled by cascade)
    await this.queueSync(
      "delete",
      id,
      {}
    );
  }

  /**
   * Add an item to an existing sale
   */
  async addItem(saleId: string, item: CreateSaleItemInput): Promise<SaleItem> {
    const sale = await this.findById(saleId);

    if (!sale) {
      throw new Error("Sale not found");
    }

    if (sale.status !== "draft") {
      throw new Error("Only draft sales can have items added");
    }

    // Check for existing item with same product + variant
    const existingItemsResult = await this.pg.query<Record<string, unknown>>(
      `SELECT * FROM sale_items WHERE sale_id = $1 AND business_id = $2`,
      [saleId, this.businessId]
    );
    const existingItems = existingItemsResult.rows.map((row) => mapToCamelCase(row) as unknown as SaleItem);
    const existingItem = existingItems.find(
      (i) => i.productId === item.productId && i.variantId === item.variantId
    );
    
    if (existingItem) {
      throw new Error("El producto ya está en la venta. Edita la cantidad desde el carrito.");
    }

    const itemId = this.generateId();
    const now = this.now();

    // Use Drizzle to insert the item
    await this.db.insert(saleItems).values({
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
    const saleSyncGroupId = await this.getInsertSyncGroupId(saleId);
    console.log("[SaleService] addItem - saleSyncGroupId:", saleSyncGroupId, "saleId:", saleId);
    await this.queueSync(
      "insert",
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
      "sale_items"
    );

    // Return the created item
    const itemResult = await this.pg.query<Record<string, unknown>>(
      `SELECT * FROM sale_items WHERE id = $1`,
      [itemId]
    );

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
    const sale = await this.findById(saleId);

    if (!sale) {
      throw new Error("Sale not found");
    }

    if (sale.status !== "draft") {
      throw new Error("Only draft sales can have items updated");
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
    await this.db.update(saleItems)
      .set({
        quantity: data.quantity?.toString() ?? existingItem.quantity,
        unitPrice: data.unitPrice?.toString() ?? existingItem.unitPrice,
        subtotal: data.subtotal?.toString() ?? existingItem.subtotal,
        isModified: true,
      })
      .where(eq(saleItems.id, itemId));

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
    const saleSyncGroupId = await this.getInsertSyncGroupId(saleId);
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
      "sale_items"
    );

    // Return updated item
    const updatedResult = await this.pg.query<Record<string, unknown>>(
      `SELECT * FROM sale_items WHERE id = $1`,
      [itemId]
    );

    return mapToCamelCase(updatedResult.rows[0]) as unknown as SaleItem;
  }

  /**
   * Remove an item from a sale
   */
  async removeItem(saleId: string, itemId: string): Promise<void> {
    const sale = await this.findById(saleId);

    if (!sale) {
      throw new Error("Sale not found");
    }

    if (sale.status !== "draft") {
      throw new Error("Only draft sales can have items removed");
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
    await this.db.delete(saleItems).where(eq(saleItems.id, itemId));

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
    const saleSyncGroupId = await this.getInsertSyncGroupId(saleId);
    await this.queueSync(
      "delete",
      itemId,
      {
        saleId,
      },
      saleSyncGroupId,
      "sale_items"
    );
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

    await this.queueSync(
      "update",
      saleId,
      {
        amountPaid: parseFloat(updatedSale.amountPaid),
        balanceDue: parseFloat(updatedSale.balanceDue),
      }
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
      eq(sales.businessId, this.businessId),
      inArray(sales.status, ["active", "delivered"]),
      gte(sales.saleDate, startDate),
    ];

    if (period.endDate) {
      conditions.push(lte(sales.saleDate, new Date(period.endDate)));
    }

    const result = await this.db
      .select({
        amount: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
        kilos: sql<string>`COALESCE(SUM(${sales.netWeight}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(sales)
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
        totalDebt: sql<string>`COALESCE(SUM(${sales.balanceDue}), 0)`,
        debtorsCount: sql<number>`COUNT(DISTINCT ${sales.customerId})`,
      })
      .from(sales)
      .where(
        and(
          eq(sales.businessId, this.businessId),
          sql`${sales.balanceDue} > 0`,
          sql`${sales.status} NOT IN ('cancelled', 'draft')`,
          sql`${sales.customerId} IS NOT NULL`
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
      eq(sales.businessId, this.businessId),
      inArray(sales.status, ["active", "delivered"]),
      gte(sales.saleDate, startDate),
    ];

    if (period.endDate) {
      conditions.push(lte(sales.saleDate, new Date(period.endDate)));
    }

    // Get daily sales totals using Drizzle
    const result = await this.db
      .select({
        date: sql<string>`DATE(${sales.saleDate})`,
        total: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
      })
      .from(sales)
      .where(and(...conditions))
      .groupBy(sql`DATE(${sales.saleDate})`)
      .orderBy(sql`DATE(${sales.saleDate})`);

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
