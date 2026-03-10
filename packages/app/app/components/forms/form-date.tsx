"use client";

import { useFormContext, Controller, type Control, type ControllerRenderProps, type FieldValues, type Path } from "react-hook-form";
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
  control?: Control<T>;
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
  control: controlProp,
}: FormDateProps<T>) {
  const formContext = useFormContext<T>();
  const control = controlProp || formContext?.control;
  
  if (!control) {
    throw new Error("FormDate must be used within a form context or with a control prop");
  }
  
  const error = formContext?.formState?.errors[name]?.message as string | undefined;

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
