import { eq, and, desc, like, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { customers, sales, abonos, type Customer, type NewCustomer } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export interface AccountsReceivableItem {
  customer: Customer;
  totalDebt: number;
  totalSales: number;
  totalPayments: number;
  lastSaleDate: Date | null;
}

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

  async getAccountsReceivable(
    ctx: RequestContext,
    filters?: {
      search?: string;
      minBalance?: number;
      limit?: number;
      offset?: number;
    }
  ): Promise<AccountsReceivableItem[]> {
    const creditSalesExpression = sql`CASE WHEN ${sales.saleType} = 'credito' THEN ${sales.totalAmount} ELSE 0 END`;

    const searchFilter = filters?.search
      ? like(customers.name, `%${filters.search}%`)
      : undefined;
    
    const minBalanceFilter = filters?.minBalance !== undefined && filters.minBalance > 0
      ? sql`${customers.id} IN (
        SELECT s.client_id 
        FROM ${sales} s 
        WHERE s.business_id = ${ctx.businessId} 
        GROUP BY s.client_id 
        HAVING COALESCE(SUM(CASE WHEN s.sale_type = 'credito' THEN s.total_amount ELSE 0 END), 0) - COALESCE((
          SELECT SUM(a.amount) 
          FROM abonos a
          WHERE a.client_id = s.client_id AND a.business_id = ${ctx.businessId}
        ), 0) >= ${filters.minBalance}
      )`
      : undefined;

    const customersWithDebt = await db
      .select({
        customer: customers,
        totalDebt: sql<number>`
          COALESCE(SUM(${creditSalesExpression}), 0) - COALESCE((
            SELECT SUM(${abonos.amount}) 
            FROM ${abonos} 
            WHERE ${abonos.clientId} = ${customers.id} AND ${abonos.businessId} = ${ctx.businessId}
          ), 0)
        `,
        totalSales: sql<number>`COALESCE(SUM(${sales.totalAmount}), 0)`,
        lastSaleDate: sql<Date | null>`MAX(${sales.saleDate})`,
      })
      .from(customers)
      .leftJoin(sales, and(
        eq(sales.clientId, customers.id),
        eq(sales.businessId, ctx.businessId)
      ))
      .where(and(
        eq(customers.businessId, ctx.businessId),
        searchFilter,
        minBalanceFilter
      ))
      .groupBy(customers.id)
      .having(sql`COALESCE(SUM(${creditSalesExpression}), 0) - COALESCE((
        SELECT SUM(${abonos.amount}) 
        FROM ${abonos} 
        WHERE ${abonos.clientId} = ${customers.id} AND ${abonos.businessId} = ${ctx.businessId}
      ), 0) > 0`)
      .orderBy(desc(sql`COALESCE(SUM(${creditSalesExpression}), 0) - COALESCE((
        SELECT SUM(${abonos.amount}) 
        FROM ${abonos} 
        WHERE ${abonos.clientId} = ${customers.id} AND ${abonos.businessId} = ${ctx.businessId}
      ), 0)`))
      .limit(filters?.limit ?? 100)
      .offset(filters?.offset ?? 0);

    const result: AccountsReceivableItem[] = [];
    
    for (const row of customersWithDebt) {
      const totalPaymentsResult = await db
        .select({ total: sql<number>`COALESCE(SUM(${abonos.amount}), 0)` })
        .from(abonos)
        .where(and(
          eq(abonos.clientId, row.customer.id),
          eq(abonos.businessId, ctx.businessId)
        ));
      
      const totalPayments = totalPaymentsResult[0]?.total ?? 0;
      
      result.push({
        customer: row.customer,
        totalDebt: Number(row.totalDebt),
        totalSales: Number(row.totalSales),
        totalPayments: totalPayments,
        lastSaleDate: row.lastSaleDate,
      });
    }

    return result;
  }

  async getTotalAccountsReceivable(ctx: RequestContext): Promise<number> {
    const result = await db
      .select({
        totalBalance: sql<number>`SUM(
          COALESCE((
            SELECT SUM(CASE WHEN ${sales.saleType} = 'credito' THEN ${sales.totalAmount} ELSE 0 END) 
            FROM ${sales} 
            WHERE ${sales.clientId} = ${customers.id} 
            AND ${sales.businessId} = ${ctx.businessId}
          ), 0) - COALESCE((
            SELECT SUM(${abonos.amount}) 
            FROM ${abonos} 
            WHERE ${abonos.clientId} = ${customers.id} 
            AND ${abonos.businessId} = ${ctx.businessId}
          ), 0)
        )`,
      })
      .from(customers)
      .where(eq(customers.businessId, ctx.businessId));

    return result[0]?.totalBalance ?? 0;
  }
}
