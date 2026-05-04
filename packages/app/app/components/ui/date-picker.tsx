"use client";

import * as React from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerDescription } from "@/components/ui/drawer";
import { cn } from "~/lib/utils";
import { parseDateString, toDateString, formatDisplayDate } from "~/lib/date-utils";

interface DatePickerProps {
  value?: string;
  onChange?: (date: string) => void;
  label?: string;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  className?: string;
  quickActionLabels?: [string, string];
  fromYear?: number;
  toYear?: number;
}

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = "Seleccionar fecha",
  minDate,
  maxDate,
  disabled = false,
  className,
  quickActionLabels = ["Hoy", "Mañana"],
  fromYear,
  toYear,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = value ? parseDateString(value) : undefined;
  const min = minDate ? parseDateString(minDate) : undefined;
  const max = maxDate ? parseDateString(maxDate) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (date && onChange) {
      onChange(toDateString(date));
      setOpen(false);
    }
  };

  const isDateDisabled = (date: Date) => {
    if (min && date < min) return true;
    if (max && date > max) return true;
    return false;
  };

  const displayValue = value ? formatDisplayDate(value) : "";

  // Calculate year range for dropdowns
  const currentYear = new Date().getFullYear();
  const yearFrom = fromYear ?? currentYear - 10;
  const yearTo = toYear ?? currentYear + 2;

  // Calculate quick action dates based on minDate
  // Use start of day to avoid timezone issues
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // If minDate is set and is after today, use minDate as first quick action
  // Otherwise use today
  const firstQuickDate = min && min > today ? min : today;
  const secondQuickDate = new Date(firstQuickDate);
  secondQuickDate.setDate(secondQuickDate.getDate() + 1);

  const canSelectFirst = !isDateDisabled(firstQuickDate);
  const canSelectSecond = !isDateDisabled(secondQuickDate);
  
  return (
    <div className={cn("space-y-2", className)} data-testid="date-picker">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={disabled}
        data-testid="date-picker-trigger"
        className={cn(
          "w-full justify-start text-left font-normal rounded-xl h-12 px-4",
          "bg-background border-border hover:bg-accent hover:border-orange-300",
          "dark:hover:border-orange-500/50",
          "transition-colors",
          !value && "text-muted-foreground"
        )}
      >
        <CalendarIcon className="mr-3 h-5 w-5 text-orange-500" />
        <span className="flex-1" data-testid="date-picker-value">{displayValue || placeholder}</span>
        {value && (
          <span className="text-xs text-orange-600 font-medium">
            Cambiar
          </span>
        )}
      </Button>
      
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="w-full rounded-t-[24px] flex flex-col">
          <DrawerHeader className="border-b border-border px-4 pb-3 pt-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-lg font-semibold text-foreground">
                {label || "Seleccionar fecha"}
              </DrawerTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="rounded-full h-9 w-9"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
            <DrawerDescription className="text-left text-sm text-muted-foreground">
              Selecciona la fecha de entrega para el pedido
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pt-3 pb-2 flex-shrink-0">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSelect(firstQuickDate)}
                disabled={!canSelectFirst}
                data-testid="date-quick-action-1"
                className={cn(
                  "rounded-xl h-12 border-2",
                  "border-orange-200 hover:border-orange-500 hover:bg-orange-50",
                  "dark:border-orange-500/30 dark:hover:border-orange-400 dark:hover:bg-orange-500/10",
                  "text-foreground font-medium",
                  !canSelectFirst && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="text-orange-500 mr-2">●</span>
                {quickActionLabels[0]}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSelect(secondQuickDate)}
                disabled={!canSelectSecond}
                data-testid="date-quick-action-2"
                className={cn(
                  "rounded-xl h-12 border-2",
                  "border-orange-200 hover:border-orange-500 hover:bg-orange-50",
                  "dark:border-orange-500/30 dark:hover:border-orange-400 dark:hover:bg-orange-500/10",
                  "text-foreground font-medium",
                  !canSelectSecond && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="text-orange-400 mr-2">●</span>
                {quickActionLabels[1]}
              </Button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            <div className="p-4 bg-background">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleSelect}
                disabled={isDateDisabled}
                initialFocus
                captionLayout="dropdown"
                fromYear={yearFrom}
                toYear={yearTo}
                className={cn(
                  "border-0 w-full",
                  "[&_.rdp-caption]:text-foreground",
                  "[&_.rdp-caption]:font-semibold",
                  "[&_.rdp-caption]:text-lg",
                  "[&_.rdp-nav_button]:w-9",
                  "[&_.rdp-nav_button]:h-9",
                  "[&_.rdp-nav_button]:rounded-full",
                  "[&_.rdp-nav_button]:hover:bg-orange-50",
                  "[&_.rdp-nav_button]:dark:hover:bg-orange-500/10",
                  "[&_.rdp-head_cell]:text-muted-foreground",
                  "[&_.rdp-head_cell]:font-medium",
                  "[&_.rdp-head_cell]:text-sm",
                  "[&_.rdp-head_cell]:w-full",
                  "[&_.rdp-head_cell]:h-10",
                  "[&_.rdp-cell]:w-full",
                  "[&_.rdp-cell]:h-auto",
                  "[&_.rdp-cell]:aspect-square",
                  "[&_.rdp-button]:w-full",
                  "[&_.rdp-button]:h-full",
                  "[&_.rdp-button]:min-h-[44px]",
                  "[&_.rdp-button]:rounded-full",
                  "[&_.rdp-button]:text-base",
                  "[&_.rdp-button]:font-normal",
                  "[&_.rdp-day_today]:bg-orange-100",
                  "[&_.rdp-day_today]:dark:bg-orange-500/20",
                  "[&_.rdp-day_today]:text-orange-700",
                  "[&_.rdp-day_today]:dark:text-orange-300",
                  "[&_.rdp-day_today]:font-semibold",
                  "[&_.rdp-day_today]:rounded-full",
                  "[&_.rdp-day_selected]:bg-orange-500",
                  "[&_.rdp-day_selected]:text-white",
                  "[&_.rdp-day_selected]:font-semibold",
                  "[&_.rdp-day_selected]:rounded-full",
                  "[&_.rdp-day_selected:hover]:bg-orange-600",
                  "[&_.rdp-button:hover:not(.rdp-day_selected)]:bg-orange-50",
                  "[&_.rdp-button:hover:not(.rdp-day_selected)]:dark:bg-orange-500/10",
                  "[&_.rdp-button:hover:not(.rdp-day_selected)]:text-foreground",
                  "[&_.rdp-disabled]:opacity-30",
                  "[&_.rdp-disabled]:cursor-not-allowed",
                  "[&_.rdp-day_outside]:text-muted-foreground/50",
                  "[&_.rdp-table]:w-full"
                )}
              />
            </div>
          </div>

          <DrawerFooter className="pt-2 pb-6 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full rounded-xl h-12 border-border text-muted-foreground hover:bg-accent"
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
