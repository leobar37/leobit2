/**
 * Payment Service (Abonos)
 * Local-first service for managing customer debt payments
 * Extends AbonosService for basic CRUD, adds payment-specific business logic
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { abonos } from "@avileo/shared";
import { eq } from "drizzle-orm";
import { mapToCamelCase } from "~/lib/mappers/entity-mapper";

// Import generated base service
import { AbonosService } from "~/lib/sync/generated/services";
import type { SyncWritePort } from "@avileo/drizzle-sync/client";
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
 * Payment Service for managing debt payments (abonos)
 * Extends AbonosService for local-first operations with sync integration
 */
export class PaymentService extends AbonosService {
  constructor(
    pg: PGlite,
    db: ReturnType<typeof drizzle>,
    syncService: SyncWritePort,
    businessId: string,
    businessUserId: string
  ) {
    super(pg, db, syncService, businessId, businessUserId);
  }

  async findAccountsReceivablePage(query: AccountsReceivableQuery): Promise<AccountsReceivablePage> {
    const minBalance = query.minBalance ?? 0.01;
    const params: Array<string | number> = [this.businessId, this.businessId];
    let paramIndex = params.length;

    let extraFilters = "";

    if (query.customerId) {
      paramIndex += 1;
      params.push(query.customerId);
      extraFilters += ` AND c.id = $${paramIndex}`;
    }

    if (query.search?.trim()) {
      const searchPattern = `%${query.search.trim()}%`;
      paramIndex += 1;
      params.push(searchPattern);
      extraFilters += ` AND (c.name LIKE $${paramIndex} OR COALESCE(c.phone, '') LIKE $${paramIndex})`;
    }

    paramIndex += 1;
    params.push(minBalance);
    const minBalanceParam = paramIndex;

    const baseQuery = `
      WITH sales_by_customer AS (
        SELECT customer_id,
               COALESCE(SUM(total_amount), 0) AS total_sales,
               MAX(sale_date) AS last_sale_date
        FROM sales
        WHERE business_id = $1
          AND sale_type = 'credito'
          AND status NOT IN ('draft', 'cancelled')
          AND customer_id IS NOT NULL
        GROUP BY customer_id
      ),
      payments_by_customer AS (
        SELECT customer_id,
               COALESCE(SUM(amount), 0) AS total_payments
        FROM abonos
        WHERE business_id = $2
        GROUP BY customer_id
      ),
      debtors AS (
        SELECT
          c.id AS customer_id,
          c.name AS customer_name,
          c.phone AS customer_phone,
          COALESCE(s.total_sales, 0) AS total_sales,
          COALESCE(p.total_payments, 0) AS total_payments,
          GREATEST(COALESCE(s.total_sales, 0) - COALESCE(p.total_payments, 0), 0) AS total_debt,
          s.last_sale_date
        FROM customers c
        LEFT JOIN sales_by_customer s ON s.customer_id = c.id
        LEFT JOIN payments_by_customer p ON p.customer_id = c.id
        WHERE c.business_id = $1
          ${extraFilters}
      )
    `;

    const itemsParams = [...params, query.limit, query.offset];
    const itemsResult = await this.pg.query<AccountsReceivableRow>(
      `${baseQuery}
       SELECT
         customer_id,
         customer_name,
         customer_phone,
         total_sales,
         total_payments,
         total_debt,
         last_sale_date
       FROM debtors
       WHERE total_debt >= $${minBalanceParam}
       ORDER BY total_debt DESC, last_sale_date DESC NULLS LAST, customer_name ASC
       LIMIT $${minBalanceParam + 1}
       OFFSET $${minBalanceParam + 2}`,
      itemsParams
    );

    const countResult = await this.pg.query<{ count: string }>(
      `${baseQuery}
       SELECT COUNT(*) AS count
       FROM debtors
       WHERE total_debt >= $${minBalanceParam}`,
      params
    );

    return {
      items: itemsResult.rows.map((row) => mapToCamelCase(row) as unknown as AccountsReceivableRow),
      total: Number(countResult.rows[0]?.count ?? 0),
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

    const minBalance = filters.minBalance ?? 0.01;
    const params: Array<string | number> = [this.businessId, this.businessId];
    let paramIndex = params.length;
    let extraFilters = "";

    if (filters.customerId) {
      paramIndex += 1;
      params.push(filters.customerId);
      extraFilters += ` AND c.id = $${paramIndex}`;
    }

    if (filters.search?.trim()) {
      const searchPattern = `%${filters.search.trim()}%`;
      paramIndex += 1;
      params.push(searchPattern);
      extraFilters += ` AND (c.name LIKE $${paramIndex} OR COALESCE(c.phone, '') LIKE $${paramIndex})`;
    }

    paramIndex += 1;
    params.push(minBalance);

    const result = await this.pg.query<{ total: string }>(
      `
      WITH sales_by_customer AS (
        SELECT customer_id,
               COALESCE(SUM(total_amount), 0) AS total_sales
        FROM sales
        WHERE business_id = $1
          AND sale_type = 'credito'
          AND status NOT IN ('draft', 'cancelled')
          AND customer_id IS NOT NULL
        GROUP BY customer_id
      ),
      payments_by_customer AS (
        SELECT customer_id,
               COALESCE(SUM(amount), 0) AS total_payments
        FROM abonos
        WHERE business_id = $2
        GROUP BY customer_id
      ),
      debtors AS (
        SELECT GREATEST(COALESCE(s.total_sales, 0) - COALESCE(p.total_payments, 0), 0) AS total_debt
        FROM customers c
        LEFT JOIN sales_by_customer s ON s.customer_id = c.id
        LEFT JOIN payments_by_customer p ON p.customer_id = c.id
        WHERE c.business_id = $1
          ${extraFilters}
      )
      SELECT COALESCE(SUM(total_debt), 0) AS total
      FROM debtors
      WHERE total_debt >= $${paramIndex}
      `,
      params
    );

    return Number(result.rows[0]?.total ?? 0);
  }

  /**
   * Find a payment by ID with normalized amount
   * Override to return Abono type with normalized currency
   */
  // @ts-expect-error - Return type Abono is incompatible with parent but required for consumer hooks
  async findById(id: string): Promise<Abono | null> {
    try {
      const result = await this.pg.query<Abono>(
        "SELECT * FROM abonos WHERE id = $1",
        [id]
      );
      const row = result.rows[0];
      if (!row) return null;
      return {
        ...row,
        amount: this.normalizeCurrency(row.amount),
      };
    } catch (error) {
      console.error("[PaymentService.findById] Error:", error);
      throw new Error(`Failed to find payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find all payments for a specific customer
   * Keeps custom SQL query with amount normalization
   */
  async findByCustomer(customerId: string): Promise<Abono[]> {
    const result = await this.pg.query<Abono>(
      `SELECT * FROM abonos
       WHERE customer_id = $1 AND business_id = $2
       ORDER BY created_at DESC`,
      [customerId, this.businessId]
    );
    return result.rows.map((row) => ({
      ...row,
      amount: this.normalizeCurrency(row.amount),
    }));
  }

  /**
   * Find all payments for the current business
   * Override to return Abono[] type with normalized amounts
   */
  // @ts-expect-error - Return type Abono[] is incompatible with parent but required for consumer hooks
  async findByBusiness(): Promise<Abono[]> {
    const result = await this.pg.query<Abono>(
      `SELECT * FROM abonos
       WHERE business_id = $1
       ORDER BY created_at DESC`,
      [this.businessId]
    );
    return result.rows.map((row) => ({
      ...row,
      amount: this.normalizeCurrency(row.amount),
    }));
  }

  /**
   * Get customer debt balance (sales - payments)
   * Only counts credit sales (sale_type = credito) that are not draft/cancelled
   */
  async getCustomerDebtBalance(customerId: string): Promise<number> {
    const salesResult = await this.pg.query<{ total: string }>(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM sales
       WHERE customer_id = $1 AND business_id = $2
       AND sale_type = 'credito' AND status NOT IN ('draft', 'cancelled')`,
      [customerId, this.businessId]
    );

    const paymentsResult = await this.pg.query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM abonos
       WHERE customer_id = $1 AND business_id = $2`,
      [customerId, this.businessId]
    );

    const totalSales = parseFloat(salesResult.rows[0]?.total || "0");
    const totalPayments = parseFloat(paymentsResult.rows[0]?.total || "0");

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
    const result = await this.pg.query<{ id: string }>(
      `SELECT id FROM customers WHERE id = $1 AND business_id = $2`,
      [customerId, this.businessId]
    );

    if (!result.rows[0]) {
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
      await this.db.insert(abonos).values({
        id,
        customerId: input.customerId,
        sellerId: input.sellerId ?? null,
        businessId: this.businessId,
        relatedSaleId: input.relatedSaleId ?? null,
        amount,
        paymentMethod: input.paymentMethod ?? "efectivo",
        referenceNumber: input.referenceNumber ?? null,
        proofImageId: input.proofImageId ?? null,
        notes: input.notes ?? null,
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
      updateData.notes = input.notes ?? null;
    }

    if (input.proofImageId !== undefined) {
      updateData.proofImageId = input.proofImageId ?? null;
    }

    if (input.referenceNumber !== undefined) {
      updateData.referenceNumber = input.referenceNumber ?? null;
    }

    // Update using Drizzle ORM
    await this.db.update(abonos)
      .set(updateData)
      .where(eq(abonos.id, id));

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
    await this.db.delete(abonos).where(eq(abonos.id, id));

    // Queue sync operation
    await this.queueSync("delete", id, {});
  }
}

/**
 * Factory function to create a PaymentService instance
 */
export function createPaymentService(
  pg: PGlite,
  db: ReturnType<typeof drizzle>,
  syncService: SyncWritePort,
  businessId: string,
  businessUserId: string
): PaymentService {
  return new PaymentService(pg, db, syncService, businessId, businessUserId);
}
