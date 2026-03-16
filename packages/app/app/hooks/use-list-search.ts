import { useState, useMemo, useCallback } from "react";
import { filterBySearch, useDebounce } from "~/lib/search";
import type { SearchableField } from "~/lib/search";

/**
 * Parameters for the useListSearch hook
 */
export interface UseListSearchParams<T> {
  /** The items to filter */
  items: T[] | undefined;
  /** Fields to search against */
  searchFields: SearchableField<T>[];
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Initial search value */
  initialSearch?: string;
}

/**
 * Return type for the useListSearch hook
 */
export interface UseListSearchResult<T> {
  /** The filtered items based on search */
  filteredItems: T[];
  /** Current search value */
  search: string;
  /** Debounced search value (for use in effects) */
  debouncedSearch: string;
  /** Function to update search value */
  setSearch: (value: string | ((prev: string) => string)) => void;
  /** Whether search is active (has value) */
  isSearching: boolean;
  /** Number of items before filtering */
  totalCount: number;
  /** Number of items after filtering */
  filteredCount: number;
}

/**
 * Generic hook for filtering lists with search functionality
 * Combines filtering and debouncing in one easy-to-use hook
 *
 * @param params - Configuration parameters
 * @returns Object with filtered items and search controls
 *
 * @example
 * // Basic usage with customers
 * const { filteredItems, search, setSearch, isSearching } = useListSearch({
 *   items: customers,
 *   searchFields: [(c) => c.name, (c) => c.dni, (c) => c.phone]
 * });
 *
 * // With custom debounce
 * const { filteredItems, debouncedSearch } = useListSearch({
 *   items: products,
 *   searchFields: [(p) => p.name, (p) => p.sku],
 *   debounceMs: 500
 * });
 */
export function useListSearch<T>({
  items,
  searchFields,
  debounceMs = 300,
  initialSearch = "",
}: UseListSearchParams<T>): UseListSearchResult<T> {
  const [search, setSearch] = useState(initialSearch);

  // Debounce the search value for expensive operations
  const debouncedSearch = useDebounce(search, debounceMs);

  // Filter items based on debounced search
  const filteredItems = useMemo(() => {
    if (!items || items.length === 0) {
      return [];
    }

    return filterBySearch(items, {
      search: debouncedSearch,
      fields: searchFields,
    });
  }, [items, debouncedSearch, searchFields]);

  // Stable setter that handles both direct values and updater functions
  const handleSetSearch = useCallback(
    (value: string | ((prev: string) => string)) => {
      setSearch((prev) => {
        if (typeof value === "function") {
          return value(prev);
        }
        return value;
      });
    },
    []
  );

  return {
    filteredItems,
    search,
    debouncedSearch,
    setSearch: handleSetSearch,
    isSearching: search.length > 0,
    totalCount: items?.length ?? 0,
    filteredCount: filteredItems.length,
  };
}
