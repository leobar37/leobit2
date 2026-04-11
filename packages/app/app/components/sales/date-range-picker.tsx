import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "~/lib/utils";
import { getToday, subDays, toDateString, parseDateString, addDays } from "~/lib/date-utils";
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
  const [showCalendar, setShowCalendar] = useState(false);

  const activePreset = PRESETS.find((p) => {
    const range = p.getRange();
    return toDateString(range.from) === startDate && toDateString(range.to) === endDate;
  });

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
    setShowCalendar(false);
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (!range) {
      onStartDateChange("");
      onEndDateChange("");
      return;
    }
    if (range.from) {
      onStartDateChange(toDateString(range.from));
    }
    if (range.to) {
      onEndDateChange(toDateString(range.to));
    } else if (range.from) {
      onEndDateChange(toDateString(addDays(range.from, 1)));
    }
  };

  const clear = () => {
    onStartDateChange("");
    onEndDateChange("");
    setShowCalendar(false);
  };

  const hasSelection = startDate !== "" || endDate !== "";

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
          onClick={() => setShowCalendar(!showCalendar)}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            showCalendar
              ? "bg-orange-100 text-orange-700"
              : !activePreset && hasSelection
                ? "bg-orange-100 text-orange-700"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          )}
        >
          Personalizado
        </button>
      </div>

      {showCalendar && (
        <div className="flex justify-center pt-1">
          <Calendar
            mode="range"
            selected={calendarRange}
            onSelect={handleCalendarSelect}
            numberOfMonths={1}
            defaultMonth={parseDateString(getToday())}
          />
        </div>
      )}
    </div>
  );
}
