import { useMemo, useCallback } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { filterBySearch, useDebounce, type SearchableField } from "~/lib/search";
import type { Sale, SaleWithItems } from "~/lib/services/sale-service";

type TabFilter = "all" | "mine" | "free" | "drafts";
type TypeFilter = "" | "ventas" | "pedidos";

interface UseSaleFiltersParams {
  sales: SaleWithItems[] | undefined;
  searchFields: SearchableField<SaleWithItems>[];
  miDistribucionId: string | undefined;
  debounceMs?: number;
}

interface UseSaleFiltersResult {
  filteredSales: SaleWithItems[];
  sortedSales: SaleWithItems[];
  tab: TabFilter;
  setTab: (value: TabFilter) => void;
  tipo: TypeFilter;
  setTipo: (value: TypeFilter) => void;
  search: string;
  setSearch: (value: string) => void;
  isSearching: boolean;
  isFiltering: boolean;
}

const VALID_TABS: TabFilter[] = ["all", "mine", "free", "drafts"];
const VALID_TIPOS: TypeFilter[] = ["", "ventas", "pedidos"];

export function useSaleFilters({
  sales,
  searchFields,
  miDistribucionId,
  debounceMs = 300,
}: UseSaleFiltersParams): UseSaleFiltersResult {
  // URL-persisted filter state using parseAsString with validation
  const [tabRaw, setTabRaw] = useQueryState("tab", parseAsString.withDefault("all"));
  const [tipoRaw, setTipoRaw] = useQueryState("tipo", parseAsString.withDefault(""));
  const [search, setSearchRaw] = useQueryState("q", parseAsString.withDefault(""));

  // Validate and coerce to correct types
  const tab: TabFilter = VALID_TABS.includes(tabRaw as TabFilter)
    ? (tabRaw as TabFilter)
    : "all";
  const tipo: TypeFilter = VALID_TIPOS.includes(tipoRaw as TypeFilter)
    ? (tipoRaw as TypeFilter)
    : "";

  const debouncedSearch = useDebounce(search, debounceMs);

  // Filter by tab (distribution/status)
  const tabFilteredSales = useMemo(() => {
    if (!sales) return [];

    if (tab === "mine" && miDistribucionId) {
      return sales.filter((s) => s.distribucionId === miDistribucionId);
    }
    if (tab === "free") {
      return sales.filter((s) => !s.distribucionId);
    }
    if (tab === "drafts") {
      return sales.filter((s) => s.status === "draft");
    }
    return sales;
  }, [sales, tab, miDistribucionId]);

  // Filter by type (instant_sale vs pre_order)
  const typeFilteredSales = useMemo(() => {
    if (tipo === "ventas") {
      return tabFilteredSales.filter((s) => s.type === "instant_sale");
    }
    if (tipo === "pedidos") {
      return tabFilteredSales.filter((s) => s.type === "pre_order");
    }
    return tabFilteredSales;
  }, [tabFilteredSales, tipo]);

  // Filter by search text
  const filteredSales = useMemo(() => {
    if (!typeFilteredSales || typeFilteredSales.length === 0) {
      return [];
    }
    return filterBySearch(typeFilteredSales, {
      search: debouncedSearch,
      fields: searchFields,
    });
  }, [typeFilteredSales, debouncedSearch, searchFields]);

  // Sort by creation date descending
  const sortedSales = useMemo(() => {
    return [...filteredSales].sort((a, b) => {
      const createdAtA = new Date(a.createdAt ?? a.saleDate).getTime();
      const createdAtB = new Date(b.createdAt ?? b.saleDate).getTime();

      if (createdAtA !== createdAtB) {
        return createdAtB - createdAtA;
      }

      const saleDateA = new Date(a.saleDate).getTime();
      const saleDateB = new Date(b.saleDate).getTime();
      return saleDateB - saleDateA;
    });
  }, [filteredSales]);

  // Setters with proper null handling for URL cleanup
  const setTab = useCallback(
    (value: TabFilter) => {
      setTabRaw(value === "all" ? null : value);
    },
    [setTabRaw]
  );

  const setTipo = useCallback(
    (value: TypeFilter) => {
      setTipoRaw(value || null);
    },
    [setTipoRaw]
  );

  const setSearch = useCallback(
    (value: string) => {
      setSearchRaw(value || null);
    },
    [setSearchRaw]
  );

  return {
    filteredSales: sortedSales,
    sortedSales,
    tab,
    setTab,
    tipo,
    setTipo,
    search,
    setSearch,
    isSearching: search.length > 0,
    isFiltering: tab !== "all" || tipo !== "",
  };
}
