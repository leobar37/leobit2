"use client";

import * as React from "react";
import { Calendar as CalendarIcon, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { cn } from "~/lib/utils";
import { parseDateString, toDateString, formatDisplayDate } from "~/lib/date-utils";

export type PeriodType = "day" | "week" | "month" | "range";

export interface PeriodValue {
  type: PeriodType;
  startDate?: string;
  endDate?: string;
}

interface PeriodSelectorProps {
  value: PeriodValue;
  onChange: (period: PeriodValue) => void;
  className?: string;
}

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "range", label: "Rango" },
];

export function PeriodSelector({ value, onChange, className }: PeriodSelectorProps) {
  const [rangeDrawerOpen, setRangeDrawerOpen] = React.useState(false);
  const [tempRange, setTempRange] = React.useState<{ start?: Date; end?: Date }>({});

  // Get label for current period
  const getPeriodLabel = () => {
    if (value.type === "range" && value.startDate && value.endDate) {
      const start = formatDisplayDate(value.startDate);
      const end = formatDisplayDate(value.endDate);
      return `${start} - ${end}`;
    }
    return PERIOD_OPTIONS.find((p) => p.value === value.type)?.label || "Día";
  };

  // Handle period type change
  const handleTypeChange = (type: PeriodType) => {
    if (type === "range") {
      setTempRange({
        start: value.startDate ? parseDateString(value.startDate) : new Date(),
        end: value.endDate ? parseDateString(value.endDate) : new Date(),
      });
      setRangeDrawerOpen(true);
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let startDate = today;
      let endDate = today;

      if (type === "week") {
        // Start of week (Monday)
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(today.setDate(diff));
        endDate = new Date();
      } else if (type === "month") {
        // Start of month
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date();
      }

      onChange({
        type,
        startDate: toDateString(startDate),
        endDate: toDateString(endDate),
      });
    }
  };

  // Handle range selection
  const handleRangeSelect = (date: Date | undefined, isStart: boolean) => {
    if (!date) return;

    if (isStart) {
      setTempRange((prev) => ({ ...prev, start: date }));
      // If end is before start, clear end
      if (tempRange.end && date > tempRange.end) {
        setTempRange((prev) => ({ ...prev, end: undefined }));
      }
    } else {
      setTempRange((prev) => ({ ...prev, end: date }));
    }
  };

  // Apply range selection
  const applyRange = () => {
    if (tempRange.start && tempRange.end) {
      onChange({
        type: "range",
        startDate: toDateString(tempRange.start),
        endDate: toDateString(tempRange.end),
      });
      setRangeDrawerOpen(false);
    }
  };

  // Check if range is valid
  const isRangeValid = tempRange.start && tempRange.end;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Period Type Selector */}
      <div className="flex items-center gap-2">
        <div className="grid flex-1 grid-cols-4 rounded-lg border border-border bg-muted/25 p-1">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleTypeChange(option.value)}
              className={cn(
                "min-h-[42px] rounded-md px-2 py-2 text-sm font-medium transition-colors touch-manipulation",
                value.type === option.value
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Period Label (for range) */}
      {value.type === "range" && (
        <button
          onClick={() => handleTypeChange("range")}
          className={cn(
            "w-full flex items-center justify-between",
            "rounded-xl px-4 py-3",
            "border border-orange-200 bg-orange-50/80 text-sm font-medium text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200",
            "active:scale-[0.99] transition-transform"
          )}
        >
          <span className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {getPeriodLabel()}
          </span>
          <ChevronDown className="h-4 w-4" />
        </button>
      )}

      {/* Range Selection Drawer */}
      <Drawer open={rangeDrawerOpen} onOpenChange={setRangeDrawerOpen}>
        <DrawerContent className="flex max-h-[90vh] w-full flex-col rounded-t-[24px]">
          <DrawerHeader className="flex-shrink-0 border-b border-border/60 px-4 pb-3 pt-2">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-lg font-semibold text-foreground">
                Seleccionar rango
              </DrawerTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setRangeDrawerOpen(false)}
                className="rounded-full h-9 w-9"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto">
            {/* Start Date */}
            <div className="border-b border-border/60 p-4">
              <p className="mb-3 text-sm font-medium text-foreground">
                Fecha de inicio
              </p>
              <div className="shell-card-flat rounded-xl p-3">
                <Calendar
                  mode="single"
                  selected={tempRange.start}
                  onSelect={(date) => handleRangeSelect(date, true)}
                  initialFocus={false}
                  className={cn(
                    "border-0 w-full",
                    "[&_.rdp-caption]:text-foreground",
                    "[&_.rdp-caption]:font-semibold",
                    "[&_.rdp-caption]:text-base",
                    "[&_.rdp-nav_button]:w-8",
                    "[&_.rdp-nav_button]:h-8",
                    "[&_.rdp-nav_button]:rounded-full",
                    "[&_.rdp-nav_button]:hover:bg-orange-50 [&_.rdp-nav_button]:dark:hover:bg-orange-500/10",
                    "[&_.rdp-head_cell]:text-muted-foreground",
                    "[&_.rdp-head_cell]:font-medium",
                    "[&_.rdp-head_cell]:text-xs",
                    "[&_.rdp-head_cell]:w-full",
                    "[&_.rdp-head_cell]:h-8",
                    "[&_.rdp-cell]:w-full",
                    "[&_.rdp-cell]:h-auto",
                    "[&_.rdp-cell]:aspect-square",
                    "[&_.rdp-button]:w-full",
                    "[&_.rdp-button]:h-full",
                    "[&_.rdp-button]:min-h-[44px]",
                    "[&_.rdp-button]:rounded-full",
                    "[&_.rdp-button]:text-sm",
                    "[&_.rdp-day_today]:bg-orange-100 [&_.rdp-day_today]:dark:bg-orange-500/15",
                    "[&_.rdp-day_today]:text-orange-700 [&_.rdp-day_today]:dark:text-orange-300",
                    "[&_.rdp-day_today]:font-semibold",
                    "[&_.rdp-day_today]:rounded-full",
                    "[&_.rdp-day_selected]:bg-orange-500 [&_.rdp-day_selected]:dark:bg-orange-400",
                    "[&_.rdp-day_selected]:text-white",
                    "[&_.rdp-day_selected]:font-semibold",
                    "[&_.rdp-day_selected]:rounded-full",
                    "[&_.rdp-day_selected:hover]:bg-orange-600 [&_.rdp-day_selected:hover]:dark:bg-orange-500",
                    "[&_.rdp-button:hover:not(.rdp-day_selected)]:bg-orange-50 [&_.rdp-button:hover:not(.rdp-day_selected)]:dark:bg-white/10",
                    "[&_.rdp-button:hover:not(.rdp-day_selected)]:text-foreground",
                    "[&_.rdp-disabled]:opacity-30",
                    "[&_.rdp-disabled]:cursor-not-allowed",
                    "[&_.rdp-day_outside]:text-gray-300 [&_.rdp-day_outside]:dark:text-white/20",
                    "[&_.rdp-table]:w-full"
                  )}
                />
              </div>
              {tempRange.start && (
                <p className="mt-2 text-sm text-orange-600 font-medium">
                  Inicio: {formatDisplayDate(toDateString(tempRange.start))}
                </p>
              )}
            </div>

            {/* End Date */}
            <div className="p-4">
              <p className="mb-3 text-sm font-medium text-foreground">
                Fecha de fin
              </p>
              <div className="shell-card-flat rounded-xl p-3">
                <Calendar
                  mode="single"
                  selected={tempRange.end}
                  onSelect={(date) => handleRangeSelect(date, false)}
                  disabled={(date) =>
                    tempRange.start ? date < tempRange.start : false
                  }
                  initialFocus={false}
                  className={cn(
                    "border-0 w-full",
                    "[&_.rdp-caption]:text-foreground",
                    "[&_.rdp-caption]:font-semibold",
                    "[&_.rdp-caption]:text-base",
                    "[&_.rdp-nav_button]:w-8",
                    "[&_.rdp-nav_button]:h-8",
                    "[&_.rdp-nav_button]:rounded-full",
                    "[&_.rdp-nav_button]:hover:bg-orange-50 [&_.rdp-nav_button]:dark:hover:bg-orange-500/10",
                    "[&_.rdp-head_cell]:text-muted-foreground",
                    "[&_.rdp-head_cell]:font-medium",
                    "[&_.rdp-head_cell]:text-xs",
                    "[&_.rdp-head_cell]:w-full",
                    "[&_.rdp-head_cell]:h-8",
                    "[&_.rdp-cell]:w-full",
                    "[&_.rdp-cell]:h-auto",
                    "[&_.rdp-cell]:aspect-square",
                    "[&_.rdp-button]:w-full",
                    "[&_.rdp-button]:h-full",
                    "[&_.rdp-button]:min-h-[44px]",
                    "[&_.rdp-button]:rounded-full",
                    "[&_.rdp-button]:text-sm",
                    "[&_.rdp-day_today]:bg-orange-100 [&_.rdp-day_today]:dark:bg-orange-500/15",
                    "[&_.rdp-day_today]:text-orange-700 [&_.rdp-day_today]:dark:text-orange-300",
                    "[&_.rdp-day_today]:font-semibold",
                    "[&_.rdp-day_today]:rounded-full",
                    "[&_.rdp-day_selected]:bg-orange-500 [&_.rdp-day_selected]:dark:bg-orange-400",
                    "[&_.rdp-day_selected]:text-white",
                    "[&_.rdp-day_selected]:font-semibold",
                    "[&_.rdp-day_selected]:rounded-full",
                    "[&_.rdp-day_selected:hover]:bg-orange-600 [&_.rdp-day_selected:hover]:dark:bg-orange-500",
                    "[&_.rdp-button:hover:not(.rdp-day_selected)]:bg-orange-50 [&_.rdp-button:hover:not(.rdp-day_selected)]:dark:bg-white/10",
                    "[&_.rdp-button:hover:not(.rdp-day_selected)]:text-foreground",
                    "[&_.rdp-disabled]:opacity-30",
                    "[&_.rdp-disabled]:cursor-not-allowed",
                    "[&_.rdp-day_outside]:text-gray-300 [&_.rdp-day_outside]:dark:text-white/20",
                    "[&_.rdp-table]:w-full"
                  )}
                />
              </div>
              {tempRange.end && (
                <p className="mt-2 text-sm text-orange-600 font-medium">
                  Fin: {formatDisplayDate(toDateString(tempRange.end))}
                </p>
              )}
            </div>
          </div>

          <DrawerFooter className="pt-2 pb-6 flex-shrink-0 px-4">
            <Button
              type="button"
              onClick={applyRange}
              disabled={!isRangeValid}
              className={cn(
                "w-full rounded-xl h-12 font-medium",
                "bg-orange-500 text-white hover:bg-orange-600",
                "disabled:bg-gray-200 disabled:text-gray-500 dark:disabled:bg-white/10 dark:disabled:text-white/35"
              )}
            >
              Aplicar rango
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRangeDrawerOpen(false)}
              className="h-12 w-full rounded-xl border-border/70 text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
