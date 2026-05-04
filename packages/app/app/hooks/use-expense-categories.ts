/**
 * Expense Categories Hook (API-based)
 * Reactively fetch and mutate expense categories using Eden Treaty API
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";

export interface ExpenseCategory {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseCategoryInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface UpdateExpenseCategoryInput {
  name?: string;
  description?: string | null;
  icon?: string;
  color?: string;
  isActive?: boolean;
}

/**
 * Get all expense categories
 */
export function useExpenseCategories() {
  return useQuery({
    queryKey: queryKeys.expenseCategories.all,
    queryFn: async () => {
      const response = await api["expense-categories"].get();
      return extractData<ExpenseCategory[]>(response);
    },
  });
}

/**
 * Get active expense categories only
 */
export function useActiveExpenseCategories() {
  return useQuery({
    queryKey: queryKeys.expenseCategories.active,
    queryFn: async () => {
      const response = await api["expense-categories"].active.get();
      return extractData<ExpenseCategory[]>(response);
    },
  });
}

/**
 * Get a single expense category by ID
 */
export function useExpenseCategory(id: string | null) {
  return useQuery({
    queryKey: id ? ["expense-categories", id] : queryKeys.expenseCategories.all,
    queryFn: async () => {
      if (!id) return null;
      const response = await api["expense-categories"]({ id }).get();
      return extractData<ExpenseCategory>(response);
    },
    enabled: !!id,
  });
}

/**
 * Create a new expense category
 */
export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateExpenseCategoryInput): Promise<ExpenseCategory> => {
      const response = await api["expense-categories"].post(input);
      return extractData<ExpenseCategory>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.active });
    },
  });
}

/**
 * Update an expense category
 */
export function useUpdateExpenseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateExpenseCategoryInput;
    }): Promise<ExpenseCategory> => {
      const response = await api["expense-categories"]({ id }).put(input);
      return extractData<ExpenseCategory>(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories", variables.id] });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.active });
    },
  });
}

/**
 * Delete an expense category
 */
export function useDeleteExpenseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await api["expense-categories"]({ id }).delete();
      if (response.error) throw new Error(String(response.error.value));
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories", id] });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.active });
    },
  });
}

/**
 * Seed default expense categories
 */
export function useSeedExpenseCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const response = await api["expense-categories"].seed.post({});
      extractData(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.active });
    },
  });
}
