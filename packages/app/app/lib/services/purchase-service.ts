/**
 * Purchase Service
 * Local-first service for managing supplier purchase orders
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
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

/** Purchase item for creation */
export interface CreatePurchaseItemInput {
  productId: string;
  variantId?: string;
  unitId?: string;
  quantity: number;
  unitCost: number;
}

/** Input for creating a new purchase */
export interface CreatePurchaseInput {
  supplierId: string;
  purchaseDate: string;
  totalAmount: number;
  invoiceNumber?: string;
  notes?: string;
  receiptImageId?: string;
  items: CreatePurchaseItemInput[];
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
   * Create a new purchase with items
   */
  async create(input: CreatePurchaseInput): Promise<Purchase> {
    const id = this.generateId();
    const now = this.now();
    const totalAmount = formatCurrency(input.totalAmount);
    const syncGroupId = this.generateSyncGroup();

    // Insert purchase using pg.query with parameterized values
    await this.pg.query(
      `INSERT INTO purchases (
        id, business_id, supplier_id, purchase_date, total_amount,
        status, invoice_number, receipt_image_id, notes,
        sync_status, sync_attempts, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        this.businessId,
        input.supplierId,
        new Date(input.purchaseDate),
        totalAmount,
        "pending",
        input.invoiceNumber ?? null,
        input.receiptImageId ?? null,
        input.notes ?? null,
        "pending",
        0,
        now,
        now,
      ]
    );

    // Insert each item and queue sync
    const itemSyncPayloads: Record<string, unknown>[] = [];
    for (const item of input.items) {
      const itemId = this.generateId();
      const itemTotalCost = formatCurrency(item.quantity * item.unitCost);

      await this.pg.query(
        `INSERT INTO purchase_items (
          id, business_id, purchase_id, product_id, variant_id, unit_id,
          quantity, unit_cost, total_cost,
          sync_status, sync_attempts, sync_version, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          itemId,
          this.businessId,
          id,
          item.productId,
          item.variantId ?? null,
          item.unitId ?? null,
          String(item.quantity),
          formatCurrency(item.unitCost),
          itemTotalCost,
          "pending",
          0,
          1,
          now,
          now,
        ]
      );

      itemSyncPayloads.push({
        id: itemId,
        productId: item.productId,
        variantId: item.variantId ?? null,
        unitId: item.unitId ?? null,
        quantity: String(item.quantity),
        unitCost: formatCurrency(item.unitCost),
        totalCost: itemTotalCost,
      });
    }

    // Queue sync for purchase
    await this.queueSync("insert", id, {
      supplierId: input.supplierId,
      purchaseDate: input.purchaseDate,
      totalAmount,
      invoiceNumber: input.invoiceNumber,
      notes: input.notes,
      receiptImageId: input.receiptImageId,
      items: itemSyncPayloads,
    } as Record<string, unknown>, syncGroupId);

    // Queue sync for each item with same syncGroupId
    for (let i = 0; i < input.items.length; i++) {
      const itemPayload = itemSyncPayloads[i];
      await this.queueSync(
        "insert",
        itemPayload.id as string,
        itemPayload,
        syncGroupId,
        "purchase_items"
      );
    }

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

    await this.pg.query(
      "UPDATE purchases SET status = $1, updated_at = $2 WHERE id = $3",
      [status, now, id]
    );

    await this.queueSync("update", id, {
      status,
    } as Record<string, unknown>);
  }

  /**
   * Delete a purchase
   */
  async delete(id: string): Promise<void> {
    const purchase = await this.findById(id);
    if (!purchase) {
      return;
    }

    await this.pg.query("DELETE FROM purchases WHERE id = $1", [id]);

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
  return new PurchaseService(pg, null as unknown as ReturnType<typeof drizzle>, syncService, businessId, "");
}
