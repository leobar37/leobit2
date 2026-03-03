"use client";

import { useFormContext, Controller, type ControllerRenderProps, type FieldValues, type Path } from "react-hook-form";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";

interface FormDateProps<T extends FieldValues = FieldValues> {
  name: Path<T>;
  label?: string;
  required?: boolean;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  placeholder?: string;
  quickActionLabels?: [string, string];
  className?: string;
}

export function FormDate<T extends FieldValues = FieldValues>({
  name,
  label,
  required,
  minDate,
  maxDate,
  disabled = false,
  placeholder,
  quickActionLabels,
  className,
}: FormDateProps<T>) {
  const {
    control,
    formState: { errors },
  } = useFormContext<T>();

  const error = errors[name]?.message as string | undefined;

  return (
    <div className={className}>
      <Controller
        name={name}
        control={control}
        render={({ field }: { field: ControllerRenderProps<T, Path<T>> }) => (
          <div className="space-y-2">
            {label && (
              <Label>
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
              </Label>
            )}
            <DatePicker
              value={field.value as string | undefined}
              onChange={field.onChange}
              minDate={minDate}
              maxDate={maxDate}
              disabled={disabled}
              placeholder={placeholder}
              quickActionLabels={quickActionLabels}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        )}
      />
    </div>
  );
}
