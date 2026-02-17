import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  unitQuantity: string;
  price: string;
  sortOrder: number;
  isActive: boolean;
  syncStatus: "pending" | "synced" | "error";
  syncAttempts: number;
  createdAt: string;
  updatedAt: string;
  inventory?: {
    id: string;
    variantId: string;
    quantity: string;
    updatedAt: string;
  };
}

export interface CreateVariantInput {
  name: string;
  sku?: string;
  unitQuantity: number;
  price: number;
  isActive?: boolean;
}

export interface UpdateVariantInput {
  name?: string;
  sku?: string;
  unitQuantity?: number;
  price?: number;
  isActive?: boolean;
}

async function getVariantsByProduct(
  productId: string,
  filters?: { isActive?: boolean; includeInactive?: boolean }
): Promise<ProductVariant[]> {
  const query: Record<string, string> = {};
  if (filters?.isActive !== undefined) query.isActive = String(filters.isActive);
  if (filters?.includeInactive) query.includeInactive = "true";

  const { data, error } = await api.products({ id: productId }).variants.get({
    query,
  });

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as ProductVariant[];
}

async function getVariant(id: string): Promise<ProductVariant> {
  const { data, error } = await api.variants({ id }).get();

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as ProductVariant;
}

async function createVariant(
  productId: string,
  input: CreateVariantInput
): Promise<ProductVariant> {
  const { data, error } = await api.products({ id: productId }).variants.post(input);

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as ProductVariant;
}

async function updateVariant(
  id: string,
  input: UpdateVariantInput
): Promise<ProductVariant> {
  const { data, error } = await api.variants({ id }).put(input);

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as ProductVariant;
}

async function deactivateVariant(id: string): Promise<void> {
  const { error } = await api.variants({ id }).delete();

  if (error) {
    throw new Error(String(error.value));
  }
}

async function reorderVariants(
  productId: string,
  variantIds: string[]
): Promise<void> {
  const { error } = await api.products({ id: productId }).variants.reorder.post({ variantIds });

  if (error) {
    throw new Error(String(error.value));
  }
}

async function getVariantInventory(variantId: string): Promise<{
  id: string;
  variantId: string;
  quantity: string;
  updatedAt: string;
}> {
  const { data, error } = await api.variants({ id: variantId }).inventory.get();

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as { id: string; variantId: string; quantity: string; updatedAt: string };
}

async function updateVariantInventory(
  variantId: string,
  quantity: number
): Promise<{ id: string; variantId: string; quantity: string; updatedAt: string }> {
  const { data, error } = await api.variants({ id: variantId }).inventory.put({ quantity });

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as { id: string; variantId: string; quantity: string; updatedAt: string };
}

export function useVariantsByProduct(
  productId: string,
  filters?: { isActive?: boolean; includeInactive?: boolean }
) {
  return useQuery({
    queryKey: ["products", productId, "variants", filters],
    queryFn: () => getVariantsByProduct(productId, filters),
    enabled: !!productId,
  });
}

export function useVariant(id: string) {
  return useQuery({
    queryKey: ["variants", id],
    queryFn: () => getVariant(id),
    enabled: !!id,
  });
}

export function useCreateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, input }: { productId: string; input: CreateVariantInput }) =>
      createVariant(productId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products", variables.productId, "variants"] });
    },
  });
}

export function useUpdateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateVariantInput }) =>
      updateVariant(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["variants", data.id] });
      queryClient.invalidateQueries({ queryKey: ["products", data.productId, "variants"] });
    },
  });
}

export function useDeactivateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateVariant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variants"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useReorderVariants() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, variantIds }: { productId: string; variantIds: string[] }) =>
      reorderVariants(productId, variantIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products", variables.productId, "variants"] });
    },
  });
}

export function useVariantInventory(variantId: string) {
  return useQuery({
    queryKey: ["variants", variantId, "inventory"],
    queryFn: () => getVariantInventory(variantId),
    enabled: !!variantId,
  });
}

export function useUpdateVariantInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: string; quantity: number }) =>
      updateVariantInventory(variantId, quantity),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["variants", variables.variantId, "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
