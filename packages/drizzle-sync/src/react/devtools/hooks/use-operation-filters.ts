import { useState, useMemo } from "react";
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

export const ENTITY_FILTER_OPTIONS = ["all", "customers", "products", "sales", "purchases", "suppliers"];

export function getEntityLabel(entity: string): string {
  return entity;
}

export function useOperationFilters(operations: SyncOperation[]) {
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

  const filteredOperations = useMemo(() => {
    let result = [...operations];

    if (filters.status !== "all") {
      result = result.filter((op) => op.status === filters.status);
    }

    if (filters.entityType !== "all") {
      result = result.filter((op) => op.entity_type === filters.entityType);
    }

    if (filters.minRetries > 0) {
      result = result.filter((op) => op.sync_attempts >= filters.minRetries);
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
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

  const setStatusFilter = (status: FilterStatus) => setFilters((f) => ({ ...f, status }));
  const setEntityTypeFilter = (entityType: string) => setFilters((f) => ({ ...f, entityType }));
  const setMinAgeFilter = (minAge: string) => setFilters((f) => ({ ...f, minAge }));
  const setMinRetriesFilter = (minRetries: number) => setFilters((f) => ({ ...f, minRetries }));
  const setSortField = (field: SortField) => setSort((s) => ({ ...s, field }));
  const toggleSortDirection = () => setSort((s) => ({ ...s, direction: s.direction === "asc" ? "desc" : "asc" }));
  const resetFilters = () => setFilters({ status: "all", entityType: "all", minAge: "< 1d", minRetries: 0 });

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
