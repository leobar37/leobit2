import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Trash2,
  CheckCircle,
  Copy,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import { useListSearch } from "~/hooks/use-list-search";
import { useOperationFilters, ENTITY_FILTER_OPTIONS, getEntityLabel, type FilterStatus, type SortField } from "../hooks/use-operation-filters";
import type { SyncOperation } from "../types";
import { OperationRow } from "../components/operation-row";

interface OperationsTabProps {
  operations: SyncOperation[];
  onDeleteOperation: (id: string) => void;
  onDeleteAll: () => void;
  canDelete: boolean;
}

const STATUS_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "processing", label: "Procesando" },
  { value: "failed", label: "Fallidos" },
  { value: "conflict", label: "Conflictos" },
];

const AGE_OPTIONS = ["< 1min", "< 1h", "< 1d", "> 1d"] as const;

export function OperationsTab({ operations, onDeleteOperation, onDeleteAll, canDelete }: OperationsTabProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [minRetriesInput, setMinRetriesInput] = useState("0");

  const {
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
  } = useOperationFilters(operations);

  const { filteredItems: searchedOperations, search, setSearch } = useListSearch({
    items: filteredOperations,
    searchFields: [
      (operation) => operation.entity_type,
      (operation) => operation.entity_id,
      (operation) => operation.operation,
      (operation) => operation.status,
      (operation) => operation.last_error ?? undefined,
    ],
    debounceMs: 150,
  });

  const handleMinRetriesChange = (value: string) => {
    setMinRetriesInput(value);
    const num = parseInt(value, 10);
    setMinRetriesFilter(isNaN(num) ? 0 : num);
  };

  const handleCopyJson = () => {
    const json = JSON.stringify(searchedOperations, null, 2);
    navigator.clipboard.writeText(json);
  };

  const activeFilterCount = [
    filters.status !== "all",
    filters.entityType !== "all",
    filters.minAge !== "< 1d",
    filters.minRetries > 0,
  ].filter(Boolean).length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-sm font-semibold">Operaciones con problema</h3>
            <p className="text-xs text-muted-foreground">
              Pendientes, fallidas o en conflicto
            </p>
          </div>
          <Button
            variant={showFilters ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-7 px-2 gap-1"
          >
            <FilterIcon className="h-3 w-3" />
            Filtros
            {activeFilterCount > 0 && (
              <Badge
                variant="default"
                className="h-4 w-4 p-0 text-[10px] bg-orange-500"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
        {operations.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground h-7 px-2"
              onClick={handleCopyJson}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copiar JSON
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2"
              onClick={onDeleteAll}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Eliminar todas
            </Button>
          </>
        )}
      </div>

      {showFilters && (
        <div className="mb-3 p-3 rounded-xl border bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Filtros activos
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Limpiar
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Estado</label>
              <Select
                value={filters.status}
                onValueChange={(v) => setStatusFilter(v as FilterStatus)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Entidad</label>
              <Select
                value={filters.entityType}
                onValueChange={setEntityTypeFilter}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_FILTER_OPTIONS.map((entity) => (
                    <SelectItem key={entity} value={entity}>
                      {getEntityLabel(entity)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Antigüedad</label>
              <Select
                value={filters.minAge}
                onValueChange={setMinAgeFilter}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGE_OPTIONS.map((age) => (
                    <SelectItem key={age} value={age}>
                      {age}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Mín. reintentos (≥3 = advertencia)
              </label>
              <Input
                type="number"
                min="0"
                value={minRetriesInput}
                onChange={(e) => handleMinRetriesChange(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Ordenar por:</span>
            {(["created_at", "sync_attempts", "entity_type"] as SortField[]).map((field) => (
              <button
                key={field}
                onClick={() => setSortField(field)}
                className={`px-1.5 py-0.5 rounded hover:bg-muted ${
                  sort.field === field ? "bg-orange-100 text-orange-700" : ""
                }`}
              >
                {field === "created_at" ? "Fecha" : field === "sync_attempts" ? "Reintentos" : "Entidad"}
                {sort.field === field && (
                  sort.direction === "asc" ? <ArrowUp className="h-3 w-3 inline" /> : <ArrowDown className="h-3 w-3 inline" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar operación..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 rounded-xl border-stone-200/80 bg-white/75 pl-10 pr-4"
        />
      </div>

      {searchedOperations.length > 0 && (
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            {searchedOperations.length} de {operations.length} operaciones
          </span>
          {activeFilterCount > 0 && (
            <span className="text-orange-600">
              {activeFilterCount} filtro{activeFilterCount > 1 ? "s" : ""} activo{activeFilterCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      <ScrollArea className="min-h-[140px] max-h-[40vh] border rounded-xl">
        {searchedOperations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>
              {search || activeFilterCount > 0
                ? "No se encontraron operaciones"
                : "No hay operaciones pendientes"}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {searchedOperations.map((op) => (
              <OperationRow
                key={op.id}
                operation={op}
                onDelete={onDeleteOperation}
                canDelete={canDelete}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}