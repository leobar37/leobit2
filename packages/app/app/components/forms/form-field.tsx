import type { UseFormRegisterReturn } from "react-hook-form";

export type FormFieldProps<T extends Record<string, unknown> = Record<string, unknown>> = 
  & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name">
  & {
    name: keyof T;
    label?: string;
    error?: string;
    helperText?: string;
    description?: string;
    reserveMessageSpace?: boolean;
  };

export interface FormInputRegisterReturn<T extends Record<string, unknown> = Record<string, unknown>>
  extends Omit<UseFormRegisterReturn, "ref"> {
  error?: string;
  label?: string;
}

export function createFormFieldProps<T extends Record<string, unknown>>(
  name: keyof T,
  registerReturn: UseFormRegisterReturn<string>,
  options?: {
    error?: string;
    label?: string;
  }
): FormInputRegisterReturn<T> {
  const { onChange, onBlur, name: registerName, ref } = registerReturn;
  
  return {
    name: registerName,
    onChange,
    onBlur,
    ref,
    error: options?.error,
    label: options?.label,
  } as FormInputRegisterReturn<T>;
}
