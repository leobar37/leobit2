import type { AccountsReceivableFilters } from "~/hooks/use-accounts-receivable";
import type { CustomerPageQuery } from "~/hooks/use-customers";

export const DEFAULT_CUSTOMERS_PREFETCH_QUERY: CustomerPageQuery = {
  search: undefined,
  tagIds: [],
  groupIds: [],
  limit: 100,
  offset: 0,
  sortBy: "createdAt",
  sortOrder: "desc",
};

export const DEFAULT_ACCOUNTS_RECEIVABLE_PREFETCH_FILTERS: AccountsReceivableFilters = {
  search: undefined,
  minBalance: 0.01,
  limit: 100,
  offset: 0,
};

export const DEFAULT_ACCOUNTS_RECEIVABLE_TOTAL_PREFETCH_FILTERS: AccountsReceivableFilters = {
  search: undefined,
  minBalance: 0.01,
};
