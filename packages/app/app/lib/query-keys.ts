/**
 * Query key factory for TanStack Query.
 *
 * All query keys MUST be created through this factory to ensure
 * consistent invalidation and caching across the application.
 *
 * Usage:
 *   queryKey: queryKeys.customers.all
 *   queryKey: queryKeys.sales.detail(id)
 *   queryClient.invalidateQueries({ queryKey: queryKeys.sales.all })
 */

/**
 * Dashboard period parameters.
 */
export interface PeriodParams {
  type: string;
  startDate?: string;
  endDate?: string;
}

export const queryKeys = {
  sales: {
    all: ["sales"] as const,
    lists: (filters: object) => ["sales", "list", filters] as const,
    detail: (id: string) => ["sales", id] as const,
    byCustomer: (customerId: string) => ["sales", "customer", customerId] as const,
    byStatus: (status: string) => ["sales", "status", status] as const,
  },
  customers: {
    all: ["customers"] as const,
    detail: (id: string) => ["customers", id] as const,
    search: (filters: object) => ["customers", "search", filters] as const,
    page: (query: object) => ["customers", "page", query] as const,
    tags: (customerIds: string[]) => ["customers", "tags", customerIds] as const,
  },
  products: {
    all: ["products"] as const,
    detail: (id: string) => ["products", id] as const,
  },
  tags: {
    all: ["tags"] as const,
    detail: (id: string) => ["tags", id] as const,
  },
  productCategories: {
    all: ["product-categories"] as const,
    detail: (id: string) => ["product-categories", id] as const,
  },
  customerTags: {
    detail: (customerId: string) => ["customer-tags", customerId] as const,
  },
  customerGroups: {
    all: ["customer-groups"] as const,
    detail: (id: string) => ["customer-groups", id] as const,
    members: (id: string) => ["customer-groups", id, "members"] as const,
  },
  suppliers: {
    all: ["suppliers"] as const,
    detail: (id: string) => ["suppliers", id] as const,
    search: (term: string | null) => ["suppliers", "search", term] as const,
  },
  purchases: {
    all: ["purchases"] as const,
    detail: (id: string) => ["purchases", id] as const,
    bySupplier: (supplierId: string) => ["purchases", "supplier", supplierId] as const,
    byStatus: (status: string) => ["purchases", "status", status] as const,
  },
  variants: {
    byProduct: (productId: string) => ["products", productId, "variants"] as const,
    detail: (id: string) => ["variants", id] as const,
  },
  inventory: {
    all: ["variant-inventory"] as const,
    detail: (variantId: string) => ["variant-inventory", variantId] as const,
  },
  visitas: {
    byDistribucion: (distribucionId: string) => ["visitas", distribucionId] as const,
  },
  payments: {
    all: ["payments"] as const,
    customer: (customerId: string) => ["payments", "customer", customerId] as const,
    detail: (id: string | null) => ["payments", id] as const,
  },
  distribuciones: {
    all: ["distribuciones"] as const,
    detail: (id: string) => ["distribuciones", id] as const,
    seller: (vendedorId: string) => ["distribuciones", "seller", vendedorId] as const,
    active: (vendedorId: string) => ["distribuciones", "active", vendedorId] as const,
    mine: (vendedorId: string, fecha?: string) => ["distribuciones", "mine", vendedorId, fecha] as const,
  },
  dashboard: {
    stats: (period: PeriodParams) => ["dashboard", "stats", period] as const,
    debtors: ["dashboard", "debtors"] as const,
    chart: (period: PeriodParams) => ["dashboard", "chart", period] as const,
  },
  reports: {
    accountsReceivable: (filters: object) =>
      ["reports", "accounts-receivable", filters] as const,
    accountsReceivableTotal: (filters: object) =>
      ["reports", "accounts-receivable", "total", filters] as const,
  },
} as const;
