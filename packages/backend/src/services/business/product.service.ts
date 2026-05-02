import type { ProductRepository } from "../repository/product.repository";
import type { CategoryRepository } from "../repository/category.repository";
import type { ProductRecord } from "../repository/product.repository";
import type { ProductVariantRepository } from "../repository/product-variant.repository";
import type { RequestContext } from "../../context/request-context";
import { db } from "../../lib/db";
import { getTxid, type MutationResult } from "../../lib/txid";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../errors";

export class ProductService {
  constructor(
    private repository: ProductRepository,
    private variantRepo: ProductVariantRepository,
    private categoryRepo: CategoryRepository,
  ) {}

  async getProducts(
    ctx: RequestContext,
    filters?: {
      search?: string;
      categoryId?: string;
      uncategorized?: boolean;
      isActive?: boolean;
      limit?: number;
      offset?: number;
    }
  ) {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver productos");
    }

    if (filters?.categoryId && filters.uncategorized) {
      throw new ValidationError("No puede filtrar por categoría y sin categoría al mismo tiempo");
    }

    if (filters?.categoryId) {
      await this.assertCategoryExists(ctx, filters.categoryId);
    }

    return this.repository.findMany(ctx, {
      ...filters,
    });
  }

  async getProduct(ctx: RequestContext, id: string): Promise<ProductRecord> {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver productos");
    }

    const product = await this.repository.findById(ctx, id);
    if (!product) {
      throw new NotFoundError("Producto");
    }

    return product;
  }

  async createProduct(
    ctx: RequestContext,
    data: {
      name: string;
      categoryId?: string | null;
      unit: "kg" | "unidad";
      basePrice: number;
      costPrice?: number;
      isActive?: boolean;
      imageId?: string;
      hasVariants?: boolean;
    }
  ): Promise<MutationResult<ProductRecord>> {
    if (!ctx.hasPermission("products.manage")) {
      throw new ForbiddenError("No tiene permisos para crear productos");
    }

    if (!data.name || data.name.length < 2) {
      throw new ValidationError("El nombre debe tener al menos 2 caracteres");
    }

    if (data.basePrice < 0) {
      throw new ValidationError("El precio no puede ser negativo");
    }

    if (data.costPrice !== undefined && data.costPrice < 0) {
      throw new ValidationError("El costo no puede ser negativo");
    }

    if (data.costPrice !== undefined && data.costPrice > data.basePrice) {
      throw new ValidationError("El costo no puede ser mayor que el precio de venta");
    }

    const categoryId = data.categoryId ? await this.assertCategoryExists(ctx, data.categoryId) : null;

    return db.transaction(async (tx) => {
      const product = await this.repository.create(ctx, {
        name: data.name,
        categoryId,
        unit: data.unit,
        basePrice: data.basePrice.toString(),
        costPrice: data.costPrice?.toString() ?? "0",
        isActive: data.isActive ?? true,
        imageId: data.imageId,
        hasVariants: data.hasVariants ?? false,
      }, tx);

      // Only create default variant if product does NOT have variants
      if (data.hasVariants !== true) {
        await this.variantRepo.create(ctx, {
          productId: product.id,
          name: "Estándar",
          unitQuantity: "1",
          price: data.basePrice.toString(),
          costPrice: data.costPrice?.toString() ?? "0",
          isActive: true,
        }, tx);
      }

      return {
        data: product,
        txid: await getTxid(tx),
      };
    });
  }

  async updateProduct(
    ctx: RequestContext,
    id: string,
    data: {
      name?: string;
      categoryId?: string | null;
      unit?: "kg" | "unidad";
      basePrice?: number;
      costPrice?: number;
      isActive?: boolean;
      imageId?: string | null;
    }
  ): Promise<MutationResult<ProductRecord>> {
    if (!ctx.hasPermission("products.manage")) {
      throw new ForbiddenError("No tiene permisos para editar productos");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Producto");
    }

    if (data.name !== undefined && data.name.length < 2) {
      throw new ValidationError("El nombre debe tener al menos 2 caracteres");
    }

    if (data.basePrice !== undefined && data.basePrice < 0) {
      throw new ValidationError("El precio no puede ser negativo");
    }

    if (data.costPrice !== undefined && data.costPrice < 0) {
      throw new ValidationError("El costo no puede ser negativo");
    }

    if (data.costPrice !== undefined && data.basePrice !== undefined && data.costPrice > data.basePrice) {
      throw new ValidationError("El costo no puede ser mayor que el precio de venta");
    }

    const categoryId = await this.resolveCategoryUpdate(ctx, data);

    return db.transaction(async (tx) => {
      const updated = await this.repository.update(ctx, id, {
        name: data.name,
        ...(categoryId.shouldUpdate ? { categoryId: categoryId.value } : {}),
        unit: data.unit,
        basePrice: data.basePrice?.toString(),
        costPrice: data.costPrice?.toString(),
        isActive: data.isActive,
        imageId: data.imageId,
      }, tx);

      if (!updated) {
        throw new NotFoundError("Producto");
      }

      return {
        data: updated,
        txid: await getTxid(tx),
      };
    });
  }

  async deleteProduct(ctx: RequestContext, id: string): Promise<void> {
    if (!ctx.hasPermission("products.manage")) {
      throw new ForbiddenError("No tiene permisos para eliminar productos");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Producto");
    }

    await this.repository.delete(ctx, id);
  }

  async countProducts(
    ctx: RequestContext,
    filters?: { categoryId?: string; uncategorized?: boolean; isActive?: boolean }
  ): Promise<number> {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver productos");
    }

    if (filters?.categoryId && filters.uncategorized) {
      throw new ValidationError("No puede filtrar por categoría y sin categoría al mismo tiempo");
    }

    if (filters?.categoryId) {
      await this.assertCategoryExists(ctx, filters.categoryId);
    }

    return this.repository.count(ctx, {
      categoryId: filters?.categoryId,
      uncategorized: filters?.uncategorized,
      isActive: filters?.isActive,
    });
  }

  private async assertCategoryExists(ctx: RequestContext, categoryId: string): Promise<string> {
    const category = await this.categoryRepo.findById(ctx, categoryId);

    if (!category) {
      throw new NotFoundError("Categoría de producto");
    }

    return category.id;
  }

  private async resolveCategoryUpdate(
    ctx: RequestContext,
    data: { categoryId?: string | null }
  ): Promise<{ shouldUpdate: boolean; value: string | null | undefined }> {
    if (!("categoryId" in data)) {
      return { shouldUpdate: false, value: undefined };
    }

    if (data.categoryId === null || data.categoryId === undefined || data.categoryId === "") {
      return { shouldUpdate: true, value: null };
    }

    return {
      shouldUpdate: true,
      value: await this.assertCategoryExists(ctx, data.categoryId),
    };
  }
}
