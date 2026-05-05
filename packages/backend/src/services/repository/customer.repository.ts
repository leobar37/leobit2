import { eq, and, desc, asc, like, sql, inArray, ne, count } from "drizzle-orm";
import { db } from "../../lib/db";
import { customers, sales, abonos, type Customer, type NewCustomer } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";
import type { DbTransaction } from "../../lib/txid";
import {
  buildSearchCondition,
  resolveTagCustomerIds,
  mergeCustomerIdFilters,
  buildCustomerMetrics,
  buildCustomerSort,
  buildAbonosLateralJoin,
  buildPagination,
  type CustomerListFilters,
} from "./customer.query-builder";

export interface AccountsReceivableItem {
  customer: Customer;
  totalDebt: number;
  totalSales: number;
  totalPayments: number;
  lastSaleDate: Date | null;
}

export interface CustomerWithMetrics extends Customer {
  totalDebt: number;
  lastSaleDate: Date | null;
}

export class CustomerRepository {
  async findMany(
    ctx: RequestContext,
    filters?: CustomerListFilters
  ): Promise<CustomerWithMetrics[]> {
    // Early return for empty explicit filter
    if (filters?.customerIds && filters.customerIds.length === 0) {
      return [];
    }

    // Resolve filters
    const tagCustomerIds = await resolveTagCustomerIds(ctx, filters?.tagIds);
    const customerIdsFilter = mergeCustomerIdFilters(
      filters?.customerIds,
      tagCustomerIds
    );

    // Empty intersection
    if (customerIdsFilter?.length === 0) {
      return [];
    }

    const searchCondition = buildSearchCondition(filters?.search);
    const metrics = buildCustomerMetrics();
    const orderBy = buildCustomerSort(
      filters?.sortBy ?? "createdAt",
      filters?.sortOrder ?? "desc"
    );
    const { limit, offset } = buildPagination(filters);

    const rows = await db
      .select({
        customer: customers,
        totalDebt: metrics.totalDebt,
        lastSaleDate: metrics.lastSaleDate,
      })
      .from(customers)
      .leftJoin(sales, and(
        eq(sales.customerId, customers.id),
        eq(sales.businessId, ctx.businessId)
      ))
      .leftJoin(
        buildAbonosLateralJoin(ctx.businessId),
        sql`true`
      )
      .where(and(
        eq(customers.businessId, ctx.businessId),
        searchCondition,
        customerIdsFilter
          ? inArray(customers.id, customerIdsFilter)
          : undefined
      ))
      .groupBy(customers.id, sql`abonos_lateral.total_paid`)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return rows.map((row) => ({
      ...row.customer,
      totalDebt: Number(row.totalDebt),
      lastSaleDate: row.lastSaleDate,
    }));
  }

  async findById(ctx: RequestContext, id: string, tx?: DbTransaction): Promise<Customer | undefined> {
    const executor = tx ?? db;
    const customer = await executor.query.customers.findFirst({
      where: and(
        eq(customers.id, id),
        eq(customers.businessId, ctx.businessId)
      ),
    });
    return customer;
  }

  async findByIds(ctx: RequestContext, ids: string[]): Promise<Customer[]> {
    if (ids.length === 0) return [];

    const results = await db.query.customers.findMany({
      where: and(
        inArray(customers.id, ids),
        eq(customers.businessId, ctx.businessId)
      ),
    });
    return results;
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
    data: Omit<NewCustomer, "businessId" | "createdBy" | "id" | "createdAt" | "updatedAt"> & { id?: string },
    tx?: DbTransaction
  ): Promise<Customer> {
    const executor = tx ?? db;

    const [customer] = await executor
      .insert(customers)
      .values({
        ...data,
        ...(data.id ? { id: data.id } : {}),
        businessId: ctx.businessId,
        createdBy: ctx.businessUserId,
      })
      .returning();

    return customer;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<Omit<NewCustomer, "businessId" | "createdBy" | "id" | "createdAt" | "updatedAt">>,
    tx?: DbTransaction
  ): Promise<Customer | undefined> {
    const executor = tx ?? db;

    const [customer] = await executor
      .update(customers)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.dni !== undefined && { dni: data.dni }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.notes !== undefined && { notes: data.notes }),
        updatedAt: new Date(),
      })
      .where(and(
        eq(customers.id, id),
        eq(customers.businessId, ctx.businessId)
      ))
      .returning();

    return customer;
  }

  async delete(ctx: RequestContext, id: string, tx?: DbTransaction): Promise<void> {
    const executor = tx ?? db;
    await executor
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
        SELECT s.customer_id 
        FROM ${sales} s 
        WHERE s.business_id = ${ctx.businessId} 
          AND s.status <> 'cancelled'
          AND s.status <> 'draft'
        GROUP BY s.customer_id 
        HAVING COALESCE(SUM(CASE WHEN s.sale_type = 'credito' THEN s.total_amount ELSE 0 END), 0) - COALESCE((
          SELECT SUM(a.amount) 
          FROM abonos a
          WHERE a.customer_id = s.customer_id AND a.business_id = ${ctx.businessId}
        ), 0) >= ${filters.minBalance}
      )`
      : undefined;

    // Use LATERAL JOIN to get totalPayments in a single query instead of N+1 per customer
    const customersWithDebt = await db
      .select({
        customer: customers,
        totalDebt: sql<number>`
          COALESCE(SUM(${creditSalesExpression}), 0) - COALESCE(abonos_lateral.total_paid, 0)
        `,
        totalSales: sql<number>`COALESCE(SUM(${sales.totalAmount}), 0)`,
        lastSaleDate: sql<Date | null>`MAX(${sales.saleDate})`,
        totalPayments: sql<number>`COALESCE(abonos_lateral.total_paid, 0)`,
      })
      .from(customers)
      .leftJoin(sales, and(
        eq(sales.customerId, customers.id),
        eq(sales.businessId, ctx.businessId),
        ne(sales.status, "cancelled"),
        ne(sales.status, "draft")
      ))
      .leftJoin(
        sql`LATERAL (
          SELECT COALESCE(SUM(${abonos.amount}), 0) AS total_paid
          FROM ${abonos}
          WHERE ${abonos.customerId} = ${customers.id}
            AND ${abonos.businessId} = ${ctx.businessId}
        ) AS abonos_lateral`,
        sql`true`
      )
      .where(and(
        eq(customers.businessId, ctx.businessId),
        searchFilter,
        minBalanceFilter
      ))
      .groupBy(customers.id, sql`abonos_lateral.total_paid`)
      .having(sql`COALESCE(SUM(${creditSalesExpression}), 0) - COALESCE(abonos_lateral.total_paid, 0) > 0`)
      .orderBy(desc(sql`COALESCE(SUM(${creditSalesExpression}), 0) - COALESCE(abonos_lateral.total_paid, 0)`))
      .limit(filters?.limit ?? 100)
      .offset(filters?.offset ?? 0);

    return customersWithDebt.map((row) => ({
      customer: row.customer,
      totalDebt: Number(row.totalDebt),
      totalSales: Number(row.totalSales),
      totalPayments: Number(row.totalPayments),
      lastSaleDate: row.lastSaleDate,
    }));
  }

  async getTotalAccountsReceivable(ctx: RequestContext): Promise<number> {
    const result = await db
      .select({
        totalBalance: sql<string>`COALESCE(SUM(GREATEST(
          COALESCE((
            SELECT SUM(CASE WHEN ${sales.saleType} = 'credito' THEN ${sales.totalAmount} ELSE 0 END) 
            FROM ${sales} 
            WHERE ${sales.customerId} = ${customers.id} 
            AND ${sales.businessId} = ${ctx.businessId}
            AND ${sales.status} <> 'cancelled'
            AND ${sales.status} <> 'draft'
          ), 0) - COALESCE((
            SELECT SUM(${abonos.amount}) 
            FROM ${abonos} 
            WHERE ${abonos.customerId} = ${customers.id} 
            AND ${abonos.businessId} = ${ctx.businessId}
          ), 0),
          0
        )), 0)`,
      })
      .from(customers)
      .where(eq(customers.businessId, ctx.businessId));

    return Number(result[0]?.totalBalance ?? 0);
  }

  async getBalance(ctx: RequestContext, customerId: string): Promise<{ totalSales: number; totalPayments: number; balanceDue: number }> {
    // Use explicit numeric casting to avoid "no parameter $1" error with decimal columns in aggregations
    const salesResult = await db
      .select({ total: sql<string>`COALESCE(SUM(CASE WHEN ${sales.saleType} = 'credito' THEN ${sales.totalAmount}::numeric ELSE 0 END), '0')` })
      .from(sales)
      .where(and(
        eq(sales.businessId, ctx.businessId),
        eq(sales.customerId, customerId),
        ne(sales.status, "cancelled"),
        ne(sales.status, "draft")
      ));

    const paymentsResult = await db
      .select({ total: sql<string>`COALESCE(SUM(${abonos.amount}::numeric), '0')` })
      .from(abonos)
      .where(and(
        eq(abonos.businessId, ctx.businessId),
        eq(abonos.customerId, customerId)
      ));

    const totalSales = Number(salesResult[0]?.total ?? 0);
    const totalPayments = Number(paymentsResult[0]?.total ?? 0);

    return {
      totalSales,
      totalPayments,
      balanceDue: Math.max(totalSales - totalPayments, 0),
    };
  }
}
