import { useFormContext } from "react-hook-form";
import type { FieldErrors, FieldName } from "react-hook-form";

export interface UseFormFieldReturn {
  error?: string;
  isError: boolean;
}

export function useFormField<T extends Record<string, unknown>>(
  name: FieldName<T>
): UseFormFieldReturn {
  const form = useFormContext<T>();

  const fieldName = name as string;
  const errors = form.formState.errors as FieldErrors<T>;

  return {
    error: errors[fieldName]?.message as string | undefined,
    isError: !!errors[fieldName],
  };
}
