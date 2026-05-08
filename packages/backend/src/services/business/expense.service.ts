import type { ExpenseRepository } from "../repository/expense.repository";
import type { ExpenseCategoryRepository } from "../repository/expense-category.repository";
import type { RequestContext } from "../../context/request-context";
import { NotFoundError, ValidationError, ForbiddenError } from "../../errors";
import type { Expense } from "../../db/schema";
import { db } from "../../lib/db";
import { normalizeAmount } from "../../lib/number-utils";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class ExpenseService {
  constructor(
    private repository: ExpenseRepository,
    private categoryRepository: ExpenseCategoryRepository
  ) {}

  async getExpenses(
    ctx: RequestContext,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      categoryId?: string;
      distribucionId?: string;
      sellerId?: string;
      paymentMethod?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const startDate = filters?.startDate
      ? filters.startDate.toISOString().split("T")[0]
      : undefined;
    const endDate = filters?.endDate
      ? filters.endDate.toISOString().split("T")[0]
      : undefined;

    if (!ctx.hasPermission("reports.view")) {
      throw new ForbiddenError("No tiene permisos para ver gastos");
    }

    return this.repository.findAll(ctx, {
      categoryId: filters?.categoryId,
      distribucionId: filters?.distribucionId,
      sellerId: filters?.sellerId,
      paymentMethod: filters?.paymentMethod,
      limit: filters?.limit,
      offset: filters?.offset,
      startDate,
      endDate,
    });
  }

  async getExpense(ctx: RequestContext, id: string): Promise<Expense> {
    if (!ctx.hasPermission("reports.view")) {
      throw new ForbiddenError("No tiene permisos para ver gastos");
    }

    const expense = await this.repository.findById(ctx, id);
    if (!expense) {
      throw new NotFoundError("Gasto");
    }

    return expense;
  }

  async createExpense(
    ctx: RequestContext,
    data: {
      id?: string;
      categoryId: string;
      distribucionId?: string;
      sellerId?: string;
      amount: number;
      description?: string;
      expenseDate: string;
      paymentMethod?: "efectivo" | "yape" | "plin" | "transferencia" | "tarjeta" | "saldo";
      referenceNumber?: string;
      receiptImageId?: string;
    }
  ): Promise<Expense> {
    if (!ctx.hasPermission("reports.view")) {
      throw new ForbiddenError("No tiene permisos para registrar gastos");
    }

    if (data.amount <= 0) {
      throw new ValidationError("El monto debe ser mayor a 0");
    }

    if (!data.expenseDate || isNaN(Date.parse(data.expenseDate))) {
      throw new ValidationError("La fecha del gasto no es valida");
    }

    // Validate category exists
    const category = await this.categoryRepository.findById(ctx, data.categoryId);
    if (!category) {
      throw new NotFoundError("Categoria de gasto");
    }

    const normalizedAmount = parseFloat(normalizeAmount(data.amount, 2, "amount"));

    return db.transaction(async (tx) => {
      const expense = await this.repository.create(ctx, {
        id: data.id,
        categoryId: data.categoryId,
        distribucionId: data.distribucionId ?? null,
        sellerId: data.sellerId ?? ctx.businessUserId,
        amount: normalizedAmount.toFixed(2),
        description: data.description ?? null,
        expenseDate: data.expenseDate,
        paymentMethod: data.paymentMethod ?? "efectivo",
        referenceNumber: data.referenceNumber ?? null,
        receiptImageId: data.receiptImageId ?? null,
      }, tx);

      return {
        data: expense,
        txid: ,
      };
    });
  }

  async updateExpense(
    ctx: RequestContext,
    id: string,
    data: {
      categoryId?: string;
      distribucionId?: string | null;
      sellerId?: string | null;
      amount?: number;
      description?: string | null;
      expenseDate?: string;
      paymentMethod?: "efectivo" | "yape" | "plin" | "transferencia" | "tarjeta" | "saldo";
      referenceNumber?: string | null;
      receiptImageId?: string | null;
    }
  ): Promise<Expense> {
    if (!ctx.hasPermission("reports.view")) {
      throw new ForbiddenError("No tiene permisos para actualizar gastos");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Gasto");
    }

    if (data.amount !== undefined && data.amount <= 0) {
      throw new ValidationError("El monto debe ser mayor a 0");
    }

    if (data.expenseDate && isNaN(Date.parse(data.expenseDate))) {
      throw new ValidationError("La fecha del gasto no es valida");
    }

    // Validate category if changing
    if (data.categoryId) {
      const category = await this.categoryRepository.findById(ctx, data.categoryId);
      if (!category) {
        throw new NotFoundError("Categoria de gasto");
      }
    }

    const updateData: Parameters<ExpenseRepository["update"]>[2] = {};

    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.distribucionId !== undefined) updateData.distribucionId = data.distribucionId;
    if (data.sellerId !== undefined) updateData.sellerId = data.sellerId;
    if (data.amount !== undefined) updateData.amount = parseFloat(normalizeAmount(data.amount, 2, "amount")).toFixed(2);
    if (data.description !== undefined) updateData.description = data.description;
    if (data.expenseDate !== undefined) updateData.expenseDate = data.expenseDate;
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.referenceNumber !== undefined) updateData.referenceNumber = data.referenceNumber;
    if (data.receiptImageId !== undefined) updateData.receiptImageId = data.receiptImageId;

    return db.transaction(async (tx) => {
      const expense = await this.repository.update(ctx, id, updateData, tx);
      return {
        data: expense,
        txid: ,
      };
    });
  }

  async deleteExpense(ctx: RequestContext, id: string): Promise<void> {
    if (!ctx.isAdmin()) {
      throw new ForbiddenError("Solo los administradores pueden eliminar gastos");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Gasto");
    }

    await this.repository.delete(ctx, id);
  }

  async getExpensesByDistribucion(
    ctx: RequestContext,
    distribucionId: string
  ): Promise<Expense[]> {
    if (!ctx.hasPermission("reports.view")) {
      throw new ForbiddenError("No tiene permisos para ver gastos");
    }

    return this.repository.findByDistribucionId(ctx, distribucionId);
  }

  async updateReceiptImage(
    ctx: RequestContext,
    id: string,
    receiptImageId: string | null
  ): Promise<Expense> {
    if (!ctx.hasPermission("reports.view")) {
      throw new ForbiddenError("No tiene permisos para actualizar gastos");
    }

    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Gasto");
    }

    return db.transaction(async (tx) => {
      const expense = await this.repository.update(ctx, id, {
        receiptImageId,
      }, tx);
      return {
        data: expense,
        txid: ,
      };
    });
  }
}
