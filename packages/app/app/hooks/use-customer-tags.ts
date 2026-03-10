import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { useBusiness } from "./use-business";

export interface CustomerTag {
  id: string;
  customerId: string;
  tagId: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  businessId: string;
  createdAt: string;
  updatedAt: string;
  customerCount?: number;
}

export function useCustomerTags(customerId: string | undefined) {
  const { currentBusiness } = useBusiness();
  
  return useQuery({
    queryKey: ["customer-tags", customerId],
    queryFn: async () => {
      if (!customerId || !currentBusiness?.id) return [];
      const res = await api.customers({ id: customerId }).tags.get();
      if (res.data?.success) {
        return res.data.data as CustomerTag[];
      }
      return [];
    },
    enabled: !!customerId && !!currentBusiness?.id,
  });
}

export function useAddCustomerTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ customerId, tagId }: { customerId: string; tagId: string }) => {
      const res = await api.customers({ id: customerId }).tags.post({ tagId });
      if (!res.data?.success) throw new Error("Failed to add tag");
      return res.data.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["customer-tags", vars.customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useRemoveCustomerTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ customerId, tagId }: { customerId: string; tagId: string }) => {
      const res = await api.customers({ id: customerId }).tags({ tagId }).delete();
      if (!res.data?.success) throw new Error("Failed to remove tag");
      return res.data.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["customer-tags", vars.customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
