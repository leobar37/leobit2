import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";

export interface Closing {
  id: string;
  businessId: string;
  sellerId: string;
  closingDate: string;
  totalSales: number;
  totalAmount: string;
  cashAmount: string;
  creditAmount: string;
  totalKilos: string | null;
  backdateReason: string | null;
  syncStatus: "pending" | "synced" | "error";
  createdAt: Date;
}

export interface CreateClosingInput {
  closingDate: string;
  totalSales: number;
  totalAmount: number;
  cashAmount: number;
  creditAmount: number;
  totalKilos?: number;
  backdateReason?: string;
}

async function getClosings(): Promise<Closing[]> {
  const { data, error } = await api.closings.get();
  if (error) {
    throw new Error(String(error.value));
  }
  return data as unknown as Closing[];
}

async function getTodayStats(): Promise<{
  totalSales: number;
  totalAmount: number;
  cashAmount: number;
  creditAmount: number;
}> {
  const { data, error } = await api.closings["today-stats"].get();
  if (error) {
    throw new Error(String(error.value));
  }
  return data as unknown as {
    totalSales: number;
    totalAmount: number;
    cashAmount: number;
    creditAmount: number;
  };
}

async function createClosing(input: CreateClosingInput): Promise<Closing> {
  const { data, error } = await api.closings.post({
    closingDate: input.closingDate,
    totalSales: input.totalSales,
    totalAmount: input.totalAmount.toString(),
    cashAmount: input.cashAmount.toString(),
    creditAmount: input.creditAmount.toString(),
    totalKilos: input.totalKilos?.toString(),
    backdateReason: input.backdateReason,
  });
  if (error) {
    throw new Error(String(error.value));
  }
  return data as unknown as Closing;
}

export function useClosings() {
  return useQuery({
    queryKey: ["closings"],
    queryFn: getClosings,
  });
}

export function useClosingTodayStats() {
  return useQuery({
    queryKey: ["closings", "today-stats"],
    queryFn: getTodayStats,
  });
}

export function useCreateClosing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClosing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["closings"] });
    },
  });
}
