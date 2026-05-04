import { eq, and, desc } from "drizzle-orm";
import { db } from "../../lib/db";
import { expenseCategories, type ExpenseCategory, type NewExpenseCategory } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class ExpenseCategoryRepository {
  async findAll(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<ExpenseCategory[]> {
    const executor = tx ?? db;

    return executor
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.businessId, ctx.businessId))
      .orderBy(desc(expenseCategories.createdAt));
  }

  async findActive(
    ctx: RequestContext,
    tx?: DbTransaction
  ): Promise<ExpenseCategory[]> {
    const executor = tx ?? db;

    return executor
      .select()
      .from(expenseCategories)
      .where(
        and(
          eq(expenseCategories.businessId, ctx.businessId),
          eq(expenseCategories.isActive, true)
        )
      )
      .orderBy(desc(expenseCategories.createdAt));
  }

  async findById(
    ctx: RequestContext,
    id: string,
    tx?: DbTransaction
  ): Promise<ExpenseCategory | undefined> {
    const executor = tx ?? db;

    const [category] = await executor
      .select()
      .from(expenseCategories)
      .where(
        and(
          eq(expenseCategories.id, id),
          eq(expenseCategories.businessId, ctx.businessId)
        )
      );

    return category;
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewExpenseCategory, "businessId">,
    tx?: DbTransaction
  ): Promise<ExpenseCategory> {
    const executor = tx ?? db;

    const [category] = await executor
      .insert(expenseCategories)
      .values({
        ...data,
        businessId: ctx.businessId,
      })
      .returning();

    return category;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<Omit<NewExpenseCategory, "businessId" | "id">>,
    tx?: DbTransaction
  ): Promise<ExpenseCategory> {
    const executor = tx ?? db;

    const [category] = await executor
      .update(expenseCategories)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(expenseCategories.id, id),
          eq(expenseCategories.businessId, ctx.businessId)
        )
      )
      .returning();

    return category;
  }

  async delete(
    ctx: RequestContext,
    id: string,
    tx?: DbTransaction
  ): Promise<void> {
    const executor = tx ?? db;

    await executor
      .delete(expenseCategories)
      .where(
        and(
          eq(expenseCategories.id, id),
          eq(expenseCategories.businessId, ctx.businessId)
        )
      );
  }
}
