/**
 * Payment Service (Abonos)
 * Local-first service for managing customer debt payments
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { BaseService, type EntityType } from "./base-service";
import { SyncService } from "../sync/sync-service";
import { abonos } from "@avileo/shared";
import { eq } from "drizzle-orm";
import { formatCurrency } from "~/lib/utils";

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

/** Input for creating a new payment */
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

/** Input for updating a payment */
export interface UpdateAbonoInput {
  notes?: string;
  proofImageId?: string | null;
  referenceNumber?: string | null;
}

/**
 * Payment Service for managing debt payments (abonos)
 * Extends BaseService for local-first operations with sync integration
 */
export class PaymentService extends BaseService {
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
    return "abonos";
  }

  /**
   * Returns the ID prefix for this entity
   */
  getEntityPrefix(): string {
    return "pay";
  }

  /**
   * Find a payment by ID
   */
  async findById(id: string): Promise<Abono | null> {
    try {
      const result = await this.pg.query<Abono>(
        "SELECT * FROM abonos WHERE id = $1",
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("[PaymentService.findById] Error:", error);
      throw new Error(`Failed to find payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find all payments for a specific customer
   */
  async findByCustomer(customerId: string): Promise<Abono[]> {
    const result = await this.pg.query<Abono>(
      `SELECT * FROM abonos
       WHERE customer_id = $1 AND business_id = $2
       ORDER BY created_at DESC`,
      [customerId, this.businessId]
    );
    return result.rows;
  }

  /**
   * Find all payments for the current business
   */
  async findByBusiness(): Promise<Abono[]> {
    const result = await this.pg.query<Abono>(
      `SELECT * FROM abonos
       WHERE business_id = $1
       ORDER BY created_at DESC`,
      [this.businessId]
    );
    return result.rows;
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
        `El monto del abono (S/ ${formatCurrency(amount)}) excede la deuda pendiente (S/ ${formatCurrency(debt)})`
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
   */
  async create(input: CreateAbonoInput): Promise<Abono> {
    try {
      const id = this.generateId();
      const now = this.now();

      // Format amount as decimal string using project utility
      const amount = formatCurrency(input.amount);

      // Validate customer belongs to this business
      await this.validateCustomerBusiness(input.customerId);

      // Validate payment amount against customer debt (offline validation)
      await this.validatePaymentAmount(input.customerId, input.amount);

      await this.pg.exec(
        `INSERT INTO abonos (
          id, business_id, customer_id, seller_id, amount, payment_method,
          notes, proof_image_id, reference_number, related_sale_id,
          sync_status, sync_attempts, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        )`,
        [
          id,
          this.businessId,
          input.customerId,
          input.sellerId,
          amount,
          input.paymentMethod,
          input.notes ?? null,
          input.proofImageId ?? null,
          input.referenceNumber ?? null,
          input.relatedSaleId ?? null,
          "pending",
          0,
          now,
        ]
      );

      // Queue sync operation
      await this.queueSync("insert", id, {
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
  async update(id: string, input: UpdateAbonoInput): Promise<Abono | null> {
    const now = this.now();

    // Build dynamic update based on provided fields
    const updates: string[] = [];
    const params: (string | null)[] = [];
    let paramIndex = 1;

    if (input.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(input.notes ?? null);
    }

    if (input.proofImageId !== undefined) {
      updates.push(`proof_image_id = $${paramIndex++}`);
      params.push(input.proofImageId ?? null);
    }

    if (input.referenceNumber !== undefined) {
      updates.push(`reference_number = $${paramIndex++}`);
      params.push(input.referenceNumber ?? null);
    }

    if (updates.length === 0) {
      // Nothing to update
      return this.findById(id);
    }

    // Add sync_status and updated_at
    updates.push(`sync_status = $${paramIndex++}`);
    params.push("pending");

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(now);

    // Add id as last parameter
    params.push(id);

    await this.pg.exec(
      `UPDATE abonos SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      params
    );

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
  syncService: SyncService,
  businessId: string
): PaymentService {
  return new PaymentService(pg, null, syncService, businessId);
}
