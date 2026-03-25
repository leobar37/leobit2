import type { ProductRepository } from "../repository/product.repository";
import type { ProductVariantRepository } from "../repository/product-variant.repository";
import type { RequestContext } from "../../context/request-context";
import { db } from "../../lib/db";
import { getTxid, type MutationResult } from "../../lib/txid";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../errors";
import type { Product } from "../../db/schema";

export class ProductService {
  constructor(
    private repository: ProductRepository,
    private variantRepo: ProductVariantRepository,
  ) {}

  async getProducts(
    ctx: RequestContext,
    filters?: {
      search?: string;
      type?: string;
      isActive?: boolean;
      limit?: number;
      offset?: number;
    }
  ) {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver productos");
    }

    const validTypes = ["pollo", "huevo", "otro"] as const;
    const validatedType = filters?.type && validTypes.includes(filters.type as any) 
      ? filters.type as "pollo" | "huevo" | "otro"
      : undefined;

    return this.repository.findMany(ctx, {
      ...filters,
      type: validatedType,
    });
  }

  async getProduct(ctx: RequestContext, id: string): Promise<Product> {
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
      type?: "pollo" | "huevo" | "otro";
      unit: "kg" | "unidad";
      basePrice: number;
      costPrice?: number;
      isActive?: boolean;
      imageId?: string;
      hasVariants?: boolean;
    }
  ): Promise<MutationResult<Product>> {
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

    return db.transaction(async (tx) => {
      const product = await this.repository.create(ctx, {
        name: data.name,
        type: data.type,
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
      type?: "pollo" | "huevo" | "otro";
      unit?: "kg" | "unidad";
      basePrice?: number;
      costPrice?: number;
      isActive?: boolean;
      imageId?: string | null;
      syncPriceToVariants?: boolean;
    }
  ): Promise<MutationResult<Product>> {
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

    return db.transaction(async (tx) => {
      const updated = await this.repository.update(ctx, id, {
        name: data.name,
        type: data.type,
        unit: data.unit,
        basePrice: data.basePrice?.toString(),
        costPrice: data.costPrice?.toString(),
        isActive: data.isActive,
        imageId: data.imageId,
      }, tx);

      if (!updated) {
        throw new NotFoundError("Producto");
      }

      // Sync basePrice to all active variants if requested
      if (data.basePrice !== undefined && data.syncPriceToVariants && existing.hasVariants) {
        const variants = await this.variantRepo.findByProduct(ctx, id, { includeInactive: false });
        for (const variant of variants) {
          await this.variantRepo.update(ctx, variant.id, {
            price: data.basePrice.toString(),
          }, tx);
        }
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

  async countProducts(ctx: RequestContext, filters?: { type?: string; isActive?: boolean }): Promise<number> {
    if (!ctx.hasPermission("inventory.read")) {
      throw new ForbiddenError("No tiene permisos para ver productos");
    }

    const validTypes = ["pollo", "huevo", "otro"] as const;
    const validatedType = filters?.type && validTypes.includes(filters.type as any) 
      ? filters.type as "pollo" | "huevo" | "otro"
      : undefined;

    return this.repository.count(ctx, {
      type: validatedType as any,
      isActive: filters?.isActive,
    });
  }
}
