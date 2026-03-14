/**
 * Product Service
 * Read-only product access for vendors with admin write operations
 * Products are managed by admin, vendors only read them
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { BaseService, type EntityType, type BaseCreateInput, type BaseUpdateInput } from "./base-service";
import { SyncService } from "../sync/sync-service";
import { SyncStatus } from "@avileo/shared";

/** Sync status type */
export type SyncStatusValue = (typeof SyncStatus)[keyof typeof SyncStatus];

/** Product type values */
export type ProductType = "pollo" | "huevo" | "otro";

/** Product unit values */
export type ProductUnit = "kg" | "unidad";

/**
 * Product entity type
 * Products are synced from server (read-only for vendors)
 */
export interface Product {
  id: string;
  businessId: string;
  name: string;
  type: ProductType;
  unit: ProductUnit;
  basePrice: string;
  isActive: boolean;
  imageId: string | null;
  createdAt: string;
  /** Derived field - true if product has variants */
  hasVariants?: boolean;
  /** Sync fields - may be present when data comes from certain sources */
  syncStatus?: SyncStatusValue;
  syncAttempts?: number;
  updatedAt?: string;
}

/**
 * Product variant entity type
 */
export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  unitQuantity: string;
  price: string;
  sortOrder: number;
  isActive: boolean;
  syncStatus: SyncStatusValue;
  syncAttempts: number;
  createdAt: string;
  updatedAt: string;
  /** Optional inventory info - populated when joined with variant_inventory */
  inventory?: {
    id: string;
    variantId: string;
    quantity: string;
    updatedAt: string;
  };
}

/** Input for creating a product (admin only) */
export interface CreateProductInput extends BaseCreateInput {
  name: string;
  type: ProductType;
  unit: ProductUnit;
  basePrice: string;
  isActive?: boolean;
  imageId?: string;
}

/** Input for updating a product (admin only) */
export interface UpdateProductInput extends BaseUpdateInput {
  name?: string;
  type?: ProductType;
  unit?: ProductUnit;
  basePrice?: string;
  isActive?: boolean;
  imageId?: string;
}

/** Input for creating a product variant (admin only) */
export interface CreateVariantInput extends BaseCreateInput {
  productId: string;
  name: string;
  sku?: string;
  unitQuantity: string;
  price: string;
  sortOrder?: number;
  isActive?: boolean;
}

/** Input for updating a product variant (admin only) */
export interface UpdateVariantInput extends BaseUpdateInput {
  name?: string;
  sku?: string;
  unitQuantity?: string;
  price?: string;
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * Product Service
 * Provides read-only access to products for vendors
 * Admin operations queue sync to server
 */
export class ProductService extends BaseService {
  constructor(
    pg: PGlite,
    db: ReturnType<typeof drizzle>,
    syncService: SyncService,
    businessId: string
  ) {
    super(pg, db, syncService, businessId);
  }

  /**
   * Returns the entity type for this service
   */
  getEntityType(): EntityType {
    return "products";
  }

  /**
   * Returns the ID prefix for this entity
   */
  getEntityPrefix(): string {
    return "prod";
  }

  // ==================== READ-ONLY METHODS (For Vendors) ====================

  /**
   * Find a product by ID
   * @param id - Product UUID
   * @returns Product or null if not found
   */
  async findById(id: string): Promise<Product | null> {
    const result = await this.pg.query<{
      id: string;
      business_id: string;
      name: string;
      type: ProductType;
      unit: ProductUnit;
      base_price: string;
      is_active: boolean;
      image_id: string | null;
      created_at: string;
    }>(
      `SELECT id, business_id, name, type, unit, base_price, is_active, image_id, created_at
       FROM products
       WHERE id = $1 AND business_id = $2`,
      [id, this.businessId]
    );

    if (!result.rows[0]) {
      return null;
    }

    const row = result.rows[0];
    const hasVariants = await this.checkHasVariants(row.id);

    return {
      id: row.id,
      businessId: row.business_id,
      name: row.name,
      type: row.type,
      unit: row.unit,
      basePrice: row.base_price,
      isActive: row.is_active,
      imageId: row.image_id,
      createdAt: row.created_at,
      hasVariants,
    };
  }

  /**
   * Get all products for the business
   * @returns Array of products
   */
  async findByBusiness(): Promise<Product[]> {
    const result = await this.pg.query<{
      id: string;
      business_id: string;
      name: string;
      type: ProductType;
      unit: ProductUnit;
      base_price: string;
      is_active: boolean;
      image_id: string | null;
      created_at: string;
    }>(
      `SELECT id, business_id, name, type, unit, base_price, is_active, image_id, created_at
       FROM products
       WHERE business_id = $1
       ORDER BY name ASC`,
      [this.businessId]
    );

    // Check hasVariants for each product
    const products: Product[] = [];
    for (const row of result.rows) {
      const hasVariants = await this.checkHasVariants(row.id);
      products.push({
        id: row.id,
        businessId: row.business_id,
        name: row.name,
        type: row.type,
        unit: row.unit,
        basePrice: row.base_price,
        isActive: row.is_active,
        imageId: row.image_id,
        createdAt: row.created_at,
        hasVariants,
      });
    }

    return products;
  }

  /**
   * Get products filtered by type
   * @param type - Product type filter
   * @returns Array of products matching the type
   */
  async findByType(type: ProductType): Promise<Product[]> {
    const result = await this.pg.query<{
      id: string;
      business_id: string;
      name: string;
      type: ProductType;
      unit: ProductUnit;
      base_price: string;
      is_active: boolean;
      image_id: string | null;
      created_at: string;
    }>(
      `SELECT id, business_id, name, type, unit, base_price, is_active, image_id, created_at
       FROM products
       WHERE business_id = $1 AND type = $2
       ORDER BY name ASC`,
      [this.businessId, type]
    );

    const products: Product[] = [];
    for (const row of result.rows) {
      const hasVariants = await this.checkHasVariants(row.id);
      products.push({
        id: row.id,
        businessId: row.business_id,
        name: row.name,
        type: row.type,
        unit: row.unit,
        basePrice: row.base_price,
        isActive: row.is_active,
        imageId: row.image_id,
        createdAt: row.created_at,
        hasVariants,
      });
    }

    return products;
  }

  /**
   * Get only active products
   * @returns Array of active products
   */
  async findActive(): Promise<Product[]> {
    const result = await this.pg.query<{
      id: string;
      business_id: string;
      name: string;
      type: ProductType;
      unit: ProductUnit;
      base_price: string;
      is_active: boolean;
      image_id: string | null;
      created_at: string;
    }>(
      `SELECT id, business_id, name, type, unit, base_price, is_active, image_id, created_at
       FROM products
       WHERE business_id = $1 AND is_active = true
       ORDER BY name ASC`,
      [this.businessId]
    );

    const products: Product[] = [];
    for (const row of result.rows) {
      const hasVariants = await this.checkHasVariants(row.id);
      products.push({
        id: row.id,
        businessId: row.business_id,
        name: row.name,
        type: row.type,
        unit: row.unit,
        basePrice: row.base_price,
        isActive: row.is_active,
        imageId: row.image_id,
        createdAt: row.created_at,
        hasVariants,
      });
    }

    return products;
  }

  /**
   * Get variants for a specific product
   * @param productId - Product UUID
   * @returns Array of product variants
   */
  async getVariants(productId: string): Promise<ProductVariant[]> {
    const result = await this.pg.query<{
      id: string;
      product_id: string;
      name: string;
      sku: string | null;
      unit_quantity: string;
      price: string;
      sort_order: number;
      is_active: boolean;
      sync_status: SyncStatusValue;
      sync_attempts: number;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, product_id, name, sku, unit_quantity, price, sort_order, is_active,
              sync_status, sync_attempts, created_at, updated_at
       FROM product_variants
       WHERE product_id = $1 AND is_active = true
       ORDER BY sort_order ASC, name ASC`,
      [productId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      name: row.name,
      sku: row.sku,
      unitQuantity: row.unit_quantity,
      price: row.price,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      syncStatus: row.sync_status,
      syncAttempts: row.sync_attempts,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async findVariantById(variantId: string): Promise<ProductVariant | null> {
    const result = await this.pg.query<{
      id: string;
      product_id: string;
      name: string;
      sku: string | null;
      unit_quantity: string;
      price: string;
      sort_order: number;
      is_active: boolean;
      sync_status: SyncStatusValue;
      sync_attempts: number;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, product_id, name, sku, unit_quantity, price, sort_order, is_active,
              sync_status, sync_attempts, created_at, updated_at
       FROM product_variants
       WHERE id = $1`,
      [variantId]
    );

    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      productId: row.product_id,
      name: row.name,
      sku: row.sku,
      unitQuantity: row.unit_quantity,
      price: row.price,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      syncStatus: row.sync_status,
      syncAttempts: row.sync_attempts,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ==================== ADMIN METHODS (Write with Sync) ====================

  /**
   * Create a new product (admin only)
   * Queues sync operation to server
   * @param input - Product creation data
   * @returns Created product
   */
  async create(input: CreateProductInput): Promise<Product> {
    const id = this.generateId();
    const now = this.now();

    // Insert into local PGlite using parameterized query
    await this.pg.exec(
      `INSERT INTO products (id, business_id, name, type, unit, base_price, is_active, image_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        this.businessId,
        input.name,
        input.type,
        input.unit,
        input.basePrice,
        input.isActive ?? true,
        input.imageId ?? null,
        now,
      ]
    );

    // Update sync status
    await this.updateSyncStatus("products", id, SyncStatus.PENDING);

    // Queue for server sync
    await this.queueSync("insert", id, {
      name: input.name,
      type: input.type,
      unit: input.unit,
      basePrice: input.basePrice,
      isActive: input.isActive ?? true,
      imageId: input.imageId,
    });

    return (await this.findById(id))!;
  }

  /**
   * Update an existing product (admin only)
   * Queues sync operation to server
   * @param id - Product UUID
   * @param input - Product update data
   */
  async update(id: string, input: UpdateProductInput): Promise<void> {
    // Build dynamic update query with parameters
    const updates: string[] = [];
    const params: (string | boolean | null)[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(input.name);
    }
    if (input.type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      params.push(input.type);
    }
    if (input.unit !== undefined) {
      updates.push(`unit = $${paramIndex++}`);
      params.push(input.unit);
    }
    if (input.basePrice !== undefined) {
      updates.push(`base_price = $${paramIndex++}`);
      params.push(input.basePrice);
    }
    if (input.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(input.isActive);
    }
    if (input.imageId !== undefined) {
      updates.push(`image_id = $${paramIndex++}`);
      params.push(input.imageId ?? null);
    }

    if (updates.length === 0) {
      return;
    }

    const now = this.now();
    updates.push(`updated_at = $${paramIndex++}`);
    params.push(now);

    // Add id and businessId as last parameters
    params.push(id);
    params.push(this.businessId);

    // Execute update
    await this.pg.exec(
      `UPDATE products SET ${updates.join(", ")} WHERE id = $${paramIndex++} AND business_id = $${paramIndex}`,
      params
    );

    // Update sync status
    await this.updateSyncStatus("products", id, SyncStatus.PENDING);

    // Queue for server sync
    await this.queueSync("update", id, input);
  }

  /**
   * Update a product variant (admin only)
   * Queues sync operation to server
   * @param variantId - Variant UUID
   * @param input - Variant update data
   */
  async updateVariant(variantId: string, input: UpdateVariantInput): Promise<void> {
    // Build dynamic update query with parameters
    const updates: string[] = [];
    const params: (string | number | boolean | null)[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(input.name);
    }
    if (input.sku !== undefined) {
      updates.push(`sku = $${paramIndex++}`);
      params.push(input.sku ?? null);
    }
    if (input.unitQuantity !== undefined) {
      updates.push(`unit_quantity = $${paramIndex++}`);
      params.push(input.unitQuantity);
    }
    if (input.price !== undefined) {
      updates.push(`price = $${paramIndex++}`);
      params.push(input.price);
    }
    if (input.sortOrder !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      params.push(input.sortOrder);
    }
    if (input.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(input.isActive);
    }

    if (updates.length === 0) {
      return;
    }

    const now = this.now();
    updates.push(`updated_at = $${paramIndex++}`);
    params.push(now);

    // Add variantId as last parameter
    params.push(variantId);

    // Execute update
    await this.pg.exec(
      `UPDATE product_variants SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      params
    );

    // Update sync status
    await this.updateSyncStatus("product_variants", variantId, SyncStatus.PENDING);

    // Queue for server sync
    await this.queueSync("update", variantId, {
      entity: "product_variants",
      ...input,
    });
  }

  async createVariant(input: CreateVariantInput): Promise<ProductVariant> {
    const id = this.generateId();
    const now = this.now();

    // Insert into local PGlite using parameterized query
    await this.pg.exec(
      `INSERT INTO product_variants (id, product_id, name, sku, unit_quantity, price, sort_order, is_active, sync_status, sync_attempts, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id,
        input.productId,
        input.name,
        input.sku ?? null,
        input.unitQuantity,
        input.price,
        input.sortOrder ?? 0,
        input.isActive ?? true,
        SyncStatus.PENDING,
        0,
        now,
        now,
      ]
    );

    // Queue for server sync
    await this.queueSync("insert", id, {
      productId: input.productId,
      name: input.name,
      sku: input.sku,
      unitQuantity: input.unitQuantity,
      price: input.price,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    });

    // Return created variant
    const result = await this.pg.query<{
      id: string;
      product_id: string;
      name: string;
      sku: string | null;
      unit_quantity: string;
      price: string;
      sort_order: number;
      is_active: boolean;
      sync_status: SyncStatusValue;
      sync_attempts: number;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT * FROM product_variants WHERE id = $1`,
      [id]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      productId: row.product_id,
      name: row.name,
      sku: row.sku,
      unitQuantity: row.unit_quantity,
      price: row.price,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      syncStatus: row.sync_status,
      syncAttempts: row.sync_attempts,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Check if a product has variants
   * @param productId - Product UUID
   * @returns true if product has variants
   */
  private async checkHasVariants(productId: string): Promise<boolean> {
    const result = await this.pg.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM product_variants WHERE product_id = $1 AND is_active = true`,
      [productId]
    );

    return parseInt(result.rows[0]?.count ?? "0", 10) > 0;
  }
}
