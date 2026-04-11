import { useCallback } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { useDebounce } from "~/lib/search";

type TabFilter = "all" | "mine" | "free" | "drafts";
type TypeFilter = "" | "ventas" | "pedidos";
type SaleTypeFilter = "" | "contado" | "credito";

interface UseSaleFiltersParams {
  miDistribucionId?: string | undefined;
  debounceMs?: number;
}

interface UseSaleFiltersResult {
  tab: TabFilter;
  setTab: (value: TabFilter) => void;
  tipo: TypeFilter;
  setTipo: (value: TypeFilter) => void;
  search: string;
  setSearch: (value: string) => void;
  debouncedSearch: string;
  isSearching: boolean;
  isFiltering: boolean;
  saleType: SaleTypeFilter;
  setSaleType: (value: SaleTypeFilter) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  hasBalanceDue: boolean;
  setHasBalanceDue: (value: boolean) => void;
  clearAdvancedFilters: () => void;
  activeFilterCount: number;
}

const VALID_TABS: TabFilter[] = ["all", "mine", "free", "drafts"];
const VALID_TIPOS: TypeFilter[] = ["", "ventas", "pedidos"];
const VALID_SALE_TYPES: SaleTypeFilter[] = ["", "contado", "credito"];

export function useSaleFilters({
  miDistribucionId,
  debounceMs = 300,
}: UseSaleFiltersParams): UseSaleFiltersResult {
  const [tabRaw, setTabRaw] = useQueryState("tab", parseAsString.withDefault("all"));
  const [tipoRaw, setTipoRaw] = useQueryState("tipo", parseAsString.withDefault(""));
  const [search, setSearchRaw] = useQueryState("q", parseAsString.withDefault(""));
  const [saleTypeRaw, setSaleTypeRaw] = useQueryState("tipoVenta", parseAsString.withDefault(""));
  const [startDate, setStartDateRaw] = useQueryState("desde", parseAsString.withDefault(""));
  const [endDate, setEndDateRaw] = useQueryState("hasta", parseAsString.withDefault(""));
  const [hasBalanceDueRaw, setHasBalanceDueRaw] = useQueryState("debe", parseAsString.withDefault(""));

  const tab: TabFilter = VALID_TABS.includes(tabRaw as TabFilter)
    ? (tabRaw as TabFilter)
    : "all";
  const tipo: TypeFilter = VALID_TIPOS.includes(tipoRaw as TypeFilter)
    ? (tipoRaw as TypeFilter)
    : "";
  const saleType: SaleTypeFilter = VALID_SALE_TYPES.includes(saleTypeRaw as SaleTypeFilter)
    ? (saleTypeRaw as SaleTypeFilter)
    : "";
  const hasBalanceDue = hasBalanceDueRaw === "1";

  const debouncedSearch = useDebounce(search, debounceMs);

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

  const setSaleType = useCallback(
    (value: SaleTypeFilter) => {
      setSaleTypeRaw(value || null);
    },
    [setSaleTypeRaw]
  );

  const setStartDate = useCallback(
    (value: string) => {
      setStartDateRaw(value || null);
    },
    [setStartDateRaw]
  );

  const setEndDate = useCallback(
    (value: string) => {
      setEndDateRaw(value || null);
    },
    [setEndDateRaw]
  );

  const setHasBalanceDue = useCallback(
    (value: boolean) => {
      setHasBalanceDueRaw(value ? "1" : null);
    },
    [setHasBalanceDueRaw]
  );

  const clearAdvancedFilters = useCallback(() => {
    setSaleTypeRaw(null);
    setStartDateRaw(null);
    setEndDateRaw(null);
    setHasBalanceDueRaw(null);
  }, [setSaleTypeRaw, setStartDateRaw, setEndDateRaw, setHasBalanceDueRaw]);

  const activeFilterCount =
    (saleType !== "" ? 1 : 0) +
    (startDate !== "" ? 1 : 0) +
    (hasBalanceDue ? 1 : 0);

  return {
    tab,
    setTab,
    tipo,
    setTipo,
    search,
    setSearch,
    debouncedSearch,
    isSearching: search.length > 0,
    isFiltering: tab !== "all" || tipo !== "",
    saleType,
    setSaleType,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    hasBalanceDue,
    setHasBalanceDue,
    clearAdvancedFilters,
    activeFilterCount,
  };
}
