import { useState } from "react";
import { ChevronDown, Filter, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { DateRangePicker } from "./date-range-picker";

type SaleTypeFilter = "" | "contado" | "credito";

interface SaleFilterSectionProps {
  saleType: SaleTypeFilter;
  onSaleTypeChange: (value: SaleTypeFilter) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  hasBalanceDue: boolean;
  onHasBalanceDueChange: (value: boolean) => void;
  activeFilterCount: number;
  onClearAll: () => void;
}

export function SaleFilterSection({
  saleType,
  onSaleTypeChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  hasBalanceDue,
  onHasBalanceDueChange,
  activeFilterCount,
  onClearAll,
}: SaleFilterSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="shell-card-soft flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/90 dark:hover:bg-white/[0.08]"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span
            className={cn(
              "text-sm",
              activeFilterCount > 0
                ? "font-medium text-foreground"
                : "text-muted-foreground"
            )}
          >
            Filtros
          </span>
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {isExpanded && (
        <div className="shell-card-soft space-y-5 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Filtros avanzados</p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
                Limpiar todo
              </button>
            )}
          </div>

          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={onStartDateChange}
            onEndDateChange={onEndDateChange}
          />

          <div className="space-y-3 border-t border-border/60 pt-4">
            <p className="text-sm font-medium">Tipo de pago</p>
            <div className="flex gap-2">
              {(
                [
                  { value: "" as SaleTypeFilter, label: "Todos" },
                  { value: "contado" as SaleTypeFilter, label: "Contado" },
                  { value: "credito" as SaleTypeFilter, label: "Crédito" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onSaleTypeChange(option.value)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    saleType === option.value
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-white/8 dark:text-muted-foreground dark:hover:bg-white/12 dark:hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t border-border/60 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Con deuda pendiente</p>
              <button
                type="button"
                role="switch"
                aria-checked={hasBalanceDue}
                onClick={() => onHasBalanceDueChange(!hasBalanceDue)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                  hasBalanceDue ? "bg-orange-500" : "bg-stone-200 dark:bg-white/12"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform",
                    hasBalanceDue ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
