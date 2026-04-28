import { useMemo } from "react";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { filterBySearch, useDebounce, type SearchableField } from "~/lib/search";

interface Customer {
  id: string;
  name: string;
  dni?: string | null;
  phone?: string | null;
}

interface UseCustomerFiltersParams {
  customers?: Customer[] | undefined;
  searchFields?: SearchableField<Customer>[];
  debounceMs?: number;
  loadTagRelations?: boolean;
}

interface UseCustomerFiltersResult {
  filteredCustomers: Customer[];
  tagIds: string[];
  setTagIds: (value: string[] | ((prev: string[]) => string[])) => void;
  groupIds: string[];
  setGroupIds: (value: string[] | ((prev: string[]) => string[])) => void;
  search: string;
  setSearch: (value: string | ((prev: string) => string)) => void;
  isSearching: boolean;
  isFiltering: boolean;
}

export function useCustomerFilters({
  customers,
  searchFields = [
    (customer) => customer.name,
    (customer) => customer.dni ?? undefined,
    (customer) => customer.phone ?? undefined,
  ],
  debounceMs = 300,
}: UseCustomerFiltersParams = {}): UseCustomerFiltersResult {
  const [tagIds, setTagIds] = useQueryState(
    "tags",
    parseAsArrayOf(parseAsString).withDefault([])
  );

  const [groupIds, setGroupIds] = useQueryState(
    "groups",
    parseAsArrayOf(parseAsString).withDefault([])
  );

  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("")
  );

  const debouncedSearch = useDebounce(search, debounceMs);

  const filteredCustomers = useMemo(() => {
    if (!customers || customers.length === 0) {
      return [];
    }

    return filterBySearch(customers, {
      search: debouncedSearch,
      fields: searchFields,
    });
  }, [customers, debouncedSearch, searchFields]);

  const handleSetTagIds = (
    value: string[] | ((prev: string[]) => string[])
  ) => {
    if (typeof value === "function") {
      setTagIds(value(tagIds));
    } else {
      setTagIds(value.length > 0 ? value : null);
    }
  };

  const handleSetGroupIds = (
    value: string[] | ((prev: string[]) => string[])
  ) => {
    if (typeof value === "function") {
      setGroupIds(value(groupIds));
    } else {
      setGroupIds(value.length > 0 ? value : null);
    }
  };

  const handleSetSearch = (value: string | ((prev: string) => string)) => {
    if (typeof value === "function") {
      const newValue = value(search);
      setSearch(newValue || null);
    } else {
      setSearch(value || null);
    }
  };

  return {
    filteredCustomers,
    tagIds,
    setTagIds: handleSetTagIds,
    groupIds,
    setGroupIds: handleSetGroupIds,
    search,
    setSearch: handleSetSearch,
    isSearching: search.length > 0,
    isFiltering: tagIds.length > 0 || groupIds.length > 0,
  };
}
