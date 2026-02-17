import { eq, and, desc, like, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { suppliers, type Supplier, type NewSupplier } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export class SupplierRepository {
  async findMany(
    ctx: RequestContext,
    filters?: {
      search?: string;
      type?: "generic" | "regular" | "internal";
      isActive?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<Supplier[]> {
    const conditions = [
      eq(suppliers.businessId, ctx.businessId),
    ];

    if (filters?.search) {
      conditions.push(like(suppliers.name, `%${filters.search}%`));
    }

    if (filters?.type) {
      conditions.push(eq(suppliers.type, filters.type as "generic" | "regular" | "internal"));
    }

    if (filters?.isActive !== undefined) {
      conditions.push(eq(suppliers.isActive, filters.isActive));
    }

    return db.query.suppliers.findMany({
      where: and(...conditions),
      orderBy: desc(suppliers.createdAt),
      limit: filters?.limit,
      offset: filters?.offset,
    });
  }

  async findById(ctx: RequestContext, id: string): Promise<Supplier | undefined> {
    return db.query.suppliers.findFirst({
      where: and(
        eq(suppliers.id, id),
        eq(suppliers.businessId, ctx.businessId)
      ),
    });
  }

  async findGenericByBusinessId(ctx: RequestContext): Promise<Supplier | undefined> {
    return db.query.suppliers.findFirst({
      where: and(
        eq(suppliers.businessId, ctx.businessId),
        eq(suppliers.type, "generic")
      ),
    });
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewSupplier, "businessId" | "id" | "createdAt" | "updatedAt">
  ): Promise<Supplier> {
    const [supplier] = await db
      .insert(suppliers)
      .values({
        ...data,
        businessId: ctx.businessId,
      })
      .returning();

    return supplier;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<Omit<NewSupplier, "businessId" | "id" | "createdAt" | "updatedAt">>
  ): Promise<Supplier | undefined> {
    const [supplier] = await db
      .update(suppliers)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.ruc !== undefined && { ruc: data.ruc }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedAt: new Date(),
      })
      .where(and(
        eq(suppliers.id, id),
        eq(suppliers.businessId, ctx.businessId)
      ))
      .returning();

    return supplier;
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    await db
      .delete(suppliers)
      .where(and(
        eq(suppliers.id, id),
        eq(suppliers.businessId, ctx.businessId)
      ));
  }

  async count(ctx: RequestContext): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(suppliers)
      .where(eq(suppliers.businessId, ctx.businessId));

    return result[0]?.count ?? 0;
  }
}
