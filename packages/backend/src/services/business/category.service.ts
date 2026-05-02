/**
 * Category Service
 * Business logic for product category management
 */
import { and, eq, sql } from "drizzle-orm";
import type { CategoryRepository } from "../repository/category.repository";
import type { RequestContext } from "../../context/request-context";
import { db } from "../../lib/db";
import { getTxid, type MutationResult } from "../../lib/txid";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../errors";
import { products, type ProductCategory } from "../../db/schema";

export class CategoryService {
  constructor(private repository: CategoryRepository) {}

  async listCategories(ctx: RequestContext): Promise<ProductCategory[]> {
    if (!ctx.hasPermission("products.manage")) {
      throw new ForbiddenError("No tiene permisos para ver categorías de productos");
    }

    return this.repository.findAll(ctx);
  }

  async getCategory(ctx: RequestContext, id: string): Promise<ProductCategory> {
    if (!ctx.hasPermission("products.manage")) {
      throw new ForbiddenError("No tiene permisos para ver categorías de productos");
    }

    const category = await this.repository.findById(ctx, id);
    if (!category) {
      throw new NotFoundError("Categoría de producto");
    }

    return category;
  }

  async createCategory(
    ctx: RequestContext,
    data: { name: string; color?: string }
  ): Promise<MutationResult<ProductCategory>> {
    if (!ctx.hasPermission("products.manage")) {
      throw new ForbiddenError("No tiene permisos para crear categorías de productos");
    }

    const normalizedName = this.validateName(data.name);
    const color = this.validateColor(data.color);

    const duplicateCount = await this.repository.count(ctx, { name: normalizedName });
    if (duplicateCount > 0) {
      throw new ConflictError("Ya existe una categoría con ese nombre");
    }

    return db.transaction(async (tx) => {
      const category = await this.repository.create(
        ctx,
        {
          name: normalizedName,
          color,
        },
        tx
      );

      return {
        data: category,
        txid: await getTxid(tx),
      };
    });
  }

  async updateCategory(
    ctx: RequestContext,
    id: string,
    data: { name?: string; color?: string }
  ): Promise<MutationResult<ProductCategory>> {
    if (!ctx.hasPermission("products.manage")) {
      throw new ForbiddenError("No tiene permisos para editar categorías de productos");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Categoría de producto");
    }

    const updates: { name?: string; color?: string } = {};

    if (data.name !== undefined) {
      const normalizedName = this.validateName(data.name);
      const duplicateCount = await this.repository.count(ctx, {
        name: normalizedName,
        excludeId: id,
      });

      if (duplicateCount > 0) {
        throw new ConflictError("Ya existe una categoría con ese nombre");
      }

      updates.name = normalizedName;
    }

    if (data.color !== undefined) {
      updates.color = this.validateColor(data.color);
    }

    return db.transaction(async (tx) => {
      const updated = await this.repository.update(ctx, id, updates, tx);
      if (!updated) {
        throw new NotFoundError("Categoría de producto");
      }

      return {
        data: updated,
        txid: await getTxid(tx),
      };
    });
  }

  async deleteCategory(ctx: RequestContext, id: string): Promise<void> {
    if (!ctx.hasPermission("products.manage")) {
      throw new ForbiddenError("No tiene permisos para eliminar categorías de productos");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Categoría de producto");
    }

    const assignedProducts = await this.getAssignedProductCount(ctx, id);
    if (assignedProducts > 0) {
      throw new ConflictError("No se puede eliminar una categoría asignada a productos");
    }

    await this.repository.delete(ctx, id);
  }

  private validateName(name: string): string {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new ValidationError("El nombre es requerido");
    }

    if (normalizedName.length > 100) {
      throw new ValidationError("El nombre no puede tener más de 100 caracteres");
    }

    return normalizedName;
  }

  private validateColor(color?: string): string {
    const resolvedColor = color ?? "#f97316";

    if (!/^#[0-9A-Fa-f]{6}$/.test(resolvedColor)) {
      throw new ValidationError("Color inválido");
    }

    return resolvedColor;
  }

  private async getAssignedProductCount(ctx: RequestContext, categoryId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(
        and(
          eq(products.businessId, ctx.businessId),
          eq(products.categoryId, categoryId)
        )
      );

    return result[0]?.count ?? 0;
  }
}
