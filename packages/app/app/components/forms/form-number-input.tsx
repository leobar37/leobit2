import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import {
  NumericInput,
  type NumericInputProps,
} from "@/components/ui/numeric-input";
import { FormFieldShell } from "./form-field-shell";

interface FormNumberInputBaseProps {
  description?: string;
  error?: string;
  helperText?: string;
  label?: string;
  maxAmount?: number;
  reserveMessageSpace?: boolean;
}

export interface FormNumberInputProps
  extends Omit<NumericInputProps, "children">,
    FormNumberInputBaseProps {
  maxAmount?: number;
  decimals?: number;
}

const FormNumberInput = forwardRef<HTMLInputElement, FormNumberInputProps>(
  (
    {
      className,
      decimals = 2,
      description,
      error,
      helperText,
      label,
      maxAmount,
      reserveMessageSpace = true,
      ...props
    },
    ref,
  ) => {
    const fieldDescription =
      maxAmount !== undefined
        ? `Máximo: S/ ${maxAmount.toFixed(2)}`
        : description;

    return (
      <FormFieldShell
        description={fieldDescription}
        error={error}
        helperText={helperText}
        label={label}
        reserveMessageSpace={reserveMessageSpace}
      >
        <NumericInput
          {...props}
          ref={ref}
          className={cn("h-12 rounded-xl bg-background px-4 text-lg", className)}
          data-testid={props.name ? `input-${props.name}` : undefined}
          decimals={decimals}
        />
      </FormFieldShell>
    );
  },
);

FormNumberInput.displayName = "FormNumberInput";

export { FormNumberInput };
