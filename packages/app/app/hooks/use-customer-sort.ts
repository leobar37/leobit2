/**
 * Customer Sort Hook
 * URL-based sort state using nuqs.
 * Sort is persisted in the URL query string (?sort=name:asc),
 * making it shareable, bookmarkable, and back-button friendly.
 */

import { useQueryState, parseAsString } from "nuqs";
import { useMemo, useCallback } from "react";

export type CustomerSortField = "name" | "lastSaleDate" | "debt" | "createdAt";
export type SortOrder = "asc" | "desc";

const VALID_SORT_FIELDS: CustomerSortField[] = ["name", "lastSaleDate", "debt", "createdAt"];
const VALID_ORDERS: SortOrder[] = ["asc", "desc"];

export interface CustomerSortState {
  field: CustomerSortField;
  order: SortOrder;
  sortParam: string;
}

export interface CustomerSortActions {
  setSort: (field: CustomerSortField, order: SortOrder) => void;
  toggleSort: (field: CustomerSortField) => void;
}

export type CustomerSortResult = CustomerSortState & CustomerSortActions;

/**
 * Parses a sort parameter string like "name:asc" into field and order.
 * Falls back to "createdAt:desc" for invalid values.
 */
function parseSortParam(param: string): { field: CustomerSortField; order: SortOrder } {
  const [rawField, rawOrder] = param.split(":");

  const field = VALID_SORT_FIELDS.includes(rawField as CustomerSortField)
    ? (rawField as CustomerSortField)
    : "createdAt";

  const order = VALID_ORDERS.includes(rawOrder as SortOrder)
    ? (rawOrder as SortOrder)
    : "desc";

  return { field, order };
}

/**
 * Hook for customer list sorting via URL query params.
 *
 * @example
 * const { field, order, toggleSort } = useCustomerSort();
 * // URL: /clientes?sort=debt:desc
 */
export function useCustomerSort(): CustomerSortResult {
  const [sortRaw, setSortRaw] = useQueryState(
    "sort",
    parseAsString.withDefault("createdAt:desc")
  );

  const { field, order } = useMemo(() => parseSortParam(sortRaw), [sortRaw]);

  const setSort = useCallback(
    (newField: CustomerSortField, newOrder: SortOrder) => {
      setSortRaw(`${newField}:${newOrder}`);
    },
    [setSortRaw]
  );

  const toggleSort = useCallback(
    (newField: CustomerSortField) => {
      if (field === newField) {
        setSortRaw(`${newField}:${order === "asc" ? "desc" : "asc"}`);
      } else {
        setSortRaw(`${newField}:desc`);
      }
    },
    [field, order, setSortRaw]
  );

  return {
    field,
    order,
    sortParam: sortRaw,
    setSort,
    toggleSort,
  };
}
