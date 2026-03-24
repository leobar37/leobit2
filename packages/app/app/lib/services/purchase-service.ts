/**
 * Purchase Service
 * Local-first service for managing supplier purchase orders with draft support
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { eq, and, desc, sql } from "drizzle-orm";
import { BaseService, type EntityType } from "./base-service";
import { SyncService } from "../sync/sync-service";
import { purchases, purchaseItems } from "@avileo/shared";
import { formatCurrency } from "~/lib/utils";

/** Purchase status type */
export type PurchaseStatus = "draft" | "pending" | "received" | "cancelled";

/** Purchase entity type */
export interface Purchase {
  id: string;
  business_id: string;
  supplier_id: string | null;
  purchase_date: string | null;
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

/** Purchase item enriched with product/variant names (returned by findById) */
export interface PurchaseItemEnriched {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: string;
  unitCost: string;
  totalCost: string;
  productName: string;
  variantName: string;
}

/** Purchase with its items joined from purchase_items table */
export interface PurchaseWithItems extends Purchase {
  items: PurchaseItemEnriched[];
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
  supplierId?: string;
  purchaseDate?: string;
  totalAmount?: number;
  invoiceNumber?: string;
  notes?: string;
  receiptImageId?: string;
  items?: CreatePurchaseItemInput[];
}

/** Input for updating a purchase */
export interface UpdatePurchaseInput {
  supplierId?: string;
  purchaseDate?: string;
  totalAmount?: number;
  invoiceNumber?: string;
  notes?: string;
  receiptImageId?: string;
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
   * Find a purchase by ID with its items
   */
  async findById(id: string): Promise<PurchaseWithItems | null> {
    const result = await this.pg.query<Purchase>(
      "SELECT * FROM purchases WHERE id = $1 AND business_id = $2",
      [id, this.businessId]
    );
    const purchase = result.rows[0];
    if (!purchase) return null;

    const itemsResult = await this.pg.query<PurchaseItemEnriched>(
      `SELECT
        pi.id,
        pi.product_id as "productId",
        pi.variant_id as "variantId",
        pi.quantity,
        pi.unit_cost as "unitCost",
        pi.total_cost as "totalCost",
        COALESCE(p.name, 'Producto') as "productName",
        COALESCE(pv.name, '') as "variantName"
      FROM purchase_items pi
      LEFT JOIN products p ON pi.product_id = p.id
      LEFT JOIN product_variants pv ON pi.variant_id = pv.id
      WHERE pi.purchase_id = $1 AND pi.business_id = $2
      ORDER BY pi.created_at ASC`,
      [id, this.businessId]
    );

    const calculatedTotal = itemsResult.rows.reduce((sum, item) => {
      return sum + (parseFloat(item.totalCost) || 0);
    }, 0);
    const storedTotal = parseFloat(purchase.total_amount) || 0;

    if (
      itemsResult.rows.length > 0 &&
      Math.abs(storedTotal - calculatedTotal) > 0.009
    ) {
      await this.recalculateTotal(id);
      purchase.total_amount = formatCurrency(calculatedTotal);
    }

    return { ...purchase, items: itemsResult.rows };
  }

  /**
   * Find all purchases for the current business (excluding drafts)
   */
  async findByBusiness(): Promise<Purchase[]> {
    const result = await this.pg.query<Purchase>(
      `SELECT * FROM purchases
       WHERE business_id = $1 AND status != 'draft'
       ORDER BY purchase_date DESC NULLS LAST, created_at DESC`,
      [this.businessId]
    );
    return result.rows;
  }

  /**
   * Find all drafts for the current business
   */
  async findDrafts(): Promise<Purchase[]> {
    const result = await this.pg.query<Purchase>(
      `SELECT * FROM purchases
       WHERE business_id = $1 AND status = 'draft'
       ORDER BY updated_at DESC`,
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
       WHERE supplier_id = $1 AND business_id = $2 AND status != 'draft'
       ORDER BY purchase_date DESC NULLS LAST, created_at DESC`,
      [supplierId, this.businessId]
    );
    return result.rows;
  }

  /**
   * Create a new purchase (starts as draft by default)
   */
  async create(input: CreatePurchaseInput = {}): Promise<Purchase> {
    const id = this.generateId();
    const now = new Date();
    const syncGroupId = this.generateSyncGroup();

    // Calculate total from items if provided
    const totalAmount = input.items?.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0
    ) ?? 0;

    // Insert purchase using raw query (Drizzle doesn't allow specifying id with defaultRandom)
    await this.pg.query(
      `INSERT INTO purchases (
        id, business_id, supplier_id, purchase_date, total_amount,
        status, invoice_number, receipt_image_id, notes,
        sync_status, sync_attempts, sync_group_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        id,
        this.businessId,
        input.supplierId ?? null,
        input.purchaseDate ?? null,
        formatCurrency(totalAmount),
        "draft",
        input.invoiceNumber ?? null,
        input.receiptImageId ?? null,
        input.notes ?? null,
        "pending",
        0,
        syncGroupId,
        now.toISOString(),
        now.toISOString(),
      ]
    );

    // Insert all items first (before sync hooks run)
    const itemIds: { id: string; item: CreatePurchaseItemInput }[] = [];
    if (input.items?.length) {
      for (const item of input.items) {
        const itemId = this.generateId();
        await this.pg.query(
          `INSERT INTO purchase_items (
            id, business_id, purchase_id, product_id, variant_id, unit_id,
            quantity, unit_cost, total_cost,
            sync_status, sync_attempts, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            itemId,
            this.businessId,
            id,
            item.productId,
            item.variantId ?? null,
            item.unitId ?? null,
            String(item.quantity),
            formatCurrency(item.unitCost),
            formatCurrency(item.quantity * item.unitCost),
            "pending",
            0,
            now.toISOString(),
            now.toISOString(),
          ]
        );
        itemIds.push({ id: itemId, item });
      }
    }

    // Sync the purchase after items are in DB (so hook can validate)
    await this.queueSync("create", id, {
      supplierId: input.supplierId,
      purchaseDate: input.purchaseDate,
      totalAmount: formatCurrency(totalAmount),
      status: "draft",
      invoiceNumber: input.invoiceNumber,
      notes: input.notes,
      receiptImageId: input.receiptImageId,
      syncGroupId,
    }, syncGroupId);

    // Sync items after purchase (same sync group)
    for (const { id: itemId, item } of itemIds) {
      await this.queueSync("create", itemId, {
        purchaseId: id,
        productId: item.productId,
        variantId: item.variantId,
        unitId: item.unitId,
        quantity: String(item.quantity),
        unitCost: formatCurrency(item.unitCost),
        totalCost: formatCurrency(item.quantity * item.unitCost),
      }, syncGroupId, "purchase_items");
    }

    return (await this.findById(id)) as PurchaseWithItems;
  }

  /**
   * Update a purchase (works for any status including drafts)
   */
  async update(id: string, input: UpdatePurchaseInput): Promise<void> {
    const updateData: { [key: string]: unknown } = {
      updatedAt: new Date(),
      syncStatus: "pending",
    };

    if (input.supplierId !== undefined) updateData.supplierId = input.supplierId;
    if (input.purchaseDate !== undefined) updateData.purchaseDate = input.purchaseDate;
    if (input.totalAmount !== undefined) updateData.totalAmount = formatCurrency(input.totalAmount);
    if (input.invoiceNumber !== undefined) updateData.invoiceNumber = input.invoiceNumber;
    if (input.receiptImageId !== undefined) updateData.receiptImageId = input.receiptImageId;
    if (input.notes !== undefined) updateData.notes = input.notes;

    await this.db
      .update(purchases)
      .set(updateData)
      .where(and(eq(purchases.id, id), eq(purchases.businessId, this.businessId)));

    const existingSyncGroupId = await this.getPurchaseSyncGroupId(id);
    await this.queueSync("update", id, input as Record<string, unknown>, existingSyncGroupId);
  }

  /**
   * Update the status of a purchase
   * Validates required fields when confirming (draft -> pending)
   */
  async updateStatus(id: string, status: PurchaseStatus): Promise<void> {
    const purchase = await this.findById(id);
    if (!purchase) {
      throw new Error("Purchase not found");
    }

    // Validate when confirming a draft
    if (purchase.status === "draft" && status === "pending") {
      if (!purchase.supplier_id) {
        throw new Error("Se requiere un proveedor para confirmar la compra");
      }
      if (!purchase.purchase_date) {
        throw new Error("Se requiere una fecha para confirmar la compra");
      }
      if (purchase.items.length === 0) {
        throw new Error("Se requiere al menos un item para confirmar la compra");
      }
    }

    await this.db
      .update(purchases)
      .set({
        status,
        updatedAt: new Date(),
        syncStatus: "pending",
      })
      .where(and(eq(purchases.id, id), eq(purchases.businessId, this.businessId)));

    await this.queueSync("update", id, { status });
  }

  /**
   * Delete a purchase (only drafts can be deleted)
   */
  async delete(id: string): Promise<void> {
    const purchase = await this.findById(id);
    if (!purchase) {
      return;
    }

    // Only allow deleting drafts
    if (purchase.status !== "draft") {
      throw new Error("Solo los borradores pueden ser eliminados");
    }

    // Delete items first (cascade will handle this, but we need to sync)
    for (const item of purchase.items) {
      await this.queueSync("delete", item.id, { purchaseId: id }, undefined, "purchase_items");
    }

    await this.db
      .delete(purchases)
      .where(and(eq(purchases.id, id), eq(purchases.businessId, this.businessId)));

    await this.queueSync("delete", id, {});
  }

  /**
   * Add an item to a purchase (only drafts)
   */
  async addItem(purchaseId: string, item: CreatePurchaseItemInput): Promise<void> {
    const purchase = await this.findById(purchaseId);
    if (!purchase) {
      throw new Error("Purchase not found");
    }

    // Only allow adding items to drafts
    if (purchase.status !== "draft") {
      throw new Error("Solo los borradores pueden ser editados");
    }

    const now = new Date();
    const itemId = this.generateId();

    await this.pg.query(
      `INSERT INTO purchase_items (
        id, business_id, purchase_id, product_id, variant_id, unit_id,
        quantity, unit_cost, total_cost,
        sync_status, sync_attempts, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        itemId,
        this.businessId,
        purchaseId,
        item.productId,
        item.variantId ?? null,
        item.unitId ?? null,
        String(item.quantity),
        formatCurrency(item.unitCost),
        formatCurrency(item.quantity * item.unitCost),
        "pending",
        0,
        now.toISOString(),
        now.toISOString(),
      ]
    );

    // Recalculate total
    await this.recalculateTotal(purchaseId);

    // Sync with parent's syncGroupId
    const purchaseSyncGroupId = await this.getPurchaseSyncGroupId(purchaseId);
    await this.queueSync("create", itemId, {
      purchaseId,
      productId: item.productId,
      variantId: item.variantId,
      unitId: item.unitId,
      quantity: String(item.quantity),
      unitCost: formatCurrency(item.unitCost),
      totalCost: formatCurrency(item.quantity * item.unitCost),
    }, purchaseSyncGroupId, "purchase_items");
  }

  /**
   * Update an item in a purchase (only drafts)
   */
  async updateItem(
    purchaseId: string,
    itemId: string,
    data: {
      quantity?: number;
      unitCost?: number;
    }
  ): Promise<void> {
    const purchase = await this.findById(purchaseId);
    if (!purchase) {
      throw new Error("Purchase not found");
    }

    // Only allow updating items in drafts
    if (purchase.status !== "draft") {
      throw new Error("Solo los borradores pueden ser editados");
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      syncStatus: "pending",
    };

    if (data.quantity !== undefined) {
      updateData.quantity = String(data.quantity);
    }
    if (data.unitCost !== undefined) {
      updateData.unitCost = formatCurrency(data.unitCost);
    }

    // Calculate new total cost if both values are provided
    if (data.quantity !== undefined && data.unitCost !== undefined) {
      updateData.totalCost = formatCurrency(data.quantity * data.unitCost);
    }

    await this.db
      .update(purchaseItems)
      .set(updateData)
      .where(and(
        eq(purchaseItems.id, itemId),
        eq(purchaseItems.purchaseId, purchaseId)
      ));

    // Recalculate total
    await this.recalculateTotal(purchaseId);

    // Sync with parent's syncGroupId
    const purchaseSyncGroupId = await this.getPurchaseSyncGroupId(purchaseId);
    await this.queueSync("update", itemId, {
      purchaseId,
      quantity: data.quantity !== undefined ? String(data.quantity) : undefined,
      unitCost: data.unitCost !== undefined ? formatCurrency(data.unitCost) : undefined,
    }, purchaseSyncGroupId, "purchase_items");
  }

  /**
   * Delete an item from a purchase (only drafts)
   */
  async removeItem(purchaseId: string, itemId: string): Promise<void> {
    const purchase = await this.findById(purchaseId);
    if (!purchase) {
      throw new Error("Purchase not found");
    }

    // Only allow removing items from drafts
    if (purchase.status !== "draft") {
      throw new Error("Solo los borradores pueden ser editados");
    }

    await this.db
      .delete(purchaseItems)
      .where(and(
        eq(purchaseItems.id, itemId),
        eq(purchaseItems.purchaseId, purchaseId)
      ));

    // Recalculate total
    await this.recalculateTotal(purchaseId);

    // Sync with parent's syncGroupId
    const purchaseSyncGroupId = await this.getPurchaseSyncGroupId(purchaseId);
    await this.queueSync("delete", itemId, { purchaseId }, purchaseSyncGroupId, "purchase_items");
  }

  /**
   * Add an item to an existing purchase (for editing confirmed purchases)
   * Does NOT check for draft status - use with caution
   */
  async addItemToPurchase(purchaseId: string, item: CreatePurchaseItemInput): Promise<void> {
    const now = new Date();
    const itemId = this.generateId();

    await this.pg.query(
      `INSERT INTO purchase_items (
        id, business_id, purchase_id, product_id, variant_id, unit_id,
        quantity, unit_cost, total_cost,
        sync_status, sync_attempts, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        itemId,
        this.businessId,
        purchaseId,
        item.productId,
        item.variantId ?? null,
        item.unitId ?? null,
        String(item.quantity),
        formatCurrency(item.unitCost),
        formatCurrency(item.quantity * item.unitCost),
        "pending",
        0,
        now.toISOString(),
        now.toISOString(),
      ]
    );

    // Recalculate total
    await this.recalculateTotal(purchaseId);

    // Sync with parent's syncGroupId
    const purchaseSyncGroupId = await this.getPurchaseSyncGroupId(purchaseId);
    await this.queueSync("create", itemId, {
      purchaseId,
      productId: item.productId,
      variantId: item.variantId,
      unitId: item.unitId,
      quantity: String(item.quantity),
      unitCost: formatCurrency(item.unitCost),
      totalCost: formatCurrency(item.quantity * item.unitCost),
    }, purchaseSyncGroupId, "purchase_items");
  }

  /**
   * Update an item in a purchase (for editing confirmed purchases)
   * Does NOT check for draft status - use with caution
   */
  async updateItemInPurchase(
    purchaseId: string,
    itemId: string,
    data: {
      quantity?: number;
      unitCost?: number;
      totalCost?: number;
    }
  ): Promise<void> {
    const now = new Date();
    const totalCost = data.totalCost ?? (data.quantity && data.unitCost ? data.quantity * data.unitCost : undefined);

    await this.pg.query(
      `UPDATE purchase_items SET
        quantity = COALESCE($1, quantity),
        unit_cost = COALESCE($2, unit_cost),
        total_cost = COALESCE($3, total_cost),
        updated_at = $4,
        sync_status = $5
      WHERE id = $6 AND purchase_id = $7`,
      [
        data.quantity !== undefined ? String(data.quantity) : null,
        data.unitCost !== undefined ? formatCurrency(data.unitCost) : null,
        totalCost !== undefined ? formatCurrency(totalCost) : null,
        now.toISOString(),
        "pending",
        itemId,
        purchaseId,
      ]
    );

    // Recalculate purchase total
    await this.recalculateTotal(purchaseId);

    // Sync with parent's syncGroupId
    const purchaseSyncGroupId = await this.getPurchaseSyncGroupId(purchaseId);
    await this.queueSync("update", itemId, {
      purchaseId,
      quantity: data.quantity !== undefined ? String(data.quantity) : undefined,
      unitCost: data.unitCost !== undefined ? formatCurrency(data.unitCost) : undefined,
      totalCost: totalCost !== undefined ? formatCurrency(totalCost) : undefined,
    }, purchaseSyncGroupId, "purchase_items");
  }

  /**
   * Delete an item from a purchase (for editing confirmed purchases)
   * Does NOT check for draft status - use with caution
   */
  async deleteItemFromPurchase(purchaseId: string, itemId: string): Promise<void> {
    const now = new Date();

    await this.pg.query(
      `DELETE FROM purchase_items WHERE id = $1 AND purchase_id = $2`,
      [itemId, purchaseId]
    );

    // Recalculate purchase total
    await this.recalculateTotal(purchaseId);

    // Sync with parent's syncGroupId
    const purchaseSyncGroupId = await this.getPurchaseSyncGroupId(purchaseId);
    await this.queueSync("delete", itemId, { purchaseId }, purchaseSyncGroupId, "purchase_items");
  }

  /**
   * Get the sync group ID for a purchase (used to group related sync operations)
   */
  private async getPurchaseSyncGroupId(purchaseId: string): Promise<string | undefined> {
    const result = await this.pg.query<{ sync_group_id: string }>(
      `SELECT sync_group_id FROM purchases WHERE id = $1 AND business_id = $2`,
      [purchaseId, this.businessId]
    );
    return result.rows[0]?.sync_group_id ?? undefined;
  }

  /**
   * Recalculate the total amount of a purchase based on its items
   */
  private async recalculateTotal(purchaseId: string): Promise<void> {
    const result = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${purchaseItems.totalCost} AS DECIMAL)), 0)`,
      })
      .from(purchaseItems)
      .where(
        and(
          eq(purchaseItems.purchaseId, purchaseId),
          eq(purchaseItems.businessId, this.businessId)
        )
      );

    await this.db
      .update(purchases)
      .set({
        totalAmount: result[0]?.total ?? "0",
        updatedAt: new Date(),
        syncStatus: "pending",
      })
      .where(
        and(eq(purchases.id, purchaseId), eq(purchases.businessId, this.businessId))
      );
  }
}

/**
 * Factory function to create a PurchaseService instance
 */
export function createPurchaseService(
  pg: PGlite,
  db: ReturnType<typeof drizzle>,
  syncService: SyncService,
  businessId: string
): PurchaseService {
  return new PurchaseService(pg, db, syncService, businessId, "");
}
