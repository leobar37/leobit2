import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";

export interface Product {
  id: string;
  name: string;
  type: "pollo" | "huevo" | "otro";
  unit: "kg" | "unidad";
  basePrice: string;
  isActive: boolean;
  imageId: string | null;
  createdAt: Date;
}

export interface CreateProductInput {
  name: string;
  type: "pollo" | "huevo" | "otro";
  unit: "kg" | "unidad";
  basePrice: string;
  isActive?: boolean;
  imageId?: string;
}

export interface UpdateProductInput {
  name?: string;
  type?: "pollo" | "huevo" | "otro";
  unit?: "kg" | "unidad";
  basePrice?: string;
  isActive?: boolean;
  imageId?: string;
}

async function getProducts(): Promise<Product[]> {
  const { data, error } = await api.products.get();

  if (error) {
    throw new Error(String(error.value));
  }

  return (data as { success: boolean; data: Product[] }).data;
}

async function getProduct(id: string): Promise<Product> {
  const { data, error } = await api.products({ id }).get();

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as Product;
}

async function createProduct(input: CreateProductInput): Promise<Product> {
  const { data, error } = await api.products.post(input);

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as Product;
}

async function updateProduct({
  id,
  ...input
}: UpdateProductInput & { id: string }): Promise<Product> {
  const { data, error } = await api.products({ id }).put(input);

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as Product;
}

async function deleteProduct(id: string): Promise<void> {
  const { error } = await api.products({ id }).delete();

  if (error) {
    throw new Error(String(error.value));
  }
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => getProduct(id),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProduct,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", variables.id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
