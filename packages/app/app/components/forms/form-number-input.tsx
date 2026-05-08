import { forwardRef, useCallback } from "react";
import { get, useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import { formatCurrency } from "~/lib/utils";
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
      name,
      onChange,
      reserveMessageSpace = true,
      value,
      ...props
    },
    ref,
  ) => {
    const formContext = useFormContext();
    const fieldDescription =
      maxAmount !== undefined
        ? `Máximo: S/ ${formatCurrency(maxAmount)}`
        : description;
    const fieldError = name
      ? (get(formContext?.formState?.errors, name)?.message as string | undefined)
      : undefined;
    const displayError = error ?? fieldError;
    const isControlled = value !== undefined || onChange !== undefined;
    const registerReturn =
      !isControlled && name && formContext
        ? formContext.register(name, {
            setValueAs: (inputValue) =>
              inputValue === "" || inputValue == null ? null : Number(inputValue),
          })
        : undefined;

    const mergedRef = useCallback(
      (node: HTMLInputElement | null) => {
        if (registerReturn?.ref) {
          registerReturn.ref(node);
        }
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
        }
      },
      [registerReturn, ref],
    );

    return (
      <FormFieldShell
        description={fieldDescription}
        error={displayError}
        helperText={helperText}
        label={label}
        reserveMessageSpace={reserveMessageSpace}
      >
        <NumericInput
          {...registerReturn}
          {...props}
          ref={registerReturn ? mergedRef : ref}
          className={cn("h-12 rounded-xl bg-background px-4 text-lg", className)}
          data-testid={name ? `input-${name}` : undefined}
          decimals={decimals}
          name={name}
          onChange={onChange ?? registerReturn?.onChange}
          value={value}
        />
      </FormFieldShell>
    );
  },
);

FormNumberInput.displayName = "FormNumberInput";

export { FormNumberInput };
