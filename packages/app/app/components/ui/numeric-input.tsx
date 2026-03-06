import * as React from "react";
import { cn } from "~/lib/utils";
import { inputBaseClassName } from "./input";

export interface NumericInputProps
  extends Omit<React.ComponentProps<"input">, "inputMode" | "type"> {
  decimals?: number;
  allowDecimal?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}

function getInputMode(
  allowDecimal: boolean,
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"],
) {
  if (inputMode) {
    return inputMode;
  }

  return allowDecimal ? "decimal" : "numeric";
}

export function sanitizeNumericInputValue(
  value: string,
  { allowDecimal = true, decimals }: Pick<NumericInputProps, "allowDecimal" | "decimals">,
): string {
  let sanitized = value.replace(/,/g, ".").replace(/[^\d.]/g, "");

  if (!allowDecimal) {
    return sanitized.replace(/\./g, "");
  }

  const firstDecimalIndex = sanitized.indexOf(".");
  if (firstDecimalIndex === -1) {
    return sanitized;
  }

  const integerPart = sanitized.slice(0, firstDecimalIndex + 1);
  const decimalPart = sanitized.slice(firstDecimalIndex + 1).replace(/\./g, "");

  if (decimals === undefined) {
    return `${integerPart}${decimalPart}`;
  }

  return `${integerPart}${decimalPart.slice(0, Math.max(0, decimals))}`;
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      allowDecimal = true,
      autoComplete = "off",
      className,
      decimals,
      inputMode,
      onChange,
      pattern,
      ...props
    },
    ref,
  ) => {
    const handleChange = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextValue = sanitizeNumericInputValue(event.currentTarget.value, {
          allowDecimal,
          decimals,
        });

        if (event.currentTarget.value !== nextValue) {
          event.currentTarget.value = nextValue;
        }

        onChange?.(event);
      },
      [allowDecimal, decimals, onChange],
    );

    return (
      <input
        {...props}
        ref={ref}
        autoComplete={autoComplete}
        className={cn(inputBaseClassName, className)}
        inputMode={getInputMode(allowDecimal, inputMode)}
        onChange={handleChange}
        pattern={pattern ?? (allowDecimal ? "[0-9]*[.,]?[0-9]*" : "[0-9]*")}
        type="text"
      />
    );
  },
);

NumericInput.displayName = "NumericInput";

export { NumericInput };
