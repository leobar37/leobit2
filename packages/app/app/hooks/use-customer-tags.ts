/**
 * Customer Tags Hooks
 * TanStack Query hooks for customer-tag assignments
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, extractData } from "~/lib/api-client";

export interface CustomerTagAssignment {
  tagId: string;
  tagName: string;
  tagColor: string;
  assignedAt: string;
}

export interface AssignTagsInput {
  customerId: string;
  tagIds: string[];
}

// Query key factory
export const customerTagsKeys = {
  all: ["customer-tags"] as const,
  forCustomer: (customerId: string) =>
    [...customerTagsKeys.all, "customer", customerId] as const,
};

/**
 * Hook to fetch tags assigned to a customer
 */
export function useCustomerTags(customerId: string | undefined) {
  return useQuery({
    queryKey: customerTagsKeys.forCustomer(customerId || ""),
    queryFn: async () => {
      if (!customerId) return [];
      const response = await api.customers({ id: customerId }).tags.get();
      return extractData<CustomerTagAssignment[]>(
        response,
        "Error al cargar etiquetas del cliente"
      );
    },
    enabled: !!customerId,
  });
}

/**
 * Hook to assign tags to a customer
 */
export function useAssignCustomerTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, tagIds }: AssignTagsInput) => {
      const response = await api.customers({ id: customerId }).tags.post({
        tagIds,
      });
      return extractData<CustomerTagAssignment[]>(
        response,
        "Error al asignar etiquetas"
      );
    },
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({
        queryKey: customerTagsKeys.forCustomer(customerId),
      });
    },
  });
}
