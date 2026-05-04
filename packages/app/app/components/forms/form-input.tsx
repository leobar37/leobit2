import { forwardRef, useCallback } from "react";
import { get, useFormContext, type UseFormRegisterReturn } from "react-hook-form";
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
  /**
   * Optional register return from react-hook-form.
   * If not provided, FormInput must be used within a FormProvider.
   */
  register?: UseFormRegisterReturn;
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
      register: registerProp,
      reserveMessageSpace = true,
      ...props
    },
    ref
  ) => {
    const formContext = useFormContext();

    // Guard clause: throw descriptive error if neither register prop nor context is available
    if (!registerProp && !formContext) {
      throw new Error(
        "FormInput must be used within a FormProvider or receive a register prop. " +
        "Either wrap your form with <FormProvider {...form}> or pass {...form.register('fieldName')} to FormInput."
      );
    }

    // Get errors from context or use empty object if not available
    const errors = formContext?.formState?.errors;
    const fieldError = get(errors, name)?.message as string | undefined;
    const displayError = error ?? fieldError;

    // If registerProp is provided, spread it directly (it's the result of form.register())
    // Otherwise, call formContext.register(name) to get the register return
    const registerReturn = registerProp || (formContext && formContext.register(name));

    // Merge forwarded ref with react-hook-form's ref to prevent overwriting
    const mergedRef = useCallback(
      (node: HTMLInputElement | null) => {
        if (typeof registerReturn.ref === "function") {
          registerReturn.ref(node);
        } else if (registerReturn.ref) {
          (registerReturn.ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
        }
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
        }
      },
      [registerReturn.ref, ref]
    );

    return (
      <FormFieldShell
        description={description}
        error={displayError}
        helperText={helperText}
        label={label}
        reserveMessageSpace={reserveMessageSpace}
      >
        <Input
          data-testid={`input-${name}`}
          className={cn(
            "shell-field h-12 rounded-[20px] px-4",
            displayError && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...registerReturn}
          {...props}
          ref={mergedRef}
        />
      </FormFieldShell>
    );
  }
);
FormInput.displayName = "FormInput";

export { FormInput };
