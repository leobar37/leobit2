"use client";

import * as React from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
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
          "bg-white border-gray-200 hover:bg-gray-50 hover:border-orange-300",
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
        <DrawerContent className="w-full rounded-t-[24px]">
          {/* Header */}
          <DrawerHeader className="border-b border-gray-100 px-4 pb-3 pt-2">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-lg font-semibold text-gray-900">
                {label || "Seleccionar fecha"}
              </DrawerTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="rounded-full h-9 w-9"
              >
                <X className="h-5 w-5 text-gray-500" />
              </Button>
            </div>
          </DrawerHeader>
          
          {/* Calendar */}
          <div className="p-4 bg-white">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              disabled={isDateDisabled}
              initialFocus
              className={cn(
                // Base styles - full width
                "border-0 w-full",
                // Header/caption
                "[&_.rdp-caption]:text-gray-900",
                "[&_.rdp-caption]:font-semibold",
                "[&_.rdp-caption]:text-lg",
                "[&_.rdp-nav_button]:w-9",
                "[&_.rdp-nav_button]:h-9",
                "[&_.rdp-nav_button]:rounded-full",
                "[&_.rdp-nav_button]:hover:bg-orange-50",
                // Weekday headers - responsive sizing
                "[&_.rdp-head_cell]:text-gray-500",
                "[&_.rdp-head_cell]:font-medium",
                "[&_.rdp-head_cell]:text-sm",
                "[&_.rdp-head_cell]:w-full",
                "[&_.rdp-head_cell]:h-10",
                // Day cells - responsive full width
                "[&_.rdp-cell]:w-full",
                "[&_.rdp-cell]:h-auto",
                "[&_.rdp-cell]:aspect-square",
                "[&_.rdp-button]:w-full",
                "[&_.rdp-button]:h-full",
                "[&_.rdp-button]:min-h-[44px]",
                "[&_.rdp-button]:rounded-full",
                "[&_.rdp-button]:text-base",
                "[&_.rdp-button]:font-normal",
                // Today highlight
                "[&_.rdp-day_today]:bg-orange-100",
                "[&_.rdp-day_today]:text-orange-700",
                "[&_.rdp-day_today]:font-semibold",
                "[&_.rdp-day_today]:rounded-full",
                // Selected day
                "[&_.rdp-day_selected]:bg-orange-500",
                "[&_.rdp-day_selected]:text-white",
                "[&_.rdp-day_selected]:font-semibold",
                "[&_.rdp-day_selected]:rounded-full",
                "[&_.rdp-day_selected:hover]:bg-orange-600",
                // Hover states
                "[&_.rdp-button:hover:not(.rdp-day_selected)]:bg-orange-50",
                "[&_.rdp-button:hover:not(.rdp-day_selected)]:text-gray-900",
                // Disabled
                "[&_.rdp-disabled]:opacity-30",
                "[&_.rdp-disabled]:cursor-not-allowed",
                // Outside days
                "[&_.rdp-day_outside]:text-gray-300",
                // Table full width
                "[&_.rdp-table]:w-full"
              )}
            />
          </div>
          
          {/* Quick Actions */}
          <div className="px-4 pb-2">
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
                  "text-gray-700 font-medium",
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
                  "text-gray-700 font-medium",
                  !canSelectSecond && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="text-orange-400 mr-2">●</span>
                {quickActionLabels[1]}
              </Button>
            </div>
          </div>
          
          {/* Footer */}
          <DrawerFooter className="pt-2 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full rounded-xl h-12 border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
