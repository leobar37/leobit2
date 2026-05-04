import { get, useFormContext } from "react-hook-form";
import type { FieldErrors, FieldName } from "react-hook-form";

export interface UseFormFieldReturn {
  error?: string;
  isError: boolean;
}

export function useFormField<T extends Record<string, unknown>>(
  name: FieldName<T>
): UseFormFieldReturn {
  const form = useFormContext<T>();

  const errors = form.formState.errors as FieldErrors<T>;
  const fieldError = get(errors, name as string);

  return {
    error: fieldError?.message as string | undefined,
    isError: !!fieldError,
  };
}
