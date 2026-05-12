import { useEffect, useMemo, useState } from "react";
import { Check, Package, Scale } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "~/lib/utils";
import type { ProductFormData } from "~/lib/schemas/product-schema";

type ProductUnit = ProductFormData["unit"];

interface ProductUnitOption {
  value: ProductUnit;
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Package;
}

const POLLERIA_UNIT_OPTIONS: ProductUnitOption[] = [
  {
    value: "unidad",
    label: "Unidad",
    shortLabel: "Unidad",
    description: "Para huevos, paquetes o productos contados.",
    icon: Package,
  },
  {
    value: "kg",
    label: "Kilogramo",
    shortLabel: "kg",
    description: "Para pollo, cortes o productos vendidos por peso.",
    icon: Scale,
  },
];

interface ProductUnitSelectorProps {
  form: UseFormReturn<ProductFormData>;
  errorClassName?: string;
}

export function ProductUnitSelector({
  form,
  errorClassName = "text-sm",
}: ProductUnitSelectorProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const selectedUnit = watch("unit");
  const [enabledUnits, setEnabledUnits] = useState<Record<ProductUnit, boolean>>(
    {
      unidad: true,
      kg: true,
    },
  );

  const activeOptions = useMemo(
    () => POLLERIA_UNIT_OPTIONS.filter((option) => enabledUnits[option.value]),
    [enabledUnits],
  );

  useEffect(() => {
    if (selectedUnit && enabledUnits[selectedUnit]) return;

    const nextUnit = activeOptions[0]?.value;
    if (nextUnit) {
      setValue("unit", nextUnit, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
  }, [activeOptions, enabledUnits, selectedUnit, setValue]);

  const toggleUnit = (unit: ProductUnit, checked: boolean) => {
    const enabledCount = Object.values(enabledUnits).filter(Boolean).length;
    if (!checked && enabledCount === 1) return;

    setEnabledUnits((current) => ({
      ...current,
      [unit]: checked,
    }));
  };

  const selectUnit = (unit: ProductUnit) => {
    if (!enabledUnits[unit]) return;

    setValue("unit", unit, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  return (
    <div className="space-y-3">
      <input type="hidden" {...register("unit")} />
      <div className="flex items-center justify-between gap-3">
        <Label id="product-unit-label" className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Unidad *
        </Label>
        <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-700 dark:text-orange-200">
          Pollería
        </span>
      </div>

      <div
        role="radiogroup"
        aria-labelledby="product-unit-label"
        className="grid grid-cols-2 gap-2"
      >
        {POLLERIA_UNIT_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedUnit === option.value;
          const isEnabled = enabledUnits[option.value];

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-disabled={!isEnabled}
              data-testid={`product-unit-option-${option.value}`}
              onClick={() => selectUnit(option.value)}
              className={cn(
                "min-h-[104px] rounded-xl border bg-background p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
                isSelected
                  ? "border-orange-500 bg-orange-500/10 text-foreground"
                  : "border-border hover:border-orange-300 hover:bg-orange-500/5",
                !isEnabled && "cursor-not-allowed opacity-45 hover:border-border hover:bg-background",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                {isSelected && isEnabled && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <div className="mt-3 min-w-0">
                <p className="text-sm font-semibold">{option.label}</p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
        <p className="text-xs font-medium text-foreground">
          Unidades disponibles
        </p>
        <div className="mt-3 grid gap-3">
          {POLLERIA_UNIT_OPTIONS.map((option) => (
            <Switch
              key={option.value}
              id={`enable-product-unit-${option.value}`}
              checked={enabledUnits[option.value]}
              onCheckedChange={(checked) => toggleUnit(option.value, checked)}
              label={option.shortLabel}
              description={
                enabledUnits[option.value]
                  ? "Activa para este formulario"
                  : "Oculta al elegir unidad base"
              }
            />
          ))}
        </div>
      </div>

      {errors.unit && (
        <p className={cn(errorClassName, "text-red-500")}>
          {errors.unit.message}
        </p>
      )}
    </div>
  );
}
