/**
 * Product Service
 * Read-only product access for vendors with admin write operations
 * Products are managed by admin, vendors only read them
 */

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { eq, and, desc, sql } from "drizzle-orm";
import { BaseService, type EntityType, type BaseCreateInput, type BaseUpdateInput } from "./base-service";
import { SyncService } from "../sync/sync-service";
import { SyncStatus, products, productVariants } from "@avileo/shared";

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
  hasVariants?: boolean;
}

/** Input for updating a product (admin only) */
export interface UpdateProductInput extends BaseUpdateInput {
  name?: string;
  type?: ProductType;
  unit?: ProductUnit;
  basePrice?: string;
  isActive?: boolean;
  imageId?: string;
  syncPriceToVariants?: boolean;
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
    businessId: string,
    businessUserId: string
  ) {
    super(pg, db, syncService, businessId, businessUserId);
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
    const result = await this.db
      .select({
        id: products.id,
        businessId: products.businessId,
        name: products.name,
        type: products.type,
        unit: products.unit,
        basePrice: products.basePrice,
        isActive: products.isActive,
        imageId: products.imageId,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(and(eq(products.id, id), eq(products.businessId, this.businessId)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    const hasVariants = await this.checkHasVariants(row.id);

    return {
      ...row,
      hasVariants,
    };
  }

  /**
   * Get all products for the business
   * @returns Array of products
   */
  async findByBusiness(): Promise<Product[]> {
    const result = await this.db
      .select({
        id: products.id,
        businessId: products.businessId,
        name: products.name,
        type: products.type,
        unit: products.unit,
        basePrice: products.basePrice,
        isActive: products.isActive,
        imageId: products.imageId,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(eq(products.businessId, this.businessId))
      .orderBy(products.name);

    // Check hasVariants for each product
    const mappedProducts: Product[] = [];
    for (const row of result) {
      const hasVariants = await this.checkHasVariants(row.id);
      mappedProducts.push({
        ...row,
        hasVariants,
      });
    }

    return mappedProducts;
  }

  /**
   * Get products filtered by type
   * @param type - Product type filter
   * @returns Array of products matching the type
   */
  async findByType(type: ProductType): Promise<Product[]> {
    const result = await this.db
      .select({
        id: products.id,
        businessId: products.businessId,
        name: products.name,
        type: products.type,
        unit: products.unit,
        basePrice: products.basePrice,
        isActive: products.isActive,
        imageId: products.imageId,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(and(eq(products.businessId, this.businessId), eq(products.type, type)))
      .orderBy(products.name);

    const mappedProducts: Product[] = [];
    for (const row of result) {
      const hasVariants = await this.checkHasVariants(row.id);
      mappedProducts.push({
        ...row,
        hasVariants,
      });
    }

    return mappedProducts;
  }

  /**
   * Get only active products
   * @returns Array of active products
   */
  async findActive(): Promise<Product[]> {
    const result = await this.db
      .select({
        id: products.id,
        businessId: products.businessId,
        name: products.name,
        type: products.type,
        unit: products.unit,
        basePrice: products.basePrice,
        isActive: products.isActive,
        imageId: products.imageId,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(and(eq(products.businessId, this.businessId), eq(products.isActive, true)))
      .orderBy(products.name);

    const mappedProducts: Product[] = [];
    for (const row of result) {
      const hasVariants = await this.checkHasVariants(row.id);
      mappedProducts.push({
        ...row,
        hasVariants,
      });
    }

    return mappedProducts;
  }

  /**
   * Get variants for a specific product
   * @param productId - Product UUID
   * @returns Array of product variants
   */
  async getVariants(productId: string): Promise<ProductVariant[]> {
    const result = await this.db
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        name: productVariants.name,
        sku: productVariants.sku,
        unitQuantity: productVariants.unitQuantity,
        price: productVariants.price,
        sortOrder: productVariants.sortOrder,
        isActive: productVariants.isActive,
        syncStatus: productVariants.syncStatus,
        syncAttempts: productVariants.syncAttempts,
        createdAt: productVariants.createdAt,
        updatedAt: productVariants.updatedAt,
      })
      .from(productVariants)
      .where(and(eq(productVariants.productId, productId), eq(productVariants.isActive, true)))
      .orderBy(productVariants.sortOrder, productVariants.name);

    return result;
  }

  async findVariantById(variantId: string): Promise<ProductVariant | null> {
    const result = await this.db
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        name: productVariants.name,
        sku: productVariants.sku,
        unitQuantity: productVariants.unitQuantity,
        price: productVariants.price,
        sortOrder: productVariants.sortOrder,
        isActive: productVariants.isActive,
        syncStatus: productVariants.syncStatus,
        syncAttempts: productVariants.syncAttempts,
        createdAt: productVariants.createdAt,
        updatedAt: productVariants.updatedAt,
      })
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .limit(1);

    if (result.length === 0) return null;

    return result[0];
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
    const now = new Date(this.now());

    // Insert into local PGlite using Drizzle
    await this.db.insert(products).values({
      id,
      businessId: this.businessId,
      name: input.name,
      type: input.type,
      unit: input.unit,
      basePrice: input.basePrice,
      isActive: input.isActive ?? true,
      imageId: input.imageId ?? null,
      createdAt: now,
      updatedAt: now,
    });

    // Update sync status
    await this.updateSyncStatus("products", id, SyncStatus.PENDING);

    // Queue for server sync
    await this.queueSync("create", id, {
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
    // Build update object with only defined fields
    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.type !== undefined) {
      updateData.type = input.type;
    }
    if (input.unit !== undefined) {
      updateData.unit = input.unit;
    }
    if (input.basePrice !== undefined) {
      updateData.basePrice = input.basePrice;
    }
    if (input.isActive !== undefined) {
      updateData.isActive = input.isActive;
    }
    if (input.imageId !== undefined) {
      updateData.imageId = input.imageId ?? null;
    }

    // Always update updatedAt
    updateData.updatedAt = new Date(this.now());

    if (Object.keys(updateData).length === 1) {
      return;
    }

    // Execute update with Drizzle
    await this.db
      .update(products)
      .set(updateData)
      .where(and(eq(products.id, id), eq(products.businessId, this.businessId)));

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
    // Build update object with only defined fields
    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.sku !== undefined) {
      updateData.sku = input.sku ?? null;
    }
    if (input.unitQuantity !== undefined) {
      updateData.unitQuantity = input.unitQuantity;
    }
    if (input.price !== undefined) {
      updateData.price = input.price;
    }
    if (input.sortOrder !== undefined) {
      updateData.sortOrder = input.sortOrder;
    }
    if (input.isActive !== undefined) {
      updateData.isActive = input.isActive;
    }

    // Always update updatedAt
    updateData.updatedAt = new Date(this.now());

    if (Object.keys(updateData).length === 1) {
      return;
    }

    // Execute update with Drizzle
    await this.db.update(productVariants).set(updateData).where(eq(productVariants.id, variantId));

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
    const now = new Date(this.now());

    // Insert into local PGlite using Drizzle
    const newVariant = {
      id,
      productId: input.productId,
      name: input.name,
      sku: input.sku ?? null,
      unitQuantity: input.unitQuantity,
      price: input.price,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
      syncStatus: SyncStatus.PENDING,
      syncAttempts: 0,
      createdAt: now,
      updatedAt: now,
      businessId: this.businessId,
    };

    await this.db.insert(productVariants).values(newVariant);

    // Queue for server sync
    await this.queueSync("create", id, {
      productId: input.productId,
      name: input.name,
      sku: input.sku,
      unitQuantity: input.unitQuantity,
      price: input.price,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    });

    // Return created variant
    const result = await this.findVariantById(id);
    if (!result) {
      throw new Error("Failed to create variant");
    }
    return result;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Check if a product has variants
   * @param productId - Product UUID
   * @returns true if product has variants
   */
  private async checkHasVariants(productId: string): Promise<boolean> {
    const result = await this.db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(productVariants)
      .where(and(eq(productVariants.productId, productId), eq(productVariants.isActive, true)));

    return (result[0]?.count ?? 0) > 0;
  }
}
