import { useMemo } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { filterBySearch, useDebounce } from "~/lib/search";
import type { Asset } from "~/hooks/use-assets";

interface UseAssetFiltersParams {
  assets?: Asset[] | undefined;
  debounceMs?: number;
}

interface UseAssetFiltersResult {
  /** Raw search input value */
  search: string;
  /** Setter for search input */
  setSearch: (value: string) => void;
  /** Debounced search for filtering */
  debouncedSearch: string;
  /** Whether user is actively searching */
  isSearching: boolean;
  /** Assets filtered by search query */
  filteredAssets: Asset[];
}

/**
 * Manages asset search state via URL query params (nuqs).
 * Persists search across reloads and enables shareable URLs.
 */
export function useAssetFilters({
  assets,
  debounceMs = 300,
}: UseAssetFiltersParams = {}): UseAssetFiltersResult {
  const [search, setSearchRaw] = useQueryState(
    "q",
    parseAsString.withDefault("")
  );

  const debouncedSearch = useDebounce(search, debounceMs);

  const filteredAssets = useMemo(() => {
    if (!assets || assets.length === 0) {
      return [];
    }

    return filterBySearch(assets, {
      search: debouncedSearch,
      fields: [(asset) => asset.filename],
    });
  }, [assets, debouncedSearch]);

  const setSearch = (value: string) => {
    setSearchRaw(value || null);
  };

  return {
    search,
    setSearch,
    debouncedSearch,
    isSearching: search.length > 0,
    filteredAssets,
  };
}
