import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  updatedAt: Date;
}

export interface StockValidationResult {
  available: boolean;
  requestedQty: number;
  availableQty: number;
  productId: string;
}

async function getInventory(): Promise<InventoryItem[]> {
  const { data, error } = await api.inventory.get();

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as InventoryItem[];
}

async function getInventoryItem(productId: string): Promise<InventoryItem> {
  const { data, error } = await api.inventory({ productId }).get();

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as InventoryItem;
}

async function updateStock({
  productId,
  quantity,
}: {
  productId: string;
  quantity: number;
}): Promise<InventoryItem> {
  const { data, error } = await api.inventory({ productId }).put({ quantity });

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as InventoryItem;
}

async function validateStockAvailability({
  productId,
  requestedQty,
}: {
  productId: string;
  requestedQty: number;
}): Promise<StockValidationResult> {
  const { data, error } = await api
    .inventory({ productId })
    .validate.post({ requestedQty });

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as StockValidationResult;
}

export function useInventory() {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: getInventory,
  });
}

export function useInventoryItem(productId: string) {
  return useQuery({
    queryKey: ["inventory", productId],
    queryFn: () => getInventoryItem(productId),
    enabled: !!productId,
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateStock,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({
        queryKey: ["inventory", variables.productId],
      });
    },
  });
}

export function useValidateStock() {
  return useMutation({
    mutationFn: validateStockAvailability,
  });
}
