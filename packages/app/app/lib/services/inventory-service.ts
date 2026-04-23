/**
 * Inventory Service
 * Read-only variant inventory access for vendors with admin write operations
 * Inventory is managed by backend through purchases/sales, vendors only read
 */

import type { SyncClientEngineLike } from "./base-service";
import { BaseService, type EntityType } from "./base-service";

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
  variantId?: string;
}

/**
 * Inventory Service
 * Provides read-only access to variant inventory for vendors
 * Stock is updated through purchases, sales, and distribution operations
 */
export class InventoryService extends BaseService {
  constructor(engine: SyncClientEngineLike) {
    super(engine);
  }

  /**
   * Returns the entity type for this service
   */
  getEntityType(): EntityType {
    return "variant_inventory";
  }

  /**
   * Returns the ID prefix for this entity
   */
  getEntityPrefix(): string {
    return "vinv";
  }

  // ==================== READ-ONLY METHODS (For Vendors) ====================

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
      quantity: this.normalizeWeightRequired(row.quantity),
      updatedAt: row.updated_at,
    };
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
      quantity: this.normalizeWeightRequired(row.quantity),
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
