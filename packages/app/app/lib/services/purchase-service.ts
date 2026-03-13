/**
 * Purchase Service
 * Local-first service for managing supplier purchase orders
 */

import type { PGlite } from "@electric-sql/pglite";
import { BaseService, type EntityType } from "./base-service";
import { SyncService } from "../sync/sync-service";
import { formatCurrency } from "~/lib/utils";

/** Purchase status type */
export type PurchaseStatus = "pending" | "received" | "cancelled";

/** Purchase entity type */
export interface Purchase {
  id: string;
  business_id: string;
  supplier_id: string;
  purchase_date: string;
  total_amount: string;
  status: PurchaseStatus;
  invoice_number: string | null;
  receipt_image_id: string | null;
  notes: string | null;
  sync_status: "pending" | "synced" | "error";
  sync_attempts: number;
  created_at: string;
  updated_at: string;
}

/** Input for creating a new purchase */
export interface CreatePurchaseInput {
  supplier_id: string;
  purchase_date: string;
  total_amount: number;
  invoice_number?: string;
  notes?: string;
  receipt_image_id?: string;
}

/** Input for updating purchase status */
export interface UpdatePurchaseStatusInput {
  status: PurchaseStatus;
}

/**
 * Purchase Service for managing supplier purchase orders
 * Extends BaseService for local-first operations with sync integration
 */
export class PurchaseService extends BaseService {
  constructor(pg: PGlite, syncService: SyncService, businessId: string) {
    super(pg, syncService, businessId);
  }

  /**
   * Returns the entity type for this service
   */
  getEntityType(): EntityType {
    return "purchases";
  }

  /**
   * Returns the ID prefix for this entity
   */
  getEntityPrefix(): string {
    return "pur";
  }

  /**
   * Find a purchase by ID
   */
  async findById(id: string): Promise<Purchase | null> {
    const result = await this.pg.query<Purchase>(
      "SELECT * FROM purchases WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find all purchases for the current business
   */
  async findByBusiness(): Promise<Purchase[]> {
    const result = await this.pg.query<Purchase>(
      `SELECT * FROM purchases
       WHERE business_id = $1
       ORDER BY purchase_date DESC, created_at DESC`,
      [this.businessId]
    );
    return result.rows;
  }

  /**
   * Find all purchases for a specific supplier
   */
  async findBySupplier(supplierId: string): Promise<Purchase[]> {
    const result = await this.pg.query<Purchase>(
      `SELECT * FROM purchases
       WHERE supplier_id = $1 AND business_id = $2
       ORDER BY purchase_date DESC, created_at DESC`,
      [supplierId, this.businessId]
    );
    return result.rows;
  }

  /**
   * Create a new purchase
   */
  async create(input: CreatePurchaseInput): Promise<Purchase> {
    const id = this.generateId();
    const now = this.now();

    // Format amount as decimal string using project utility
    const totalAmount = formatCurrency(input.total_amount);

    await this.pg.exec(
      `INSERT INTO purchases (
        id, business_id, supplier_id, purchase_date, total_amount,
        status, invoice_number, receipt_image_id, notes,
        sync_status, sync_attempts, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        this.businessId,
        input.supplier_id,
        input.purchase_date,
        totalAmount,
        "pending",
        input.invoice_number ?? null,
        input.receipt_image_id ?? null,
        input.notes ?? null,
        "pending",
        0,
        now,
        now,
      ]
    );

    // Queue sync operation
    await this.queueSync("insert", id, {
      supplier_id: input.supplier_id,
      purchase_date: input.purchase_date,
      total_amount: totalAmount,
      invoice_number: input.invoice_number,
      notes: input.notes,
      receipt_image_id: input.receipt_image_id,
    } as Record<string, unknown>);

    // Return the created purchase
    return (await this.findById(id)) as Purchase;
  }

  /**
   * Update the status of a purchase
   */
  async updateStatus(id: string, status: PurchaseStatus): Promise<void> {
    const purchase = await this.findById(id);
    if (!purchase) {
      return;
    }

    const now = this.now();

    await this.pg.exec(
      "UPDATE purchases SET status = $1, updated_at = $2 WHERE id = $3",
      [status, now, id]
    );

    // Queue sync operation
    await this.queueSync("update", id, {
      status,
    } as Record<string, unknown>);
  }

  /**
   * Delete a purchase
   */
  async delete(id: string): Promise<void> {
    // Get the purchase data before deletion for sync
    const purchase = await this.findById(id);
    if (!purchase) {
      return;
    }

    // Delete from local database
    await this.pg.exec("DELETE FROM purchases WHERE id = $1", [id]);

    // Queue sync operation
    await this.queueSync("delete", id, {});
  }
}

/**
 * Factory function to create a PurchaseService instance
 */
export function createPurchaseService(
  pg: PGlite,
  syncService: SyncService,
  businessId: string
): PurchaseService {
  return new PurchaseService(pg, null, syncService, businessId);
}
