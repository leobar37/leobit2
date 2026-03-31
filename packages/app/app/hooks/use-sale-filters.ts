import { useCallback } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { useDebounce } from "~/lib/search";

type TabFilter = "all" | "mine" | "free" | "drafts";
type TypeFilter = "" | "ventas" | "pedidos";

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
}

const VALID_TABS: TabFilter[] = ["all", "mine", "free", "drafts"];
const VALID_TIPOS: TypeFilter[] = ["", "ventas", "pedidos"];

export function useSaleFilters({
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
    tab,
    setTab,
    tipo,
    setTipo,
    search,
    setSearch,
    debouncedSearch,
    isSearching: search.length > 0,
    isFiltering: tab !== "all" || tipo !== "",
  };
}
