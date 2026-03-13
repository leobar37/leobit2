/**
 * Inventory Service
 * Read-only inventory access for vendors with admin write operations
 * Inventory is managed by backend through purchases/sales, vendors only read
 */

import type { PGlite } from "@electric-sql/pglite";
import { BaseService, type EntityType } from "./base-service";
import { SyncService } from "../sync/sync-service";

/** Inventory item for a product */
export interface InventoryItem {
  id: string;
  productId: string;
  quantity: string;
  updatedAt: string;
}

/** Inventory item for a product variant */
export interface VariantInventoryItem {
  id: string;
  variantId: string;
  quantity: string;
  updatedAt: string;
}

/** Result of stock validation */
export interface StockValidationResult {
  available: boolean;
  requestedQty: number;
  availableQty: number;
  productId?: string;
  variantId?: string;
}

/**
 * Inventory Service
 * Provides read-only access to inventory for vendors
 * Stock is updated through purchases and sales operations
 */
export class InventoryService extends BaseService {
  constructor(pg: PGlite, syncService: SyncService, businessId: string) {
    super(pg, syncService, businessId);
  }

  /**
   * Returns the entity type for this service
   */
  getEntityType(): EntityType {
    return "inventory";
  }

  /**
   * Returns the ID prefix for this entity
   */
  getEntityPrefix(): string {
    return "inv";
  }

  // ==================== READ-ONLY METHODS (For Vendors) ====================

  /**
   * Get inventory for a specific product
   * @param productId - Product UUID
   * @returns Inventory item or null if not found
   */
  async getInventoryForProduct(productId: string): Promise<InventoryItem | null> {
    const result = await this.pg.query<{
      id: string;
      product_id: string;
      quantity: string;
      updated_at: string;
    }>(
      `SELECT id, product_id, quantity, updated_at
       FROM inventory
       WHERE product_id = $1`,
      [productId]
    );

    if (!result.rows[0]) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      productId: row.product_id,
      quantity: row.quantity,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Get inventory for a specific variant
   * @param variantId - Variant UUID
   * @returns Inventory item or null if not found
   */
  async getInventoryForVariant(variantId: string): Promise<VariantInventoryItem | null> {
    const result = await this.pg.query<{
      id: string;
      variant_id: string;
      quantity: string;
      updated_at: string;
    }>(
      `SELECT id, variant_id, quantity, updated_at
       FROM variant_inventory
       WHERE variant_id = $1`,
      [variantId]
    );

    if (!result.rows[0]) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      variantId: row.variant_id,
      quantity: row.quantity,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Get all inventory items for the business (via product business_id)
   * @returns Array of inventory items
   */
  async getAllInventory(): Promise<InventoryItem[]> {
    const result = await this.pg.query<{
      id: string;
      product_id: string;
      quantity: string;
      updated_at: string;
    }>(
      `SELECT i.id, i.product_id, i.quantity, i.updated_at
       FROM inventory i
       INNER JOIN products p ON i.product_id = p.id
       WHERE p.business_id = $1
       ORDER BY i.updated_at DESC`,
      [this.businessId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      quantity: row.quantity,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Get all variant inventory items for the business
   * @returns Array of variant inventory items
   */
  async getAllVariantInventory(): Promise<VariantInventoryItem[]> {
    const result = await this.pg.query<{
      id: string;
      variant_id: string;
      quantity: string;
      updated_at: string;
    }>(
      `SELECT vi.id, vi.variant_id, vi.quantity, vi.updated_at
       FROM variant_inventory vi
       INNER JOIN product_variants pv ON vi.variant_id = pv.id
       WHERE pv.business_id = $1
       ORDER BY vi.updated_at DESC`,
      [this.businessId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      variantId: row.variant_id,
      quantity: row.quantity,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Validate if there's enough stock for a variant
   * @param variantId - Variant UUID
   * @param requestedQty - Quantity requested
   * @returns Validation result with availability status
   */
  async validateVariantStock(
    variantId: string,
    requestedQty: number
  ): Promise<StockValidationResult> {
    const inventory = await this.getInventoryForVariant(variantId);
    const availableQty = inventory ? parseFloat(inventory.quantity) : 0;

    return {
      available: availableQty >= requestedQty,
      requestedQty,
      availableQty,
      variantId,
    };
  }

  /**
   * Validate if there's enough stock for a product
   * @param productId - Product UUID
   * @param requestedQty - Quantity requested
   * @returns Validation result with availability status
   */
  async validateProductStock(
    productId: string,
    requestedQty: number
  ): Promise<StockValidationResult> {
    const inventory = await this.getInventoryForProduct(productId);
    const availableQty = inventory ? parseFloat(inventory.quantity) : 0;

    return {
      available: availableQty >= requestedQty,
      requestedQty,
      availableQty,
      productId,
    };
  }

  /**
   * Batch validate stock for multiple variants
   * Used when checking cart items before finalizing a sale
   * @param items - Array of variantId + requestedQty
   * @returns Array of validation results
   */
  async validateBatchStock(
    items: Array<{ variantId: string; requestedQty: number }>
  ): Promise<StockValidationResult[]> {
    const results: StockValidationResult[] = [];

    for (const item of items) {
      const result = await this.validateVariantStock(
        item.variantId,
        item.requestedQty
      );
      results.push(result);
    }

    return results;
  }
}
