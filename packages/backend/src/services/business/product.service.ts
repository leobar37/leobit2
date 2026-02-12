import type { ProductRepository } from "../repository/product.repository";
import type { RequestContext } from "../../context/request-context";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../errors";
import type { Product } from "../../db/schema";

export class ProductService {
  constructor(private repository: ProductRepository) {}

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
      type: "pollo" | "huevo" | "otro";
      unit: "kg" | "unidad";
      basePrice: number;
      isActive?: boolean;
    }
  ): Promise<Product> {
    if (!ctx.hasPermission("products.manage")) {
      throw new ForbiddenError("No tiene permisos para crear productos");
    }

    if (!data.name || data.name.length < 2) {
      throw new ValidationError("El nombre debe tener al menos 2 caracteres");
    }

    if (data.basePrice < 0) {
      throw new ValidationError("El precio no puede ser negativo");
    }

    return this.repository.create(ctx, {
      name: data.name,
      type: data.type,
      unit: data.unit,
      basePrice: data.basePrice.toString(),
      isActive: data.isActive ?? true,
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
      isActive?: boolean;
    }
  ): Promise<Product> {
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

    const updated = await this.repository.update(ctx, id, {
      ...data,
      basePrice: data.basePrice?.toString(),
    });

    if (!updated) {
      throw new NotFoundError("Producto");
    }

    return updated;
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
