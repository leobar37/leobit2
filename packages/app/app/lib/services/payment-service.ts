/**
 * Payment Service (Abonos)
 * Local-first service for managing customer debt payments
 * Extends AbonosService for basic CRUD, adds payment-specific business logic
 */

import type { SyncClientEngineLike } from "./base-service";
// Tables accessed via this.tables from engine
// // Tables are now accessed via this.tables from the engine
import { eq, and, like, or, sql, desc, gte } from "drizzle-orm";
import { mapToCamelCase } from "~/lib/mappers/entity-mapper";

// Import generated base service
import { AbonosService } from "~/lib/sync/generated/services";
import type {
  CreateAbonosInput,
  UpdateAbonosInput,
} from "~/lib/sync/generated/services";

/** Input for creating a new payment (backward compatible with original) */
export interface CreateAbonoInput {
  customerId: string;
  sellerId: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
  relatedSaleId?: string;
  proofImageId?: string;
  referenceNumber?: string;
}

/** Input for updating a payment (backward compatible with original) */
export interface UpdateAbonoInput {
  notes?: string;
  proofImageId?: string | null;
  referenceNumber?: string | null;
}

/** Payment (Abono) entity type */
export interface Abono {
  id: string;
  business_id: string;
  customer_id: string;
  seller_id: string;
  amount: string;
  payment_method: string;
  notes: string | null;
  proof_image_id: string | null;
  reference_number: string | null;
  related_sale_id: string | null;
  sync_status: "pending" | "synced" | "error";
  sync_attempts: number;
  created_at: string;
}

export interface AccountsReceivableQuery {
  search?: string;
  minBalance?: number;
  limit: number;
  offset: number;
  customerId?: string;
}

export interface AccountsReceivableRow {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  totalSales: string;
  totalPayments: string;
  totalDebt: string;
  lastSaleDate: string | null;
}

export interface AccountsReceivablePage {
  items: AccountsReceivableRow[];
  total: number;
}

/**
 * Payment Service for managing debt payments (this.tables.abonos)
 * Extends AbonosService for local-first operations with sync integration
 */
export class PaymentService extends AbonosService {
  async findAccountsReceivablePage(query: AccountsReceivableQuery): Promise<AccountsReceivablePage> {
    const minBalance = query.minBalance ?? 0.01;
    
    // Build filter conditions for this.tables.customers
    const customerConditions = [eq(this.tables.customers.businessId, this.businessId)];
    
    if (query.customerId) {
      customerConditions.push(eq(this.tables.customers.id, query.customerId));
    }
    
    if (query.search?.trim()) {
      const searchPattern = `%${query.search.trim()}%`;
      customerConditions.push(
        or(
          like(this.tables.customers.name, searchPattern),
          like(sql`COALESCE(${this.tables.customers.phone}, '')`, searchPattern)
        )!
      );
    }

    // Get all this.tables.customers matching filters
    const customerList = await this.db
      .select({
        id: this.tables.customers.id,
        name: this.tables.customers.name,
        phone: this.tables.customers.phone,
      })
      .from(this.tables.customers)
      .where(and(...customerConditions));

    const customerIds = customerList.map(c => c.id);
    
    if (customerIds.length === 0) {
      return { items: [], total: 0 };
    }

    // Get credit sales grouped by customer using Drizzle
    const salesByCustomer = await this.db
      .select({
        customerId: this.tables.sales.customerId,
        totalSales: sql<string>`COALESCE(SUM(${this.tables.sales.totalAmount}), 0)`,
        lastSaleDate: sql<string | null>`MAX(${this.tables.sales.saleDate})`,
      })
      .from(this.tables.sales)
      .where(
        and(
          eq(this.tables.sales.businessId, this.businessId),
          eq(this.tables.sales.saleType, "credito"),
          sql`${this.tables.sales.status} NOT IN ('draft', 'cancelled')`,
          sql`${this.tables.sales.customerId} IS NOT NULL`,
          sql`${this.tables.sales.customerId} = ANY(${sql.param(customerIds)})`
        )
      )
      .groupBy(this.tables.sales.customerId);

    // Get payments grouped by customer using Drizzle
    const paymentsByCustomer = await this.db
      .select({
        customerId: this.tables.abonos.customerId,
        totalPayments: sql<string>`COALESCE(SUM(${this.tables.abonos.amount}), 0)`,
      })
      .from(this.tables.abonos)
      .where(
        and(
          eq(this.tables.abonos.businessId, this.businessId),
          sql`${this.tables.abonos.customerId} = ANY(${sql.param(customerIds)})`
        )
      )
      .groupBy(this.tables.abonos.customerId);

    // Build accounts receivable rows in memory
    const salesMap = new Map(salesByCustomer.map(s => [s.customerId!, s]));
    const paymentsMap = new Map(paymentsByCustomer.map(p => [p.customerId!, p]));

    const rows: AccountsReceivableRow[] = customerList.map(customer => {
      const saleData = salesMap.get(customer.id);
      const paymentData = paymentsMap.get(customer.id);
      
      const totalSales = parseFloat(saleData?.totalSales || "0");
      const totalPayments = parseFloat(paymentData?.totalPayments || "0");
      const totalDebt = Math.max(totalSales - totalPayments, 0);

      return {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        totalSales: totalSales.toFixed(2),
        totalPayments: totalPayments.toFixed(2),
        totalDebt: totalDebt.toFixed(2),
        lastSaleDate: saleData?.lastSaleDate || null,
      };
    }).filter(row => parseFloat(row.totalDebt) >= minBalance);

    // Sort by total debt desc, then last sale date desc, then name asc
    rows.sort((a, b) => {
      const debtDiff = parseFloat(b.totalDebt) - parseFloat(a.totalDebt);
      if (debtDiff !== 0) return debtDiff;
      
      if (a.lastSaleDate && b.lastSaleDate) {
        return new Date(b.lastSaleDate).getTime() - new Date(a.lastSaleDate).getTime();
      }
      if (a.lastSaleDate) return -1;
      if (b.lastSaleDate) return 1;
      
      return a.customerName.localeCompare(b.customerName);
    });

    const total = rows.length;
    const paginatedRows = rows.slice(query.offset, query.offset + query.limit);

    return {
      items: paginatedRows,
      total,
    };
  }

  async getAccountsReceivableTotal(filters: Pick<AccountsReceivableQuery, "search" | "minBalance" | "customerId">): Promise<number> {
    const page = await this.findAccountsReceivablePage({
      ...filters,
      limit: 1,
      offset: 0,
    });

    if (page.items.length === 0) {
      return 0;
    }

    // Calculate total debt from all matching rows
    const allRows = await this.findAccountsReceivablePage({
      ...filters,
      limit: Number.MAX_SAFE_INTEGER,
      offset: 0,
    });

    return allRows.items.reduce((sum, row) => sum + parseFloat(row.totalDebt), 0);
  }

  /**
   * Convert Drizzle ORM result to Abono interface (snake_case)
   */
  private toAbono(row: typeof this.tables.abonos.$inferSelect): Abono {
    return {
      id: row.id,
      business_id: row.businessId,
      customer_id: row.customerId,
      seller_id: row.sellerId ?? "",
      amount: this.normalizeCurrency(row.amount),
      payment_method: row.paymentMethod,
      notes: row.notes,
      proof_image_id: row.proofImageId,
      reference_number: row.referenceNumber,
      related_sale_id: row.relatedSaleId,
      sync_status: row.syncStatus as Abono["sync_status"],
      sync_attempts: row.syncAttempts,
      created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    };
  }

  /**
   * Find a payment by ID with normalized amount
   * Override to return Abono type with normalized currency
   */
  async findById(id: string): Promise<Abono | null> {
    try {
      const result = await this.db
        .select()
        .from(this.tables.abonos)
        .where(eq(this.tables.abonos.id, id))
        .limit(1);
      
      const row = result[0];
      if (!row) return null;
      return this.toAbono(row);
    } catch (error) {
      console.error("[PaymentService.findById] Error:", error);
      throw new Error(`Failed to find payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find all payments for a specific customer
   */
  async findByCustomer(customerId: string): Promise<Abono[]> {
    const result = await this.db
      .select()
      .from(this.tables.abonos)
      .where(
        and(
          eq(this.tables.abonos.customerId, customerId),
          eq(this.tables.abonos.businessId, this.businessId)
        )
      )
      .orderBy(desc(this.tables.abonos.createdAt));
    
    return result.map((row) => this.toAbono(row));
  }

  /**
   * Find all payments for the current business
   * Override to return Abono[] type with normalized amounts
   */
  async findByBusiness(): Promise<Abono[]> {
    const result = await this.db
      .select()
      .from(this.tables.abonos)
      .where(eq(this.tables.abonos.businessId, this.businessId))
      .orderBy(desc(this.tables.abonos.createdAt));
    
    return result.map((row) => this.toAbono(row));
  }

  /**
   * Get customer debt balance (this.tables.sales - payments)
   * Only counts credit this.tables.sales (sale_type = credito) that are not draft/cancelled
   */
  async getCustomerDebtBalance(customerId: string): Promise<number> {
    const salesResult = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${this.tables.sales.totalAmount}), 0)`,
      })
      .from(this.tables.sales)
      .where(
        and(
          eq(this.tables.sales.customerId, customerId),
          eq(this.tables.sales.businessId, this.businessId),
          eq(this.tables.sales.saleType, "credito"),
          sql`${this.tables.sales.status} NOT IN ('draft', 'cancelled')`
        )
      );

    const paymentsResult = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${this.tables.abonos.amount}), 0)`,
      })
      .from(this.tables.abonos)
      .where(
        and(
          eq(this.tables.abonos.customerId, customerId),
          eq(this.tables.abonos.businessId, this.businessId)
        )
      );

    const totalSales = parseFloat(salesResult[0]?.total || "0");
    const totalPayments = parseFloat(paymentsResult[0]?.total || "0");

    return Math.max(totalSales - totalPayments, 0);
  }

  /**
   * Validate payment amount against customer debt
   */
  private async validatePaymentAmount(customerId: string, amount: number): Promise<void> {
    const OVERPAYMENT_TOLERANCE = 0.01;
    const debt = await this.getCustomerDebtBalance(customerId);
    
    if (debt <= 0) {
      throw new Error("El cliente no tiene deuda pendiente");
    }

    if (amount > debt + OVERPAYMENT_TOLERANCE) {
      throw new Error(
        `El monto del abono (S/ ${this.normalizeCurrency(amount)}) excede la deuda pendiente (S/ ${this.normalizeCurrency(debt)})`
      );
    }
  }

  /**
   * Validate that customer belongs to the same business
   */
  private async validateCustomerBusiness(customerId: string): Promise<void> {
    const result = await this.db
      .select({ id: this.tables.customers.id })
      .from(this.tables.customers)
      .where(
        and(
          eq(this.tables.customers.id, customerId),
          eq(this.tables.customers.businessId, this.businessId)
        )
      )
      .limit(1);

    if (!result[0]) {
      throw new Error("El cliente no pertenece a este negocio");
    }
  }

  /**
   * Create a new payment (abono)
   * Custom implementation that validates before creating
   */
  // @ts-expect-error - Return type Abono is incompatible with parent but required for consumer hooks
  async create(input: CreateAbonoInput): Promise<Abono> {
    try {
      // Validate customer belongs to this business
      await this.validateCustomerBusiness(input.customerId);

      // Validate payment amount against customer debt (offline validation)
      await this.validatePaymentAmount(input.customerId, input.amount);

      // Format amount as decimal string using project utility
      const amount = this.normalizeCurrency(input.amount);

      const id = this.generateId();
      const now = this.now();

      // Insert using Drizzle ORM
      await this.db.insert(this.tables.abonos).values({
        id,
        customerId: input.customerId,
        sellerId: input.sellerId ?? undefined,
        businessId: this.businessId,
        relatedSaleId: input.relatedSaleId ?? undefined,
        amount,
        paymentMethod: input.paymentMethod ?? "efectivo",
        referenceNumber: input.referenceNumber ?? undefined,
        proofImageId: input.proofImageId ?? undefined,
        notes: input.notes ?? undefined,
        syncStatus: "pending",
        syncAttempts: 0,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      });

      // Queue sync operation
      await this.queueSync("create", id, {
        customerId: input.customerId,
        sellerId: input.sellerId,
        amount,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
        proofImageId: input.proofImageId,
        referenceNumber: input.referenceNumber,
        relatedSaleId: input.relatedSaleId,
      } as Record<string, unknown>);

      // Return the created payment
      const payment = await this.findById(id);
      if (!payment) {
        throw new Error("Payment was created but could not be retrieved");
      }
      return payment;
    } catch (error) {
      console.error("[PaymentService.create] Error:", error);
      throw new Error(`Failed to create payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a payment's editable fields
   * Only notes, proof_image_id, and reference_number can be updated
   * Amount cannot be changed - delete and recreate instead
   */
  // @ts-expect-error - Return type Abono | null is incompatible with parent void return but required for consumer hooks
  async update(id: string, input: UpdateAbonoInput): Promise<Abono | null> {
    // Only notes, proofImageId, and referenceNumber can be updated
    // Amount cannot be changed - this is a business rule
    const hasChanges = input.notes !== undefined ||
                       input.proofImageId !== undefined ||
                       input.referenceNumber !== undefined;

    if (!hasChanges) {
      return this.findById(id);
    }

    const now = this.now();

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      syncStatus: "pending",
      updatedAt: new Date(now),
    };

    if (input.notes !== undefined) {
      updateData.notes = input.notes ?? undefined;
    }

    if (input.proofImageId !== undefined) {
      updateData.proofImageId = input.proofImageId ?? undefined;
    }

    if (input.referenceNumber !== undefined) {
      updateData.referenceNumber = input.referenceNumber ?? undefined;
    }

    // Update using Drizzle ORM
    await this.db.update(this.tables.abonos)
      .set(updateData)
      .where(eq(this.tables.abonos.id, id));

    // Queue sync operation
    await this.queueSync("update", id, {
      notes: input.notes,
      proofImageId: input.proofImageId,
      referenceNumber: input.referenceNumber,
    } as Record<string, unknown>);

    return this.findById(id);
  }

  /**
   * Delete a payment
   */
  async delete(id: string): Promise<void> {
    // Get the payment data before deletion for sync
    const payment = await this.findById(id);
    if (!payment) {
      return;
    }

    // Delete from local database
    await this.db.delete(this.tables.abonos).where(eq(this.tables.abonos.id, id));

    // Queue sync operation
    await this.queueSync("delete", id, {});
  }
}

/**
 * Factory function to create a PaymentService instance
 */
export function createPaymentService(
  engine: SyncClientEngineLike
): PaymentService {
  return new PaymentService(engine);
}
