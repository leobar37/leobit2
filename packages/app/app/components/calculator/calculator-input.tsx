import { useState } from "react";
import { cn } from "~/lib/utils";
import type { CalculatorField } from "~/stores/calculator-config.store";

interface CalculatorInputProps {
  name: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  fieldType: CalculatorField;
  isAutoCalculateTarget: boolean;
  onToggleAutoCalculate: () => void;
  decimals?: number;
  helperText?: string;
  helperValue?: string;
  onApplyHelperValue?: (value: string) => void;
  className?: string;
}

export function CalculatorInput({
  name,
  label,
  value,
  placeholder,
  onChange,
  fieldType,
  isAutoCalculateTarget,
  onToggleAutoCalculate,
  decimals = 2,
  helperText,
  helperValue,
  onApplyHelperValue,
  className,
}: CalculatorInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputId = `calculator-${name}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Only allow numbers and decimal point
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      // Limit decimals
      const parts = val.split(".");
      if (parts[1]?.length > decimals) {
        return;
      }
      onChange(val);
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-foreground/80">
        {label}
      </label>
      
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type="text"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={isAutoCalculateTarget}
          className={cn(
            "h-11 w-full rounded-xl border px-3 pr-10 text-base text-foreground transition-all placeholder:text-muted-foreground/70",
            "bg-white/86 focus:outline-none focus:ring-2 dark:bg-white/[0.06]",
            isAutoCalculateTarget
              ? "cursor-not-allowed border-orange-400/70 bg-orange-50/50 focus:border-orange-500 focus:ring-orange-200 dark:bg-orange-500/10 dark:focus:ring-orange-500/20"
              : "border-stone-200/80 focus:border-blue-500 focus:ring-blue-200 dark:border-white/10 dark:focus:border-blue-400 dark:focus:ring-blue-500/20",
            value && !isAutoCalculateTarget && "bg-blue-50/40 dark:bg-blue-500/10"
          )}
        />

        {/* Status indicator dot */}
        <button
          type="button"
          onClick={onToggleAutoCalculate}
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all",
            "hover:scale-125 focus:outline-none focus:ring-2 focus:ring-offset-1",
            isAutoCalculateTarget
              ? "bg-orange-500 ring-orange-300 shadow-sm shadow-orange-200 dark:ring-orange-500/30 dark:shadow-orange-900/40"
              : "bg-muted-foreground/40 hover:bg-muted-foreground/60 ring-muted-foreground/20",
            isFocused && "scale-110"
          )}
          title={isAutoCalculateTarget ? "Se calculará automáticamente" : "Click para calcular automáticamente"}
        />
      </div>

      {helperText && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{helperText}</p>
          {helperValue && onApplyHelperValue && (
            <button
              type="button"
              onClick={() => onApplyHelperValue(helperValue)}
              className="rounded bg-orange-500/[0.12] px-1.5 py-0.5 text-[10px] font-semibold text-orange-600 transition-colors hover:bg-orange-500/[0.18] dark:text-orange-300"
            >
              Usar
            </button>
          )}
        </div>
      )}

      {isAutoCalculateTarget && (
        <p className="text-xs font-medium text-orange-600 dark:text-orange-300">
          Se calculará automáticamente
        </p>
      )}
    </div>
  );
}

// Compact version for smaller spaces
export function CalculatorInputCompact({
  name,
  label,
  value,
  placeholder,
  onChange,
  isAutoCalculateTarget,
  onToggleAutoCalculate,
  decimals = 2,
}: Omit<CalculatorInputProps, "fieldType" | "helperText" | "className">) {
  const inputId = `calculator-${name}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      const parts = val.split(".");
      if (parts[1]?.length > decimals) return;
      onChange(val);
    }
  };

  return (
    <div className="relative">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        disabled={isAutoCalculateTarget}
        className={cn(
          "h-10 w-full rounded-lg border px-3 pr-8 text-sm text-foreground transition-all placeholder:text-muted-foreground/70",
          "bg-white/86 focus:outline-none focus:ring-2 dark:bg-white/[0.06]",
          isAutoCalculateTarget
            ? "cursor-not-allowed border-orange-400/70 bg-orange-50/50 focus:border-orange-500 focus:ring-orange-200 dark:bg-orange-500/10 dark:focus:ring-orange-500/20"
            : "border-stone-200/80 focus:border-blue-500 focus:ring-blue-200 dark:border-white/10 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
        )}
      />
      
      <button
        type="button"
        onClick={onToggleAutoCalculate}
        className={cn(
          "absolute right-2.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full transition-all",
          "hover:scale-125",
          isAutoCalculateTarget
            ? "bg-orange-500 shadow-sm"
            : "bg-muted-foreground/40 hover:bg-muted-foreground/60"
        )}
        title={isAutoCalculateTarget ? "Auto-calcular" : "Fijar valor"}
      />
    </div>
  );
}

// Summary indicator showing current config
export function CalculatorConfigIndicator({
  unitType,
  autoCalculateField,
  onClick,
}: {
  unitType: string;
  autoCalculateField: CalculatorField;
  onClick?: () => void;
}) {
  const fieldNames: Record<CalculatorField, string> = {
    price: "precio",
    quantity: "cantidad",
    total: "total",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-orange-600 dark:hover:text-orange-300"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
      Calculando {fieldNames[autoCalculateField]} para {unitType}
    </button>
  );
}

export type { CalculatorField };
export default CalculatorInput;
