import { forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NumericInput,
  type NumericInputProps,
} from "@/components/ui/numeric-input";
import { FormFieldShell } from "./form-field-shell";

interface FormCalculatorFieldProps {
  description?: string;
  error?: string;
  helperText?: string;
  label?: string;
  reserveMessageSpace?: boolean;
}

export interface FormCalculatorInputProps
  extends Omit<NumericInputProps, "children">,
    FormCalculatorFieldProps {
  icon?: LucideIcon;
  isActive?: boolean;
}

const FormCalculatorInput = forwardRef<
  HTMLInputElement,
  FormCalculatorInputProps
>(
  (
    {
      className,
      description,
      error,
      helperText,
      label,
      icon: Icon,
      isActive,
      reserveMessageSpace = true,
      ...props
    },
    ref,
  ) => {
    return (
      <FormFieldShell
        description={description}
        error={error}
        helperText={helperText}
        label={
          label ? (
            <label className="flex items-center gap-1 text-xs font-medium text-foreground">
              {Icon && <Icon className="h-3 w-3 text-orange-500" />}
              {label}
            </label>
          ) : undefined
        }
        reserveMessageSpace={reserveMessageSpace}
      >
        <NumericInput
          {...props}
          ref={ref}
          data-testid={props.name ? `input-${props.name}` : undefined}
          className={cn(
            "h-12 rounded-xl bg-background px-4 text-lg",
            isActive && "border-orange-500 ring-2 ring-orange-200",
            className,
          )}
        />
      </FormFieldShell>
    );
  },
);

FormCalculatorInput.displayName = "FormCalculatorInput";

export { FormCalculatorInput };
