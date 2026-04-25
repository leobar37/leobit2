/**
 * Product Service
 * Read-only product access for vendors with admin write operations
 * Products are managed by admin, vendors only read them
 * 
 * Migrated to extend ProductsService from generated code.
 * Variant management methods preserved for admin operations.
 */

import type { SyncClientEngineLike } from "./base-service";
import { eq, and, desc } from "drizzle-orm";
import { ProductsService, ProductVariantsService } from "~/lib/sync/generated/services";
import { SyncStatus } from "~/lib/sync/generated/schema";
import type { Products as Product, ProductVariants as ProductVariant } from "~/lib/sync/generated/schema";

// Re-export types for backward compatibility
export type { Product, ProductVariant };

/** Input for creating a product (admin only) */
export interface CreateProductInput {
  name: string;
  type?: "pollo" | "huevo" | "otro";
  unit?: "kg" | "unidad";
  basePrice: string;
  costPrice?: string;
  isActive?: boolean;
  imageId?: string;
  hasVariants?: boolean;
}

/** Input for updating a product (admin only) */
export interface UpdateProductInput {
  name?: string;
  type?: "pollo" | "huevo" | "otro";
  unit?: "kg" | "unidad";
  basePrice?: string;
  costPrice?: string;
  isActive?: boolean;
  imageId?: string;
  hasVariants?: boolean;
}

/** Input for creating a product variant (admin only) */
export interface CreateVariantInput {
  productId: string;
  name: string;
  sku?: string;
  unitQuantity: string;
  price: string;
  sortOrder?: number;
  isActive?: boolean;
  lowStockThreshold?: string;
  criticalStockThreshold?: string;
}

/** Input for updating a product variant (admin only) */
export interface UpdateVariantInput {
  name?: string;
  sku?: string;
  unitQuantity?: string;
  price?: string;
  sortOrder?: number;
  isActive?: boolean;
  lowStockThreshold?: string;
  criticalStockThreshold?: string;
}

/**
 * Product Service
 * Provides read-only access to this.tables.products for vendors
 * Admin operations queue sync to server
 * 
 * Extends ProductsService (generated) for CRUD operations.
 * Adds variant management and custom query methods.
 */
export class ProductService extends ProductsService {
  private variantsService: ProductVariantsService;

  constructor(engine: SyncClientEngineLike) {
    super(engine);
    this.variantsService = new ProductVariantsService(engine);
  }

  // ==================== ADDITIONAL READ METHODS ====================

  /**
   * Get this.tables.products filtered by type
   * @param type - Product type filter
   * @returns Array of this.tables.products matching the type
   */
  async findByType(type: "pollo" | "huevo" | "otro"): Promise<Product[]> {
    const result = await this.db
      .select()
      .from(this.tables.products)
      .where(and(eq(this.tables.products.businessId, this.businessId), eq(this.tables.products.type, type)))
      .orderBy(this.tables.products.name);

    return result as Product[];
  }

  /**
   * Get only active this.tables.products
   * @returns Array of active this.tables.products
   */
  async findActive(): Promise<Product[]> {
    const result = await this.db
      .select()
      .from(this.tables.products)
      .where(and(eq(this.tables.products.businessId, this.businessId), eq(this.tables.products.isActive, true)))
      .orderBy(this.tables.products.name);

    return result as Product[];
  }

  // ==================== VARIANT MANAGEMENT ====================

  /**
   * Get variants for a specific product
   * @param productId - Product UUID
   * @returns Array of product variants
   */
  async getVariants(productId: string): Promise<ProductVariant[]> {
    const result = await this.db
      .select()
      .from(this.tables.productVariants)
      .where(and(eq(this.tables.productVariants.productId, productId), eq(this.tables.productVariants.isActive, true)))
      .orderBy(this.tables.productVariants.sortOrder, this.tables.productVariants.name);

    return result as ProductVariant[];
  }

  /**
   * Find a variant by ID
   * @param variantId - Variant UUID
   * @returns ProductVariant or null
   */
  async findVariantById(variantId: string): Promise<ProductVariant | null> {
    const result = await this.db
      .select()
      .from(this.tables.productVariants)
      .where(eq(this.tables.productVariants.id, variantId))
      .limit(1);

    return (result[0] as ProductVariant) || null;
  }

  /**
   * Create a product variant (admin only)
   * Queues sync operation to server
   * Uses FK reference (productId in payload) for ordering
   * @param input - Variant creation data
   * @returns Created variant
   */
  async createVariant(input: CreateVariantInput): Promise<ProductVariant> {
    return await this.variantsService.create({
      productId: input.productId,
      name: input.name,
      sku: input.sku,
      unitQuantity: input.unitQuantity,
      price: input.price,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    });
  }

  /**
   * Update a product variant (admin only)
   * Queues sync operation to server
   * @param variantId - Variant UUID
   * @param input - Variant update data
   */
  async updateVariant(variantId: string, input: UpdateVariantInput): Promise<void> {
    await this.variantsService.update(variantId, {
      name: input.name,
      sku: input.sku,
      unitQuantity: input.unitQuantity,
      price: input.price,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    });
  }

  /**
   * Delete a variant (admin only)
   * Queues sync operation to server
   * @param variantId - Variant UUID
   */
  async deleteVariant(variantId: string): Promise<void> {
    await this.variantsService.delete(variantId);
  }

  // ==================== ADMIN CREATE (with auto-variant) ====================

  /**
   * Create a new product (admin only)
   * Queues sync operation to server
   * If hasVariants is false, auto-creates a default variant with the product name
   * 
   * Note: We implement create ourselves because the generated CreateProductsInput
   * doesn't include costPrice field which exists in the database schema.
   * 
   * @param input - Product creation data
   * @returns Created product
   */
  async create(input: CreateProductInput): Promise<Product> {
    const id = this.generateId();
    const now = new Date(this.now());

    // Insert into local PGlite using Drizzle
    const entity = {
      id,
      businessId: this.businessId,
      name: input.name,
      type: input.type ?? "pollo",
      unit: input.unit ?? "kg",
      basePrice: input.basePrice,
      costPrice: input.costPrice ?? "0",
      isActive: input.isActive ?? true,
      imageId: input.imageId ?? null,
      hasVariants: input.hasVariants ?? false,
      syncStatus: SyncStatus.PENDING,
      syncAttempts: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(this.tables.products).values(entity);

    // Queue for server sync
    await this.queueSync("create", id, {
      name: input.name,
      type: input.type,
      unit: input.unit,
      basePrice: input.basePrice,
      costPrice: input.costPrice,
      isActive: input.isActive,
      imageId: input.imageId,
      hasVariants: input.hasVariants,
    });

    // If product does NOT have variants, auto-create a default variant so it can be sold
    if (input.hasVariants === false || input.hasVariants === undefined) {
      await this.createVariant({
        productId: id,
        name: input.name,
        unitQuantity: "1",
        price: input.basePrice,
        isActive: true,
        sortOrder: 0,
      });
    }

    // Return the product
    return (await this.findById(id))!;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Check if a product has variants
   * @param productId - Product UUID
   * @returns true if product has variants
   */
  private async checkHasVariants(productId: string): Promise<boolean> {
    const variants = await this.getVariants(productId);
    return variants.length > 0;
  }
}
