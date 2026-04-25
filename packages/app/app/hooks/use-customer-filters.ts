import { useMemo } from "react";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { useQuery } from "@tanstack/react-query";
import { useEngineService } from "@avileo/drizzle-sync/react";
import { CustomerTagService } from "~/lib/services/customer-tag-service";
import { filterBySearch, useDebounce, type SearchableField } from "~/lib/search";
import type { Customers as Customer } from "~/lib/sync/generated/schema";

interface CustomerWithTagIds extends Customer {
  tagIds: string[];
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

const ALL_CUSTOMER_TAGS_KEY = ["all-customer-tags"] as const;

export function useCustomerFilters({
  customers,
  searchFields = [
    (customer) => customer.name,
    (customer) => customer.dni ?? undefined,
    (customer) => customer.phone ?? undefined,
  ],
  debounceMs = 300,
  loadTagRelations = true,
}: UseCustomerFiltersParams = {}): UseCustomerFiltersResult {
  const customerTagService = useEngineService<CustomerTagService>("customerTags");

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

  const { data: allCustomerTags } = useQuery({
    queryKey: ALL_CUSTOMER_TAGS_KEY,
    queryFn: async () => {
      return customerTagService.getAllCustomerTags();
    },
    staleTime: 1000 * 60,
    enabled: loadTagRelations,
  });

  const customersWithTagIds = useMemo<CustomerWithTagIds[]>(() => {
    if (!customers) return [];

    const tagMap = new Map<string, string[]>();
    for (const ct of allCustomerTags ?? []) {
      const existing = tagMap.get(ct.customerId) ?? [];
      existing.push(ct.tagId);
      tagMap.set(ct.customerId, existing);
    }

    return customers.map((customer) => ({
      ...customer,
      tagIds: tagMap.get(customer.id) ?? [],
    }));
  }, [customers, allCustomerTags]);

  const filteredCustomers = useMemo(() => {
    if (!customersWithTagIds || customersWithTagIds.length === 0) {
      return [];
    }

    const filtered = filterBySearch(customersWithTagIds, {
      search: debouncedSearch,
      fields: searchFields,
    });

    if (tagIds.length === 0) {
      return filtered;
    }

    return filtered.filter((customer) =>
      tagIds.every((tagId) => customer.tagIds.includes(tagId))
    );
  }, [customersWithTagIds, debouncedSearch, searchFields, tagIds]);

  const handleSetTagIds = (value: string[] | ((prev: string[]) => string[])) => {
    if (typeof value === "function") {
      setTagIds(value(tagIds));
    } else {
      setTagIds(value.length > 0 ? value : null);
    }
  };

  const handleSetGroupIds = (value: string[] | ((prev: string[]) => string[])) => {
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
