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
  className?: string;
}

export function CalculatorInput({
  label,
  value,
  placeholder,
  onChange,
  fieldType,
  isAutoCalculateTarget,
  onToggleAutoCalculate,
  decimals = 2,
  helperText,
  className,
}: CalculatorInputProps) {
  const [isFocused, setIsFocused] = useState(false);

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
      <label className="text-sm font-medium text-gray-700">{label}</label>
      
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={isAutoCalculateTarget}
          className={cn(
            "w-full h-11 px-3 pr-10 text-base rounded-xl border bg-white transition-all",
            "focus:outline-none focus:ring-2",
            isAutoCalculateTarget
              ? "border-orange-300 focus:border-orange-500 focus:ring-orange-200 bg-orange-50/30 cursor-not-allowed"
              : "border-gray-200 focus:border-blue-500 focus:ring-blue-200",
            value && !isAutoCalculateTarget && "bg-blue-50/30"
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
              ? "bg-orange-500 ring-orange-300 shadow-sm shadow-orange-200"
              : "bg-gray-300 hover:bg-gray-400 ring-gray-200",
            isFocused && "scale-110"
          )}
          title={isAutoCalculateTarget ? "Se calculará automáticamente" : "Click para calcular automáticamente"}
        />
      </div>

      {helperText && (
        <p className="text-xs text-gray-500">{helperText}</p>
      )}

      {isAutoCalculateTarget && (
        <p className="text-xs text-orange-600 font-medium">
          Se calculará automáticamente
        </p>
      )}
    </div>
  );
}

// Compact version for smaller spaces
export function CalculatorInputCompact({
  label,
  value,
  placeholder,
  onChange,
  isAutoCalculateTarget,
  onToggleAutoCalculate,
  decimals = 2,
}: Omit<CalculatorInputProps, "fieldType" | "helperText" | "className">) {
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
      <input
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        disabled={isAutoCalculateTarget}
        className={cn(
          "w-full h-10 px-3 pr-8 text-sm rounded-lg border transition-all",
          "focus:outline-none focus:ring-2",
          isAutoCalculateTarget
            ? "border-orange-300 focus:border-orange-500 focus:ring-orange-200 bg-orange-50/30 cursor-not-allowed"
            : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
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
            : "bg-gray-300 hover:bg-gray-400"
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
      className="text-xs text-gray-500 hover:text-orange-600 transition-colors flex items-center gap-1"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
      Calculando {fieldNames[autoCalculateField]} para {unitType}
    </button>
  );
}

export type { CalculatorField };
export default CalculatorInput;
