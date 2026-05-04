import { eq, and, desc, gte, lte } from "drizzle-orm";
import { db } from "../../lib/db";
import { expenses, type Expense, type NewExpense } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  distribucionId?: string;
  sellerId?: string;
  paymentMethod?: string;
  limit?: number;
  offset?: number;
}

export class ExpenseRepository {
  async findAll(
    ctx: RequestContext,
    filters?: ExpenseFilters,
    tx?: DbTransaction
  ): Promise<Expense[]> {
    const executor = tx ?? db;

    const conditions = [eq(expenses.businessId, ctx.businessId)];

    if (filters?.startDate) {
      conditions.push(gte(expenses.expenseDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(expenses.expenseDate, filters.endDate));
    }
    if (filters?.categoryId) {
      conditions.push(eq(expenses.categoryId, filters.categoryId));
    }
    if (filters?.distribucionId) {
      conditions.push(eq(expenses.distribucionId, filters.distribucionId));
    }
    if (filters?.sellerId) {
      conditions.push(eq(expenses.sellerId, filters.sellerId));
    }
    if (filters?.paymentMethod) {
      conditions.push(eq(expenses.paymentMethod, filters.paymentMethod as any));
    }

    return executor
      .select()
      .from(expenses)
      .where(and(...conditions))
      .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt))
      .limit(filters?.limit ?? 100)
      .offset(filters?.offset ?? 0);
  }

  async findById(
    ctx: RequestContext,
    id: string,
    tx?: DbTransaction
  ): Promise<Expense | undefined> {
    const executor = tx ?? db;

    const [expense] = await executor
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.businessId, ctx.businessId)));

    return expense;
  }

  async findByDistribucionId(
    ctx: RequestContext,
    distribucionId: string,
    tx?: DbTransaction
  ): Promise<Expense[]> {
    const executor = tx ?? db;

    return executor
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.distribucionId, distribucionId),
          eq(expenses.businessId, ctx.businessId)
        )
      )
      .orderBy(desc(expenses.expenseDate));
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewExpense, "businessId">,
    tx?: DbTransaction
  ): Promise<Expense> {
    const executor = tx ?? db;

    const [expense] = await executor
      .insert(expenses)
      .values({
        ...data,
        businessId: ctx.businessId,
      })
      .returning();

    return expense;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<Omit<NewExpense, "businessId" | "id">>,
    tx?: DbTransaction
  ): Promise<Expense> {
    const executor = tx ?? db;

    const [expense] = await executor
      .update(expenses)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(expenses.id, id), eq(expenses.businessId, ctx.businessId)))
      .returning();

    return expense;
  }

  async delete(
    ctx: RequestContext,
    id: string,
    tx?: DbTransaction
  ): Promise<void> {
    const executor = tx ?? db;

    await executor
      .delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.businessId, ctx.businessId)));
  }
}
