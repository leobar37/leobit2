/**
 * Purchase Service
 * Local-first service for managing supplier purchase orders with draft support
 * Extends generated PurchasesService to preserve atomic items operations
 */

import type { SyncClientEngineLike } from "./base-service";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  PurchasesService,
  type CreatePurchasesInput,
  type UpdatePurchasesInput,
} from "~/lib/sync/generated/services";
import { SyncStatus } from "~/lib/sync/generated/schema";
import type { Purchases as Purchase } from "~/lib/sync/generated/schema";

export type { Purchase };

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
  constructor(engine: SyncClientEngineLike) {
    super(engine);
  }

  /**
   * Find a purchase by ID with its items
   * Overrides parent to enrich with items joined from purchase_items table
   */
  async findById(id: string): Promise<PurchaseWithItems | null> {
    const result = await this.db
      .select()
      .from(this.tables.purchases)
      .where(
        and(
          eq(this.tables.purchases.id, id),
          eq(this.tables.purchases.businessId, this.businessId)
        )
      )
      .limit(1);
    const purchase = result[0];
    if (!purchase) return null;

    const itemsResult = await this.db
      .select({
        id: this.tables.purchaseItems.id,
        productId: this.tables.purchaseItems.productId,
        variantId: this.tables.purchaseItems.variantId,
        quantity: this.tables.purchaseItems.quantity,
        unitCost: this.tables.purchaseItems.unitCost,
        totalCost: this.tables.purchaseItems.totalCost,
        productName: sql<string>`COALESCE(${this.tables.products.name}, 'Producto')`,
        variantName: sql<string>`COALESCE(${this.tables.productVariants.name}, '')`,
      })
      .from(this.tables.purchaseItems)
      .leftJoin(this.tables.products, eq(this.tables.purchaseItems.productId, this.tables.products.id))
      .leftJoin(this.tables.productVariants, eq(this.tables.purchaseItems.variantId, this.tables.productVariants.id))
      .where(
        and(
          eq(this.tables.purchaseItems.purchaseId, id),
          eq(this.tables.purchaseItems.businessId, this.businessId)
        )
      )
      .orderBy(this.tables.purchaseItems.createdAt);

    const calculatedTotal = itemsResult.reduce((sum, item) => {
      return sum + (parseFloat(item.totalCost) || 0);
    }, 0);
    const storedTotal = parseFloat(purchase.totalAmount) || 0;

    if (
      itemsResult.length > 0 &&
      Math.abs(storedTotal - calculatedTotal) > 0.009
    ) {
      await this.recalculateTotal(id);
      purchase.totalAmount = this.normalizeCurrency(calculatedTotal);
    }

    const normalizedItems = itemsResult.map((item) => ({
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
   * Find all this.tables.purchases for the current business (excluding drafts)
   * Overrides parent to recalculate totals from items
   */
  async findByBusiness(): Promise<Purchase[]> {
    const result = await this.db
      .select()
      .from(this.tables.purchases)
      .where(
        and(
          eq(this.tables.purchases.businessId, this.businessId),
          sql`${this.tables.purchases.status} != 'draft'`
        )
      )
      .orderBy(desc(this.tables.purchases.purchaseDate), desc(this.tables.purchases.createdAt));

    for (const purchase of result) {
      const itemsResult = await this.db
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${this.tables.purchaseItems.totalCost} AS DECIMAL)), 0)`,
        })
        .from(this.tables.purchaseItems)
        .where(
          and(
            eq(this.tables.purchaseItems.purchaseId, purchase.id),
            eq(this.tables.purchaseItems.businessId, this.businessId)
          )
        );
      const calculatedTotal = parseFloat(itemsResult[0]?.total || "0");
      const storedTotal = parseFloat(purchase.totalAmount) || 0;

      if (Math.abs(storedTotal - calculatedTotal) > 0.009) {
        await this.recalculateTotal(purchase.id);
        purchase.totalAmount = this.normalizeCurrency(calculatedTotal);
      }
    }

    return result.map((purchase) => ({
      ...purchase,
      totalAmount: this.normalizeCurrency(purchase.totalAmount),
    }));
  }

  /**
   * Find all drafts for the current business
   */
  async findDrafts(): Promise<Purchase[]> {
    const result = await this.db
      .select()
      .from(this.tables.purchases)
      .where(
        and(
          eq(this.tables.purchases.businessId, this.businessId),
          eq(this.tables.purchases.status, "draft")
        )
      )
      .orderBy(desc(this.tables.purchases.updatedAt));
    return result;
  }

  /**
   * Find all this.tables.purchases for a specific supplier
   */
  async findBySupplier(supplierId: string): Promise<Purchase[]> {
    const result = await this.db
      .select()
      .from(this.tables.purchases)
      .where(
        and(
          eq(this.tables.purchases.supplierId, supplierId),
          eq(this.tables.purchases.businessId, this.businessId),
          sql`${this.tables.purchases.status} != 'draft'`
        )
      )
      .orderBy(desc(this.tables.purchases.purchaseDate), desc(this.tables.purchases.createdAt));

    for (const purchase of result) {
      const itemsResult = await this.db
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${this.tables.purchaseItems.totalCost} AS DECIMAL)), 0)`,
        })
        .from(this.tables.purchaseItems)
        .where(
          and(
            eq(this.tables.purchaseItems.purchaseId, purchase.id),
            eq(this.tables.purchaseItems.businessId, this.businessId)
          )
        );
      const calculatedTotal = parseFloat(itemsResult[0]?.total || "0");
      const storedTotal = parseFloat(purchase.totalAmount) || 0;

      if (Math.abs(storedTotal - calculatedTotal) > 0.009) {
        await this.recalculateTotal(purchase.id);
        purchase.totalAmount = this.normalizeCurrency(calculatedTotal);
      }
    }

    return result.map((purchase) => ({
      ...purchase,
      totalAmount: this.normalizeCurrency(purchase.totalAmount),
    }));
  }

  /**
   * Create a new purchase with items atomically
   */
  async createWithItems(input: CreatePurchaseInput = {}): Promise<PurchaseWithItems> {
    const id = this.generateId();
    const now = this.now();

    // Calculate total from items if provided
    const totalAmount = input.items?.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0
    ) ?? 0;

    // Insert using Drizzle ORM
    await this.db.insert(this.tables.purchases).values({
      id,
      businessId: this.businessId,
      supplierId: input.supplierId ?? null,
      purchaseDate: input.purchaseDate ?? null,
      totalAmount: this.normalizeCurrency(totalAmount),
      status: "draft",
      invoiceNumber: input.invoiceNumber ?? null,
      receiptImageId: input.receiptImageId ?? null,
      notes: input.notes ?? null,
      syncStatus: "pending",
      syncAttempts: 0,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });

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

    // Insert and sync all items with FK reference
    const itemIds: { id: string; item: CreatePurchaseItemInput }[] = [];
    if (input.items?.length) {
      for (const item of input.items) {
        const itemId = this.generateId();
        await this.db.insert(this.tables.purchaseItems).values({
          id: itemId,
          businessId: this.businessId,
          purchaseId: id,
          productId: item.productId,
          variantId: item.variantId ?? null,
          unitId: item.unitId ?? null,
          quantity: String(item.quantity),
          unitCost: this.normalizeCurrency(item.unitCost),
          totalCost: this.normalizeCurrency(item.quantity * item.unitCost),
          syncStatus: "pending",
          syncAttempts: 0,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        });
        itemIds.push({ id: itemId, item });

        // Queue item sync with FK reference
        await this.queueSync("create", itemId, {
          purchaseId: id,
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
      .update(this.tables.purchases)
      .set(updateData)
      .where(and(eq(this.tables.purchases.id, id), eq(this.tables.purchases.businessId, this.businessId)));

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
      .update(this.tables.purchases)
      .set({
        status,
        updatedAt: new Date(),
        syncStatus: SyncStatus.PENDING,
      })
      .where(and(eq(this.tables.purchases.id, id), eq(this.tables.purchases.businessId, this.businessId)));

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
      await this.queueSync("delete", item.id, { purchaseId: id }, "purchase_items");
    }

    // Delete the purchase
    await this.db
      .delete(this.tables.purchases)
      .where(and(eq(this.tables.purchases.id, id), eq(this.tables.purchases.businessId, this.businessId)));

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

    await this.db.insert(this.tables.purchaseItems).values({
      id: itemId,
      businessId: this.businessId,
      purchaseId,
      productId: item.productId,
      variantId: item.variantId ?? null,
      unitId: item.unitId ?? null,
      quantity: String(item.quantity),
      unitCost: this.normalizeCurrency(item.unitCost),
      totalCost: this.normalizeCurrency(item.quantity * item.unitCost),
      syncStatus: "pending",
      syncAttempts: 0,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });

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
      .update(this.tables.purchaseItems)
      .set(updateData)
      .where(and(
        eq(this.tables.purchaseItems.id, itemId),
        eq(this.tables.purchaseItems.purchaseId, purchaseId)
      ));

    // Recalculate total
    await this.recalculateTotal(purchaseId);

    // Sync with FK reference
    await this.queueSync("update", itemId, {
      purchaseId,
      quantity: data.quantity !== undefined ? String(data.quantity) : undefined,
      unitCost: data.unitCost !== undefined ? this.normalizeCurrency(data.unitCost) : undefined,
    }, "purchase_items");
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
      .delete(this.tables.purchaseItems)
      .where(and(
        eq(this.tables.purchaseItems.id, itemId),
        eq(this.tables.purchaseItems.purchaseId, purchaseId)
      ));

    // Recalculate total
    await this.recalculateTotal(purchaseId);

    // Sync with FK reference
    await this.queueSync("delete", itemId, { purchaseId }, "purchase_items");
  }

  /**
   * Add an item to an existing purchase (for editing confirmed this.tables.purchases)
   * Does NOT check for draft status - use with caution
   */
  async addItemToPurchase(purchaseId: string, item: CreatePurchaseItemInput): Promise<void> {
    const now = this.now();
    const itemId = this.generateId();

    await this.db.transaction(async (tx) => {
      await tx.insert(this.tables.purchaseItems).values({
        id: itemId,
        businessId: this.businessId,
        purchaseId,
        productId: item.productId,
        variantId: item.variantId ?? null,
        unitId: item.unitId ?? null,
        quantity: String(item.quantity),
        unitCost: this.normalizeCurrency(item.unitCost),
        totalCost: this.normalizeCurrency(item.quantity * item.unitCost),
        syncStatus: "pending",
        syncAttempts: 0,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      });

      await this.recalculateTotal(purchaseId);
    });

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
   * Update an item in a purchase (for editing confirmed this.tables.purchases)
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

    await this.db.transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(now),
        syncStatus: "pending",
      };
      if (data.quantity !== undefined) updateData.quantity = String(data.quantity);
      if (data.unitCost !== undefined) updateData.unitCost = this.normalizeCurrency(data.unitCost);
      if (totalCost !== undefined) updateData.totalCost = this.normalizeCurrency(totalCost);

      await tx.update(this.tables.purchaseItems)
        .set(updateData)
        .where(and(eq(this.tables.purchaseItems.id, itemId), eq(this.tables.purchaseItems.purchaseId, purchaseId)));

      await this.recalculateTotal(purchaseId);
    });

    // Sync with FK reference
    await this.queueSync("update", itemId, {
      purchaseId,
      quantity: data.quantity !== undefined ? String(data.quantity) : undefined,
      unitCost: data.unitCost !== undefined ? this.normalizeCurrency(data.unitCost) : undefined,
      totalCost: totalCost !== undefined ? this.normalizeCurrency(totalCost) : undefined,
    }, undefined, "purchase_items");
  }

  /**
   * Delete an item from a purchase (for editing confirmed this.tables.purchases)
   * Does NOT check for draft status - use with caution
   */
  async deleteItemFromPurchase(purchaseId: string, itemId: string): Promise<void> {
    const now = this.now();

    await this.db.transaction(async (tx) => {
      await tx
        .delete(this.tables.purchaseItems)
        .where(and(eq(this.tables.purchaseItems.id, itemId), eq(this.tables.purchaseItems.purchaseId, purchaseId)));

      await this.recalculateTotal(purchaseId);
    });

    // Sync with FK reference
    await this.queueSync("delete", itemId, { purchaseId }, "purchase_items");
  }

  /**
   * Recalculate the total amount of a purchase based on its items
   */
  private async recalculateTotal(purchaseId: string): Promise<void> {
    const result = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${this.tables.purchaseItems.totalCost} AS DECIMAL)), 0)`,
      })
      .from(this.tables.purchaseItems)
      .where(
        and(
          eq(this.tables.purchaseItems.purchaseId, purchaseId),
          eq(this.tables.purchaseItems.businessId, this.businessId)
        )
      );

    await this.db
      .update(this.tables.purchases)
      .set({
        totalAmount: result[0]?.total ?? "0",
        updatedAt: new Date(),
        syncStatus: SyncStatus.PENDING,
      })
      .where(
        and(eq(this.tables.purchases.id, purchaseId), eq(this.tables.purchases.businessId, this.businessId))
      );
  }
}

/**
 * Factory function to create a PurchaseService instance
 */
export function createPurchaseService(
  engine: SyncClientEngineLike
): PurchaseService {
  return new PurchaseService(engine);
}
