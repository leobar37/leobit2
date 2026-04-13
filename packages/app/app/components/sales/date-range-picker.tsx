import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "~/lib/utils";
import { getToday, subDays, toDateString, parseDateString, addDays, formatDisplayDate } from "~/lib/date-utils";
import type { DateRange } from "react-day-picker";

type PresetKey = "today" | "yesterday" | "this_week" | "this_month";

function getStartOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getStartOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

interface DateRangePreset {
  label: string;
  key: PresetKey;
  getRange: () => { from: Date; to: Date };
}

const PRESETS: DateRangePreset[] = [
  {
    label: "Hoy",
    key: "today",
    getRange: () => {
      const today = parseDateString(getToday());
      return { from: today, to: addDays(today, 1) };
    },
  },
  {
    label: "Ayer",
    key: "yesterday",
    getRange: () => {
      const yesterday = subDays(getToday(), 1);
      return { from: yesterday, to: addDays(yesterday, 1) };
    },
  },
  {
    label: "Esta semana",
    key: "this_week",
    getRange: () => {
      const today = parseDateString(getToday());
      const weekStart = getStartOfWeek(today);
      return { from: weekStart, to: addDays(today, 1) };
    },
  },
  {
    label: "Este mes",
    key: "this_month",
    getRange: () => {
      const monthStart = getStartOfMonth(parseDateString(getToday()));
      const today = parseDateString(getToday());
      return { from: monthStart, to: addDays(today, 1) };
    },
  },
];

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangePickerProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(undefined);

  const activePreset = PRESETS.find((p) => {
    const range = p.getRange();
    return toDateString(range.from) === startDate && toDateString(range.to) === endDate;
  });

  const isCustomActive = !activePreset && startDate !== "" && endDate !== "";

  const calendarRange: DateRange | undefined =
    startDate && endDate
      ? { from: parseDateString(startDate), to: parseDateString(endDate) }
      : startDate
        ? { from: parseDateString(startDate) }
        : undefined;

  const handlePresetClick = (preset: DateRangePreset) => {
    const range = preset.getRange();
    onStartDateChange(toDateString(range.from));
    onEndDateChange(toDateString(range.to));
  };

  const openCustomDrawer = () => {
    setDraftRange(calendarRange);
    setDrawerOpen(true);
  };

  const handleDrawerSelect = (range: DateRange | undefined) => {
    setDraftRange(range);
  };

  const applyCustomRange = () => {
    if (draftRange?.from && draftRange?.to) {
      onStartDateChange(toDateString(draftRange.from));
      onEndDateChange(toDateString(draftRange.to));
      setDrawerOpen(false);
    } else if (draftRange?.from) {
      onStartDateChange(toDateString(draftRange.from));
      onEndDateChange(toDateString(addDays(draftRange.from, 1)));
      setDrawerOpen(false);
    }
  };

  const clear = () => {
    onStartDateChange("");
    onEndDateChange("");
  };

  const hasSelection = startDate !== "" || endDate !== "";

  const draftLabel = draftRange?.from && draftRange?.to
    ? `${formatDisplayDate(draftRange.from)} - ${formatDisplayDate(draftRange.to)}`
    : draftRange?.from
      ? `${formatDisplayDate(draftRange.from)} - ...`
      : "Seleccionar rango";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Periodo</p>
        {hasSelection && (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => handlePresetClick(preset)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              activePreset?.key === preset.key
                ? "bg-orange-100 text-orange-700"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            )}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={openCustomDrawer}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            isCustomActive
              ? "bg-orange-100 text-orange-700"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          )}
        >
          Personalizado
        </button>
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="rounded-t-[24px]">
          <DrawerHeader className="px-4 pb-3 pt-2">
            <DrawerTitle className="text-lg font-semibold">
              Seleccionar rango de fechas
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              Toca una fecha de inicio y otra de fin
            </DrawerDescription>
          </DrawerHeader>

          <div className="overflow-y-auto px-4 pb-2">
            <div className="flex justify-center">
              <Calendar
                mode="range"
                selected={draftRange}
                onSelect={handleDrawerSelect}
                numberOfMonths={1}
                defaultMonth={parseDateString(getToday())}
              />
            </div>
          </div>

          <div className="px-4 pb-1 pt-2">
            <p className="text-center text-sm text-muted-foreground">
              {draftLabel}
            </p>
          </div>

          <DrawerFooter className="px-4 pb-6 pt-2">
            <Button
              type="button"
              onClick={applyCustomRange}
              disabled={!draftRange?.from}
              className="w-full rounded-xl h-12 bg-orange-500 text-white hover:bg-orange-600"
            >
              Aplicar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDrawerOpen(false)}
              className="w-full rounded-xl h-12 border-stone-200 text-stone-600 hover:bg-stone-50"
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
