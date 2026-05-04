import type { ExpenseCategoryRepository } from "../repository/expense-category.repository";
import type { ExpenseRepository } from "../repository/expense.repository";
import type { RequestContext } from "../../context/request-context";
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from "../../errors";
import type { ExpenseCategory } from "../../db/schema";
import { db } from "../../lib/db";
import { getTxid, type MutationResult } from "../../lib/txid";

export class ExpenseCategoryService {
  constructor(
    private repository: ExpenseCategoryRepository,
    private expenseRepository: ExpenseRepository
  ) {}

  async getCategories(ctx: RequestContext) {
    if (!ctx.hasPermission("reports.view")) {
      throw new ForbiddenError("No tiene permisos para ver categorias");
    }

    return this.repository.findAll(ctx);
  }

  async getActiveCategories(ctx: RequestContext) {
    if (!ctx.hasPermission("reports.view")) {
      throw new ForbiddenError("No tiene permisos para ver categorias");
    }

    return this.repository.findActive(ctx);
  }

  async getCategory(ctx: RequestContext, id: string): Promise<ExpenseCategory> {
    if (!ctx.hasPermission("reports.view")) {
      throw new ForbiddenError("No tiene permisos para ver categorias");
    }

    const category = await this.repository.findById(ctx, id);
    if (!category) {
      throw new NotFoundError("Categoria de gasto");
    }

    return category;
  }

  async createCategory(
    ctx: RequestContext,
    data: {
      name: string;
      description?: string;
      icon?: string;
      color?: string;
    }
  ): Promise<MutationResult<ExpenseCategory>> {
    if (!ctx.isAdmin()) {
      throw new ForbiddenError("Solo los administradores pueden crear categorias");
    }

    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError("El nombre de la categoria es requerido");
    }

    return db.transaction(async (tx) => {
      const category = await this.repository.create(ctx, {
        name: data.name.trim(),
        description: data.description ?? null,
        icon: data.icon ?? "receipt",
        color: data.color ?? "orange",
      }, tx);

      return {
        data: category,
        txid: await getTxid(tx),
      };
    });
  }

  async updateCategory(
    ctx: RequestContext,
    id: string,
    data: {
      name?: string;
      description?: string | null;
      icon?: string;
      color?: string;
      isActive?: boolean;
    }
  ): Promise<MutationResult<ExpenseCategory>> {
    if (!ctx.isAdmin()) {
      throw new ForbiddenError("Solo los administradores pueden actualizar categorias");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Categoria de gasto");
    }

    if (data.name !== undefined && data.name.trim().length === 0) {
      throw new ValidationError("El nombre de la categoria es requerido");
    }

    const updateData: Parameters<ExpenseCategoryRepository["update"]>[2] = {};

    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return db.transaction(async (tx) => {
      const category = await this.repository.update(ctx, id, updateData, tx);
      return {
        data: category,
        txid: await getTxid(tx),
      };
    });
  }

  async deleteCategory(ctx: RequestContext, id: string): Promise<void> {
    if (!ctx.isAdmin()) {
      throw new ForbiddenError("Solo los administradores pueden eliminar categorias");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Categoria de gasto");
    }

    // Check if category has associated expenses
    const expenses = await this.expenseRepository.findAll(ctx, { categoryId: id, limit: 1 });
    if (expenses.length > 0) {
      throw new ConflictError("No se puede eliminar la categoria porque tiene gastos asociados");
    }

    await this.repository.delete(ctx, id);
  }

  async seedDefaultCategories(ctx: RequestContext): Promise<void> {
    if (!ctx.isAdmin()) {
      throw new ForbiddenError("Solo los administradores pueden crear categorias");
    }

    const defaultCategories = [
      { name: "Transporte", icon: "truck", color: "blue" },
      { name: "Suministros de Venta", icon: "package", color: "green" },
      { name: "Conservacion", icon: "thermometer", color: "cyan" },
      { name: "Permisos y Licencias", icon: "file-check", color: "purple" },
      { name: "Alimentacion", icon: "utensils", color: "yellow" },
      { name: "Comunicacion", icon: "phone", color: "pink" },
      { name: "Otros", icon: "more-horizontal", color: "gray" },
    ];

    const existingCategories = await this.repository.findAll(ctx);
    const existingNames = new Set(existingCategories.map((c) => c.name.toLowerCase()));

    for (const cat of defaultCategories) {
      if (!existingNames.has(cat.name.toLowerCase())) {
        await this.repository.create(ctx, {
          name: cat.name,
          description: null,
          icon: cat.icon,
          color: cat.color,
        });
      }
    }
  }
}
