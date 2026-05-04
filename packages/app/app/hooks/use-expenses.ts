/**
 * Expenses Hook (API-based)
 * Reactively fetch and mutate expenses using Eden Treaty API
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";

export type PaymentMethod = "efectivo" | "yape" | "plin" | "transferencia" | "tarjeta" | "saldo";

export interface Expense {
  id: string;
  businessId: string;
  distribucionId: string | null;
  categoryId: string;
  sellerId: string | null;
  amount: string;
  description: string | null;
  expenseDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string | null;
  receiptImageId: string | null;
  createdAt: string;
  updatedAt: string;
  category?: ExpenseCategorySummary | null;
}

export interface ExpenseCategorySummary {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  distribucionId?: string;
  sellerId?: string;
  paymentMethod?: PaymentMethod;
  limit?: number;
  offset?: number;
}

export interface PaginatedExpensesResult {
  items: Expense[];
  total: number;
}

export interface CreateExpenseInput {
  id?: string;
  categoryId: string;
  distribucionId?: string;
  sellerId?: string;
  amount: number;
  description?: string;
  expenseDate: string;
  paymentMethod?: PaymentMethod;
  referenceNumber?: string;
  receiptImageId?: string;
}

export interface UpdateExpenseInput {
  categoryId?: string;
  distribucionId?: string | null;
  sellerId?: string | null;
  amount?: number;
  description?: string | null;
  expenseDate?: string;
  paymentMethod?: PaymentMethod;
  referenceNumber?: string | null;
  receiptImageId?: string | null;
}

/**
 * Get all expenses with optional filters
 */
export function useExpenses(filters?: ExpenseFilters) {
  const DEFAULT_PAGE_SIZE = 50;

  return useQuery({
    queryKey: filters
      ? queryKeys.expenses.list(filters)
      : queryKeys.expenses.all,
    queryFn: async () => {
      const response = await api.expenses.get({
        query: {
          startDate: filters?.startDate,
          endDate: filters?.endDate,
          categoryId: filters?.categoryId,
          distribucionId: filters?.distribucionId,
          sellerId: filters?.sellerId,
          paymentMethod: filters?.paymentMethod,
          limit: (filters?.limit ?? DEFAULT_PAGE_SIZE).toString(),
          offset: filters?.offset?.toString(),
        },
      });
      return extractData<Expense[]>(response);
    },
  });
}

/**
 * Get paginated expenses
 */
export function usePaginatedExpenses(query: ExpenseFilters) {
  const pageSize = query.limit ?? 50;
  const offset = query.offset ?? 0;

  return useQuery({
    queryKey: queryKeys.expenses.list(query),
    queryFn: async (): Promise<PaginatedExpensesResult> => {
      const response = await api.expenses.get({
        query: {
          startDate: query.startDate,
          endDate: query.endDate,
          categoryId: query.categoryId,
          distribucionId: query.distribucionId,
          sellerId: query.sellerId,
          paymentMethod: query.paymentMethod,
          limit: String(pageSize),
          offset: String(offset),
        },
      });
      const data = extractData<Expense[]>(response);
      return { items: data, total: data.length };
    },
  });
}

/**
 * Get a single expense by ID
 */
export function useExpense(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.expenses.detail(id) : queryKeys.expenses.all,
    queryFn: async () => {
      if (!id) return null;
      const response = await api.expenses({ id }).get();
      return extractData<Expense>(response);
    },
    enabled: !!id,
  });
}

/**
 * Get expenses by distribucion ID
 */
export function useExpensesByDistribucion(distribucionId: string | null) {
  return useQuery({
    queryKey: distribucionId
      ? queryKeys.expenses.byDistribucion(distribucionId)
      : queryKeys.expenses.all,
    queryFn: async () => {
      if (!distribucionId) return [];
      const response = await api.expenses["by-distribucion"]({ distribucionId }).get();
      return extractData<Expense[]>(response);
    },
    enabled: !!distribucionId,
  });
}

/**
 * Create a new expense
 */
export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateExpenseInput): Promise<Expense> => {
      const response = await api.expenses.post({
        id: input.id,
        categoryId: input.categoryId,
        distribucionId: input.distribucionId,
        sellerId: input.sellerId,
        amount: input.amount,
        description: input.description,
        expenseDate: input.expenseDate,
        paymentMethod: input.paymentMethod ?? "efectivo",
        referenceNumber: input.referenceNumber,
        receiptImageId: input.receiptImageId,
      });
      return extractData<Expense>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.list({}), exact: false });
    },
  });
}

/**
 * Update an existing expense
 */
export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateExpenseInput;
    }): Promise<Expense> => {
      const response = await api.expenses({ id }).put(input);
      return extractData<Expense>(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.expenses.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.list({}), exact: false });
    },
  });
}

/**
 * Delete an expense
 */
export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await api.expenses({ id }).delete();
      if (response.error) throw new Error(String(response.error.value));
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.list({}), exact: false });
    },
  });
}

/**
 * Upload receipt image for an expense
 */
export function useUploadExpenseReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ expenseId, file }: { expenseId: string; file: File }): Promise<Expense> => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.expenses({ id: expenseId }).receipt.post(formData as any);
      return extractData<Expense>(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.expenses.detail(variables.expenseId),
      });
    },
  });
}
