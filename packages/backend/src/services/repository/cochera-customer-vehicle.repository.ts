import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import {
  cocheraCustomerVehicles,
  cocheraSessions,
  customers,
  type CocheraCustomerVehicle,
  type NewCocheraCustomerVehicle,
} from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class CocheraCustomerVehicleRepository {
  async findById(
    ctx: RequestContext,
    id: string,
    tx?: DbTransaction
  ): Promise<CocheraCustomerVehicle | undefined> {
    const executor = tx ?? db;
    return executor.query.cocheraCustomerVehicles.findFirst({
      where: and(
        eq(cocheraCustomerVehicles.id, id),
        eq(cocheraCustomerVehicles.businessId, ctx.businessId)
      ),
    });
  }

  async findActiveByPlate(
    ctx: RequestContext,
    plate: string,
    tx?: DbTransaction
  ): Promise<CocheraCustomerVehicle | undefined> {
    const executor = tx ?? db;
    return executor.query.cocheraCustomerVehicles.findFirst({
      where: and(
        eq(cocheraCustomerVehicles.businessId, ctx.businessId),
        eq(cocheraCustomerVehicles.plate, plate.toUpperCase()),
        eq(cocheraCustomerVehicles.active, true)
      ),
    });
  }

  async findByCustomerId(
    ctx: RequestContext,
    customerId: string,
    tx?: DbTransaction
  ): Promise<CocheraCustomerVehicle[]> {
    const executor = tx ?? db;
    return executor.query.cocheraCustomerVehicles.findMany({
      where: and(
        eq(cocheraCustomerVehicles.businessId, ctx.businessId),
        eq(cocheraCustomerVehicles.customerId, customerId)
      ),
      orderBy: [desc(cocheraCustomerVehicles.active), desc(cocheraCustomerVehicles.createdAt)],
    });
  }

  async findByCustomerIds(
    ctx: RequestContext,
    customerIds: string[]
  ): Promise<CocheraCustomerVehicle[]> {
    if (customerIds.length === 0) return [];

    return db.query.cocheraCustomerVehicles.findMany({
      where: and(
        eq(cocheraCustomerVehicles.businessId, ctx.businessId),
        inArray(cocheraCustomerVehicles.customerId, customerIds)
      ),
      orderBy: [desc(cocheraCustomerVehicles.active), desc(cocheraCustomerVehicles.createdAt)],
    });
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewCocheraCustomerVehicle, "businessId" | "id" | "createdAt" | "updatedAt">,
    tx?: DbTransaction
  ): Promise<CocheraCustomerVehicle> {
    const executor = tx ?? db;
    const [vehicle] = await executor
      .insert(cocheraCustomerVehicles)
      .values({
        ...data,
        plate: data.plate.toUpperCase(),
        businessId: ctx.businessId,
      })
      .returning();

    return vehicle;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<Omit<NewCocheraCustomerVehicle, "businessId" | "customerId" | "id" | "createdAt" | "updatedAt">>,
    tx?: DbTransaction
  ): Promise<CocheraCustomerVehicle | undefined> {
    const executor = tx ?? db;
    const [vehicle] = await executor
      .update(cocheraCustomerVehicles)
      .set({
        ...(data.plate !== undefined && { plate: data.plate.toUpperCase() }),
        ...(data.vehicleType !== undefined && { vehicleType: data.vehicleType }),
        ...(data.alias !== undefined && { alias: data.alias }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.active !== undefined && { active: data.active }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(cocheraCustomerVehicles.id, id),
          eq(cocheraCustomerVehicles.businessId, ctx.businessId)
        )
      )
      .returning();

    return vehicle;
  }

  async listCustomerSummaries(
    ctx: RequestContext,
    filters: { search?: string; limit?: number; offset?: number } = {}
  ) {
    const search = filters.search?.trim();
    const where = [
      eq(customers.businessId, ctx.businessId),
      search
        ? or(
            like(sql`upper(${customers.name})`, `%${search.toUpperCase()}%`),
            like(sql`coalesce(${customers.phone}, '')`, `%${search}%`),
            sql`exists (
              select 1 from ${cocheraCustomerVehicles} cv
              where cv.customer_id = ${customers.id}
                and cv.business_id = ${ctx.businessId}
                and cv.plate ilike ${`%${search}%`}
            )`
          )
        : undefined,
    ];

    return db
      .select({
        customer: customers,
        vehicleCount: sql<number>`count(distinct ${cocheraCustomerVehicles.id})`,
        activeDebt: sql<string>`coalesce(sum(case when ${cocheraSessions.status} = 'fuera' and coalesce(${cocheraSessions.balanceDue}, 0) > 0 then ${cocheraSessions.balanceDue} else 0 end), 0)::text`,
        pendingSessions: sql<number>`count(distinct case when ${cocheraSessions.status} = 'fuera' and coalesce(${cocheraSessions.balanceDue}, 0) > 0 then ${cocheraSessions.id} end)`,
        lastActivityAt: sql<Date | null>`max(coalesce(${cocheraSessions.checkoutAt}, ${cocheraSessions.entryAt}))`,
      })
      .from(customers)
      .leftJoin(
        cocheraCustomerVehicles,
        and(
          eq(cocheraCustomerVehicles.customerId, customers.id),
          eq(cocheraCustomerVehicles.businessId, ctx.businessId)
        )
      )
      .leftJoin(
        cocheraSessions,
        and(
          eq(cocheraSessions.responsibleCustomerId, customers.id),
          eq(cocheraSessions.businessId, ctx.businessId)
        )
      )
      .where(and(...where))
      .groupBy(customers.id)
      .orderBy(desc(sql`max(coalesce(${cocheraSessions.checkoutAt}, ${cocheraSessions.entryAt}, ${customers.createdAt}))`))
      .limit(filters.limit ?? 100)
      .offset(filters.offset ?? 0);
  }
}
