import { eq, and, desc, like, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { customers, type Customer, type NewCustomer } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export class CustomerRepository {
  async findMany(
    ctx: RequestContext,
    filters?: {
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Customer[]> {
    const query = db.query.customers.findMany({
      where: and(
        eq(customers.businessId, ctx.businessId),
        filters?.search
          ? like(customers.name, `%${filters.search}%`)
          : undefined
      ),
      orderBy: desc(customers.createdAt),
      limit: filters?.limit,
      offset: filters?.offset,
    });

    return query;
  }

  async findById(ctx: RequestContext, id: string): Promise<Customer | undefined> {
    const customer = await db.query.customers.findFirst({
      where: and(
        eq(customers.id, id),
        eq(customers.businessId, ctx.businessId)
      ),
    });
    return customer;
  }

  async findByDni(ctx: RequestContext, dni: string): Promise<Customer | undefined> {
    const customer = await db.query.customers.findFirst({
      where: and(
        eq(customers.dni, dni),
        eq(customers.businessId, ctx.businessId)
      ),
    });
    return customer;
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewCustomer, "businessId" | "createdBy" | "id" | "createdAt" | "updatedAt">
  ): Promise<Customer> {
    const [customer] = await db
      .insert(customers)
      .values({
        ...data,
        businessId: ctx.businessId,
        createdBy: ctx.businessUserId,
      })
      .returning();

    return customer;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<Omit<NewCustomer, "businessId" | "createdBy" | "id" | "createdAt" | "updatedAt">>
  ): Promise<Customer | undefined> {
    const [customer] = await db
      .update(customers)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.dni !== undefined && { dni: data.dni }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.syncStatus !== undefined && { syncStatus: data.syncStatus }),
        ...(data.syncAttempts !== undefined && { syncAttempts: data.syncAttempts }),
        updatedAt: new Date(),
      })
      .where(and(
        eq(customers.id, id),
        eq(customers.businessId, ctx.businessId)
      ))
      .returning();

    return customer;
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    await db
      .delete(customers)
      .where(and(
        eq(customers.id, id),
        eq(customers.businessId, ctx.businessId)
      ));
  }

  async count(ctx: RequestContext): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(eq(customers.businessId, ctx.businessId));

    return result[0]?.count ?? 0;
  }
}

