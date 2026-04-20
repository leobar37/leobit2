/**
 * Purchase Service
 * Local-first service for managing supplier purchase orders with draft support
 * Extends generated PurchasesService to preserve atomic items operations
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  PurchasesService,
  type CreatePurchasesInput,
  type UpdatePurchasesInput,
} from "~/lib/sync/generated/services";
import { SyncService } from "../sync/sync-service";
import {
  SyncStatus,
  purchases,
  purchaseItems,
  type Purchase,
} from "@avileo/shared";

// Re-export Purchase for backward compatibility
export { type Purchase } from "@avileo/shared";

/** Purchase status type */
export type PurchaseStatus = "draft" | "pending" | "received" | "cancelled";

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

/** Input for creating a new purchase (uses string for monetary values to match generated types) */
export interface CreatePurchaseInput {
  supplierId?: string;
  purchaseDate?: string;
  totalAmount?: string;
  invoiceNumber?: string;
  notes?: string;
  receiptImageId?: string;
  items?: CreatePurchaseItemInput[];
}

/** Input for updating a purchase (uses string for monetary values to match generated types) */
export interface UpdatePurchaseInput {
  supplierId?: string;
  purchaseDate?: string;
  totalAmount?: string;
  invoiceNumber?: string;
  notes?: string;
  receiptImageId?: string;
}

/**
 * Purchase Service for managing supplier purchase orders
 * Extends generated PurchasesService for local-first operations with sync integration
 */
export class PurchaseService extends PurchasesService {
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
   * Find a purchase by ID with its items
   * Overrides parent to enrich with items joined from purchase_items table
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
    const storedTotal = parseFloat(purchase.totalAmount) || 0;

    if (
      itemsResult.rows.length > 0 &&
      Math.abs(storedTotal - calculatedTotal) > 0.009
    ) {
      await this.recalculateTotal(id);
      purchase.totalAmount = this.normalizeCurrency(calculatedTotal);
    }

    const normalizedItems = itemsResult.rows.map((item) => ({
      ...item,
      quantity: this.normalizeWeight(item.quantity) ?? "0",
      unitCost: this.normalizeCurrency(item.unitCost),
      totalCost: this.normalizeCurrency(item.totalCost),
    }));

    return {
      ...purchase,
      totalAmount: this.normalizeCurrency(purchase.totalAmount),
      items: normalizedItems,
    };
  }

  /**
   * Find all purchases for the current business (excluding drafts)
   * Overrides parent to recalculate totals from items
   */
  async findByBusiness(): Promise<Purchase[]> {
    const result = await this.pg.query<Purchase>(
      `SELECT * FROM purchases
       WHERE business_id = $1 AND status != 'draft'
       ORDER BY purchase_date DESC NULLS LAST, created_at DESC`,
      [this.businessId]
    );

    for (const purchase of result.rows) {
      const itemsResult = await this.pg.query<{ total: string }>(
        `SELECT COALESCE(SUM(CAST(total_cost AS DECIMAL)), 0) as total
         FROM purchase_items WHERE purchase_id = $1 AND business_id = $2`,
        [purchase.id, this.businessId]
      );
      const calculatedTotal = parseFloat(itemsResult.rows[0]?.total || "0");
      const storedTotal = parseFloat(purchase.totalAmount) || 0;

      if (Math.abs(storedTotal - calculatedTotal) > 0.009) {
        await this.recalculateTotal(purchase.id);
        purchase.totalAmount = this.normalizeCurrency(calculatedTotal);
      }
    }

    return result.rows.map((purchase) => ({
      ...purchase,
      totalAmount: this.normalizeCurrency(purchase.totalAmount),
    }));
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

    for (const purchase of result.rows) {
      const itemsResult = await this.pg.query<{ total: string }>(
        `SELECT COALESCE(SUM(CAST(total_cost AS DECIMAL)), 0) as total
         FROM purchase_items WHERE purchase_id = $1 AND business_id = $2`,
        [purchase.id, this.businessId]
      );
      const calculatedTotal = parseFloat(itemsResult.rows[0]?.total || "0");
      const storedTotal = parseFloat(purchase.totalAmount) || 0;

      if (Math.abs(storedTotal - calculatedTotal) > 0.009) {
        await this.recalculateTotal(purchase.id);
        purchase.totalAmount = this.normalizeCurrency(calculatedTotal);
      }
    }

    return result.rows.map((purchase) => ({
      ...purchase,
      totalAmount: this.normalizeCurrency(purchase.totalAmount),
    }));
  }

  /**
   * Create a new purchase with items atomically
   * Uses FK reference (purchase_id) in item payload instead of syncGroupId
   */
  async createWithItems(input: CreatePurchaseInput = {}): Promise<PurchaseWithItems> {
    const id = this.generateId();
    const now = this.now();

    // Calculate total from items if provided
    const totalAmount = input.items?.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0
    ) ?? 0;

    // Use raw query for atomic insert (parent's create uses Drizzle which may not allow specifying id)
    await this.pg.query(
      `INSERT INTO purchases (
        id, business_id, supplier_id, purchase_date, total_amount,
        status, invoice_number, receipt_image_id, notes,
        sync_status, sync_attempts, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        this.businessId,
        input.supplierId ?? null,
        input.purchaseDate ?? null,
        this.normalizeCurrency(totalAmount),
        "draft",
        input.invoiceNumber ?? null,
        input.receiptImageId ?? null,
        input.notes ?? null,
        "pending",
        0,
        now,
        now,
      ]
    );

    // Queue sync for the purchase first (parent will be created before items)
    await this.queueSync("create", id, {
      supplierId: input.supplierId,
      purchaseDate: input.purchaseDate,
      totalAmount: this.normalizeCurrency(totalAmount),
      status: "draft",
      invoiceNumber: input.invoiceNumber,
      notes: input.notes,
      receiptImageId: input.receiptImageId,
    });

    // Insert and sync all items with FK reference (purchase_id in payload, NOT syncGroupId)
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
            this.normalizeCurrency(item.unitCost),
            this.normalizeCurrency(item.quantity * item.unitCost),
            "pending",
            0,
            now,
            now,
          ]
        );
        itemIds.push({ id: itemId, item });

        // Queue item sync with FK reference (purchase_id in payload)
        await this.queueSync("create", itemId, {
          purchaseId: id, // FK reference instead of syncGroupId
          productId: item.productId,
          variantId: item.variantId,
          unitId: item.unitId,
          quantity: String(item.quantity),
          unitCost: this.normalizeCurrency(item.unitCost),
          totalCost: this.normalizeCurrency(item.quantity * item.unitCost),
        }, undefined, "purchase_items");
      }
    }

    return (await this.findById(id)) as PurchaseWithItems;
  }

  /**
   * Override create to call createWithItems internally for atomic operations
   */
  async create(input: CreatePurchasesInput = {}): Promise<Purchase> {
    // Delegate to createWithItems for atomic operations
    const purchase = await this.createWithItems({
      supplierId: input.supplierId,
      purchaseDate: input.purchaseDate,
      totalAmount: input.totalAmount,
      invoiceNumber: input.invoiceNumber,
      notes: input.notes,
      receiptImageId: input.receiptImageId,
    });
    return purchase;
  }

  /**
   * Update a purchase (works for any status including drafts)
   * Overrides parent to use custom sync queue
   */
  async update(id: string, input: UpdatePurchaseInput): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Purchase not found: ${id}`);
    }

    const now = this.now();
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(now),
      syncStatus: SyncStatus.PENDING,
    };

    if (input.supplierId !== undefined) updateData.supplierId = input.supplierId;
    if (input.purchaseDate !== undefined) updateData.purchaseDate = input.purchaseDate;
    if (input.totalAmount !== undefined) updateData.totalAmount = this.normalizeCurrency(input.totalAmount);
    if (input.invoiceNumber !== undefined) updateData.invoiceNumber = input.invoiceNumber;
    if (input.receiptImageId !== undefined) updateData.receiptImageId = input.receiptImageId;
    if (input.notes !== undefined) updateData.notes = input.notes;

    await this.db
      .update(purchases)
      .set(updateData)
      .where(and(eq(purchases.id, id), eq(purchases.businessId, this.businessId)));

    // Queue sync with version for conflict detection
    await this.queueSync("update", id, input as Record<string, unknown>);
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
      if (!purchase.supplierId) {
        throw new Error("Se requiere un proveedor para confirmar la compra");
      }
      if (!purchase.purchaseDate) {
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
        syncStatus: SyncStatus.PENDING,
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

    // Delete items first
    for (const item of purchase.items) {
      await this.queueSync("delete", item.id, { purchaseId: id }, undefined, "purchase_items");
    }

    // Delete the purchase
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

    const now = this.now();
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
        this.normalizeCurrency(item.unitCost),
        this.normalizeCurrency(item.quantity * item.unitCost),
        "pending",
        0,
        now,
        now,
      ]
    );

    // Recalculate total
    await this.recalculateTotal(purchaseId);

    // Sync item with FK reference (purchase_id in payload)
    await this.queueSync("create", itemId, {
      purchaseId,
      productId: item.productId,
      variantId: item.variantId,
      unitId: item.unitId,
      quantity: String(item.quantity),
      unitCost: this.normalizeCurrency(item.unitCost),
      totalCost: this.normalizeCurrency(item.quantity * item.unitCost),
    }, undefined, "purchase_items");
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
      syncStatus: SyncStatus.PENDING,
    };

    if (data.quantity !== undefined) {
      updateData.quantity = String(data.quantity);
    }
    if (data.unitCost !== undefined) {
      updateData.unitCost = this.normalizeCurrency(data.unitCost);
    }

    // Calculate new total cost if both values are provided
    if (data.quantity !== undefined && data.unitCost !== undefined) {
      updateData.totalCost = this.normalizeCurrency(data.quantity * data.unitCost);
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

    // Sync with FK reference
    await this.queueSync("update", itemId, {
      purchaseId,
      quantity: data.quantity !== undefined ? String(data.quantity) : undefined,
      unitCost: data.unitCost !== undefined ? this.normalizeCurrency(data.unitCost) : undefined,
    }, undefined, "purchase_items");
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

    // Sync with FK reference
    await this.queueSync("delete", itemId, { purchaseId }, undefined, "purchase_items");
  }

  /**
   * Add an item to an existing purchase (for editing confirmed purchases)
   * Does NOT check for draft status - use with caution
   */
  async addItemToPurchase(purchaseId: string, item: CreatePurchaseItemInput): Promise<void> {
    const now = this.now();
    const itemId = this.generateId();

    await this.pg.exec("BEGIN");
    try {
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
          this.normalizeCurrency(item.unitCost),
          this.normalizeCurrency(item.quantity * item.unitCost),
          "pending",
          0,
          now,
          now,
        ]
      );

      await this.recalculateTotal(purchaseId);
      await this.pg.exec("COMMIT");
    } catch (err) {
      await this.pg.exec("ROLLBACK");
      throw err;
    }

    // Sync with FK reference
    await this.queueSync("create", itemId, {
      purchaseId,
      productId: item.productId,
      variantId: item.variantId,
      unitId: item.unitId,
      quantity: String(item.quantity),
      unitCost: this.normalizeCurrency(item.unitCost),
      totalCost: this.normalizeCurrency(item.quantity * item.unitCost),
    }, undefined, "purchase_items");
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
    const now = this.now();
    const totalCost = data.totalCost ?? (data.quantity && data.unitCost ? data.quantity * data.unitCost : undefined);

    await this.pg.exec("BEGIN");
    try {
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
          data.unitCost !== undefined ? this.normalizeCurrency(data.unitCost) : null,
          totalCost !== undefined ? this.normalizeCurrency(totalCost) : null,
          now,
          "pending",
          itemId,
          purchaseId,
        ]
      );

      await this.recalculateTotal(purchaseId);
      await this.pg.exec("COMMIT");
    } catch (err) {
      await this.pg.exec("ROLLBACK");
      throw err;
    }

    // Sync with FK reference
    await this.queueSync("update", itemId, {
      purchaseId,
      quantity: data.quantity !== undefined ? String(data.quantity) : undefined,
      unitCost: data.unitCost !== undefined ? this.normalizeCurrency(data.unitCost) : undefined,
      totalCost: totalCost !== undefined ? this.normalizeCurrency(totalCost) : undefined,
    }, undefined, "purchase_items");
  }

  /**
   * Delete an item from a purchase (for editing confirmed purchases)
   * Does NOT check for draft status - use with caution
   */
  async deleteItemFromPurchase(purchaseId: string, itemId: string): Promise<void> {
    const now = this.now();

    await this.pg.exec("BEGIN");
    try {
      await this.pg.query(
        `DELETE FROM purchase_items WHERE id = $1 AND purchase_id = $2`,
        [itemId, purchaseId]
      );

      await this.recalculateTotal(purchaseId);
      await this.pg.exec("COMMIT");
    } catch (err) {
      await this.pg.exec("ROLLBACK");
      throw err;
    }

    // Sync with FK reference
    await this.queueSync("delete", itemId, { purchaseId }, undefined, "purchase_items");
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
        syncStatus: SyncStatus.PENDING,
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
