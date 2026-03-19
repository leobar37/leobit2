import { forwardRef } from "react";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { FormFieldShell } from "./form-field-shell";

export interface FormInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "name"> {
  name: string;
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
      name,
      reserveMessageSpace = true,
      ...props
    },
    ref
  ) => {
    const { register, formState: { errors } } = useFormContext();

    const fieldError = errors[name]?.message as string | undefined;
    const displayError = error ?? fieldError;

    return (
      <FormFieldShell
        description={description}
        error={displayError}
        helperText={helperText}
        label={label}
        reserveMessageSpace={reserveMessageSpace}
      >
        <Input
          ref={ref}
          data-testid={`input-${name}`}
          className={cn(
            "shell-field h-12 rounded-[20px] px-4",
            displayError && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...register(name)}
          {...props}
        />
      </FormFieldShell>
    );
  }
);
FormInput.displayName = "FormInput";

export { FormInput };
