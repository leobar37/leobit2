import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";

export interface ProductUnit {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  displayName: string;
  baseUnitQuantity: string;
  baseUnit: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CreateUnitInput {
  name: string;
  displayName: string;
  baseUnitQuantity: number;
  variantId: string;
  isActive?: boolean;
}

export interface UpdateUnitInput {
  name?: string;
  displayName?: string;
  baseUnitQuantity?: number;
  variantId?: string;
  isActive?: boolean;
}

const QUERY_KEYS = {
  units: ["product-units"],
  unit: (id: string) => ["product-units", id],
  unitsByProduct: (productId: string) => ["product-units", "product", productId],
} as const;

async function getUnitsByProduct(
  productId: string,
  filters?: { isActive?: boolean; includeInactive?: boolean }
): Promise<ProductUnit[]> {
  const query: Record<string, string> = {};
  if (filters?.isActive !== undefined) query.isActive = String(filters.isActive);
  if (filters?.includeInactive) query.includeInactive = "true";

  const { data, error } = await api.products({ id: productId }).units.get({
    query,
  });

  if (error) {
    throw new Error(String(error.value));
  }

  if (data && typeof data === "object" && "data" in data) {
    return (data as unknown as { data: ProductUnit[] }).data;
  }

  return data as unknown as ProductUnit[];
}

async function getUnit(id: string): Promise<ProductUnit> {
  const { data, error } = await api.units({ id }).get();

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as ProductUnit;
}

async function createUnit(
  productId: string,
  input: CreateUnitInput
): Promise<ProductUnit> {
  const { data, error } = await api.products({ id: productId }).units.post(input);

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as ProductUnit;
}

async function updateUnit(
  id: string,
  input: UpdateUnitInput
): Promise<ProductUnit> {
  const { data, error } = await api.units({ id }).put(input);

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as ProductUnit;
}

async function deactivateUnit(id: string): Promise<void> {
  const { error } = await api.units({ id }).delete();

  if (error) {
    throw new Error(String(error.value));
  }
}

async function reorderUnits(
  productId: string,
  unitIds: string[]
): Promise<void> {
  const { error } = await api.products({ id: productId }).units.reorder.post({ unitIds });

  if (error) {
    throw new Error(String(error.value));
  }
}

export function useProductUnits() {
  return useQuery({
    queryKey: QUERY_KEYS.units,
    queryFn: () => getUnitsByProduct("", {}),
  });
}

export function useProductUnit(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.unit(id),
    queryFn: () => getUnit(id),
    enabled: !!id,
  });
}

export function useUnitsByProduct(
  productId: string,
  filters?: { isActive?: boolean; includeInactive?: boolean }
) {
  return useQuery({
    queryKey: [QUERY_KEYS.unitsByProduct(productId), filters],
    queryFn: () => getUnitsByProduct(productId, filters),
    enabled: !!productId,
  });
}

export function useCreateProductUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, input }: { productId: string; input: CreateUnitInput }) =>
      createUnit(productId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unitsByProduct(variables.productId) });
    },
  });
}

export function useUpdateProductUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUnitInput }) =>
      updateUnit(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unit(data.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unitsByProduct(data.productId) });
    },
  });
}

export function useDeactivateProductUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.units });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useReorderProductUnits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, unitIds }: { productId: string; unitIds: string[] }) =>
      reorderUnits(productId, unitIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unitsByProduct(variables.productId) });
    },
  });
}
