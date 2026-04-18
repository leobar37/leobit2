import { useState, useMemo, useCallback } from "react";
import type { SyncOperation } from "../types";

export type FilterStatus = "all" | "pending" | "processing" | "failed" | "conflict";

export type SortField = "created_at" | "sync_attempts" | "entity_type";
export type SortDirection = "asc" | "desc";

export interface OperationFilters {
  status: FilterStatus;
  entityType: string;
  minAge: string;
  minRetries: number;
}

export interface OperationSort {
  field: SortField;
  direction: SortDirection;
}

export interface UseOperationFiltersResult {
  filters: OperationFilters;
  sort: OperationSort;
  setStatusFilter: (status: FilterStatus) => void;
  setEntityTypeFilter: (entityType: string) => void;
  setMinAgeFilter: (age: string) => void;
  setMinRetriesFilter: (retries: number) => void;
  setSortField: (field: SortField) => void;
  toggleSortDirection: () => void;
  resetFilters: () => void;
  filteredOperations: SyncOperation[];
}

const AGE_THRESHOLDS: Record<string, number> = {
  "< 1min": 60 * 1000,
  "< 1h": 60 * 60 * 1000,
  "< 1d": 24 * 60 * 60 * 1000,
  "> 1d": Infinity,
};

const ALL_ENTITIES = [
  "all",
  "customers",
  "products",
  "product_variants",
  "suppliers",
  "sales",
  "sale_items",
  "purchases",
  "purchase_items",
  "abonos",
  "distribuciones",
  "distribucion_items",
  "tags",
  "customer_tags",
  "customer_groups",
  "customer_group_members",
  "visitas",
];

export function useOperationFilters(
  operations: SyncOperation[]
): UseOperationFiltersResult {
  const [filters, setFilters] = useState<OperationFilters>({
    status: "all",
    entityType: "all",
    minAge: "< 1d",
    minRetries: 0,
  });

  const [sort, setSort] = useState<OperationSort>({
    field: "created_at",
    direction: "desc",
  });

  const setStatusFilter = useCallback((status: FilterStatus) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setEntityTypeFilter = useCallback((entityType: string) => {
    setFilters((prev) => ({ ...prev, entityType }));
  }, []);

  const setMinAgeFilter = useCallback((minAge: string) => {
    setFilters((prev) => ({ ...prev, minAge }));
  }, []);

  const setMinRetriesFilter = useCallback((minRetries: number) => {
    setFilters((prev) => ({ ...prev, minRetries }));
  }, []);

  const setSortField = useCallback((field: SortField) => {
    setSort((prev) => ({ field, direction: prev.field === field ? prev.direction : "desc" }));
  }, []);

  const toggleSortDirection = useCallback(() => {
    setSort((prev) => ({
      ...prev,
      direction: prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      status: "all",
      entityType: "all",
      minAge: "< 1d",
      minRetries: 0,
    });
    setSort({ field: "created_at", direction: "desc" });
  }, []);

  const filteredOperations = useMemo(() => {
    if (!operations || operations.length === 0) {
      return [];
    }

    const now = Date.now();
    const ageThreshold = AGE_THRESHOLDS[filters.minAge] ?? Infinity;

    let result = operations.filter((op) => {
      if (filters.status !== "all" && op.status !== filters.status) {
        return false;
      }

      if (filters.entityType !== "all" && op.entity_type !== filters.entityType) {
        return false;
      }

      const opAge = now - new Date(op.created_at).getTime();
      if (opAge > ageThreshold) {
        return false;
      }

      if (filters.minRetries > 0 && op.sync_attempts < filters.minRetries) {
        return false;
      }

      return true;
    });

    result.sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case "created_at":
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "sync_attempts":
          comparison = a.sync_attempts - b.sync_attempts;
          break;
        case "entity_type":
          comparison = a.entity_type.localeCompare(b.entity_type);
          break;
      }

      return sort.direction === "asc" ? comparison : -comparison;
    });

    return result;
  }, [operations, filters, sort]);

  return {
    filters,
    sort,
    setStatusFilter,
    setEntityTypeFilter,
    setMinAgeFilter,
    setMinRetriesFilter,
    setSortField,
    toggleSortDirection,
    resetFilters,
    filteredOperations,
  };
}

export const ENTITY_FILTER_OPTIONS = ALL_ENTITIES;

export function getEntityLabel(entity: string): string {
  if (entity === "all") return "Todas";
  return entity.replace(/_/g, " ");
}
