/**
 * Expense Capture Hook
 * Form state management for expense capture
 */

import { useState, useCallback } from "react";
import { useCreateExpense, useUpdateExpense, type PaymentMethod } from "./use-expenses";
import { getToday } from "~/lib/date-utils";

export interface ExpenseFormData {
  categoryId: string;
  amount: string;
  description: string;
  expenseDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  receiptImageId: string | null;
}

export interface ExpenseCaptureOptions {
  expenseId?: string;
  distribucionId?: string;
  sellerId?: string;
  defaultValues?: Partial<ExpenseFormData>;
}

const defaultFormData: ExpenseFormData = {
  categoryId: "",
  amount: "",
  description: "",
  expenseDate: getToday(),
  paymentMethod: "efectivo",
  referenceNumber: "",
  receiptImageId: null,
};

export function useExpenseCapture(options?: ExpenseCaptureOptions) {
  const [formData, setFormData] = useState<ExpenseFormData>({
    ...defaultFormData,
    ...options?.defaultValues,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ExpenseFormData, string>>>({});

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  const setField = useCallback(<K extends keyof ExpenseFormData>(field: K, value: ExpenseFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field changes
    setErrors((prev) => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof ExpenseFormData, string>> = {};

    if (!formData.categoryId.trim()) {
      newErrors.categoryId = "La categoría es requerida";
    }

    const amountNum = parseFloat(formData.amount);
    if (!formData.amount.trim() || Number.isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = "El monto debe ser mayor a 0";
    }

    if (!formData.expenseDate.trim()) {
      newErrors.expenseDate = "La fecha es requerida";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const reset = useCallback(() => {
    setFormData({
      ...defaultFormData,
      ...options?.defaultValues,
    });
    setErrors({});
  }, [options?.defaultValues]);

  const submit = useCallback(async (): Promise<{ success: boolean; expenseId?: string; error?: string }> => {
    if (!validate()) {
      return { success: false, error: "Por favor corrige los errores del formulario" };
    }

    try {
      const amountNum = parseFloat(formData.amount);

      if (options?.expenseId) {
        await updateExpense.mutateAsync({
          id: options.expenseId,
          input: {
            categoryId: formData.categoryId,
            amount: amountNum,
            description: formData.description || null,
            expenseDate: formData.expenseDate,
            paymentMethod: formData.paymentMethod,
            referenceNumber: formData.referenceNumber || null,
            receiptImageId: formData.receiptImageId,
          },
        });
        return { success: true, expenseId: options.expenseId };
      } else {
        const result = await createExpense.mutateAsync({
          categoryId: formData.categoryId,
          distribucionId: options?.distribucionId,
          sellerId: options?.sellerId,
          amount: amountNum,
          description: formData.description || undefined,
          expenseDate: formData.expenseDate,
          paymentMethod: formData.paymentMethod,
          referenceNumber: formData.referenceNumber || undefined,
          receiptImageId: formData.receiptImageId || undefined,
        });
        return { success: true, expenseId: result.id };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al guardar el gasto";
      return { success: false, error: message };
    }
  }, [formData, options, validate, createExpense, updateExpense]);

  const isPending = createExpense.isPending || updateExpense.isPending;

  return {
    formData,
    errors,
    setField,
    validate,
    reset,
    submit,
    isPending,
  };
}
