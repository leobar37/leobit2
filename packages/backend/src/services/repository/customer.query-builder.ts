/**
 * Customer Query Builder
 * Composable query builders for customer list operations.
 * Separates filter logic, metric calculations, and sorting for maintainability.
 */

import { SQL, sql, asc, desc, eq, and, inArray } from "drizzle-orm";
import { customers, sales, abonos, customerTags } from "../../db/schema";
import { db } from "../../lib/db";
import type { RequestContext } from "../../context/request-context";

// ============================================================================
// Types
// ============================================================================

export type CustomerSortField = "name" | "lastSaleDate" | "debt" | "createdAt";
export type SortOrder = "asc" | "desc";

export interface CustomerListFilters {
  search?: string;
  limit?: number;
  offset?: number;
  customerIds?: string[];
  tagIds?: string[];
  sortBy?: CustomerSortField;
  sortOrder?: SortOrder;
}

export interface CustomerMetrics {
  totalDebt: SQL<number>;
  lastSaleDate: SQL<Date | null>;
}

// ============================================================================
// Filter Builders
// ============================================================================

/**
 * Builds the search condition for customer name, phone, or DNI.
 */
export function buildSearchCondition(search?: string): SQL | undefined {
  if (!search) return undefined;

  return sql`(
    ${customers.name} ILIKE ${`%${search}%`}
    OR ${customers.phone} ILIKE ${`%${search}%`}
    OR ${customers.dni} ILIKE ${`%${search}%`}
  )`;
}

/**
 * Resolves tag IDs to customer IDs via JOIN.
 * Returns undefined if no tagIds provided, empty array if no matches.
 */
export async function resolveTagCustomerIds(
  ctx: RequestContext,
  tagIds?: string[]
): Promise<string[] | undefined> {
  if (!tagIds || tagIds.length === 0) return undefined;

  const rows = await db
    .select({ customerId: customerTags.customerId })
    .from(customerTags)
    .innerJoin(customers, eq(customerTags.customerId, customers.id))
    .where(
      and(
        inArray(customerTags.tagId, tagIds),
        eq(customers.businessId, ctx.businessId)
      )
    )
    .groupBy(customerTags.customerId)
    .having(sql`count(distinct ${customerTags.tagId}) = ${tagIds.length}`);

  const ids = rows.map((r) => r.customerId);
  return ids.length > 0 ? ids : [];
}

/**
 * Combines customerIds filter with tag-resolved IDs.
 * Returns undefined if no filtering needed, [] if intersection is empty.
 */
export function mergeCustomerIdFilters(
  customerIds?: string[],
  tagCustomerIds?: string[]
): string[] | undefined {
  if (tagCustomerIds?.length === 0) return [];
  if (!customerIds && !tagCustomerIds) return undefined;
  if (!customerIds) return tagCustomerIds;
  if (!tagCustomerIds) return customerIds;

  const merged = customerIds.filter((id) => tagCustomerIds.includes(id));
  return merged.length > 0 ? merged : [];
}

// ============================================================================
// Metric Builders
// ============================================================================

/**
 * SQL expression: credit sales amount per customer.
 */
export function buildCreditSalesExpression(): SQL {
  return sql`CASE WHEN ${sales.saleType} = 'credito' THEN ${sales.totalAmount} ELSE 0 END`;
}

/**
 * Builds the LATERAL JOIN subquery for total payments (abonos).
 */
export function buildAbonosLateralJoin(businessId: string): SQL {
  return sql`LATERAL (
    SELECT COALESCE(SUM(${abonos.amount}), 0) AS total_paid
    FROM ${abonos}
    WHERE ${abonos.customerId} = ${customers.id}
      AND ${abonos.businessId} = ${businessId}
  ) AS abonos_lateral`;
}

/**
 * Reusable customer metrics (totalDebt, lastSaleDate).
 */
export function buildCustomerMetrics(): CustomerMetrics {
  const creditSalesExpr = buildCreditSalesExpression();

  return {
    totalDebt: sql<number>`COALESCE(SUM(${creditSalesExpr}), 0) - COALESCE(abonos_lateral.total_paid, 0)`,
    lastSaleDate: sql<Date | null>`MAX(${sales.saleDate})`,
  };
}

// ============================================================================
// Sort Builder
// ============================================================================

/**
 * Maps sort fields to SQL order-by expressions.
 * New sort fields are added here — no switch statements in the repository.
 */
const SORT_BUILDERS: Record<
  CustomerSortField,
  (order: SortOrder) => SQL
> = {
  name: (order) => (order === "asc" ? asc(customers.name) : desc(customers.name)),
  createdAt: (order) =>
    order === "asc" ? asc(customers.createdAt) : desc(customers.createdAt),
  lastSaleDate: (order) =>
    order === "asc"
      ? asc(sql`MAX(${sales.saleDate})`)
      : desc(sql`MAX(${sales.saleDate})`),
  debt: (order) => {
    const { totalDebt } = buildCustomerMetrics();
    return order === "asc" ? asc(totalDebt) : desc(totalDebt);
  },
};

/**
 * Builds the ORDER BY clause for customer queries.
 * Falls back to createdAt desc for unknown fields.
 */
export function buildCustomerSort(
  field: CustomerSortField,
  order: SortOrder
): SQL {
  const builder = SORT_BUILDERS[field];
  return builder ? builder(order) : desc(customers.createdAt);
}

// ============================================================================
// Pagination
// ============================================================================

export function buildPagination(filters?: CustomerListFilters) {
  return {
    limit: filters?.limit ?? 100,
    offset: filters?.offset ?? 0,
  };
}
