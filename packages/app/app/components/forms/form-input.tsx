import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { FormFieldShell } from "./form-field-shell";

export interface FormInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  description?: string;
  label?: string;
  error?: string;
  helperText?: string;
  reserveMessageSpace?: boolean;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      className,
      description,
      error,
      helperText,
      label,
      reserveMessageSpace = true,
      ...props
    },
    ref
  ) => {
    return (
      <FormFieldShell
        description={description}
        error={error}
        helperText={helperText}
        label={label}
        reserveMessageSpace={reserveMessageSpace}
      >
        <Input
          ref={ref}
          data-testid={props.name ? `input-${props.name}` : undefined}
          className={cn(
            "h-12 rounded-xl border-input bg-background px-4",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...props}
        />
      </FormFieldShell>
    );
  }
);
FormInput.displayName = "FormInput";

export { FormInput };
