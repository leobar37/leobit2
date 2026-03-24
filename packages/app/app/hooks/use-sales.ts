/**
 * Sales Hook (Service-based)
 * Reactively fetch and mutate sales using PGlite services
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBusiness } from "~/hooks/use-business";
import { useSaleService } from "~/lib/sync/service-provider";
import type {
  Sale,
  SaleWithItems,
  SaleStatus,
  CreateSaleInput,
  CreateSaleItemInput,
  UpdateSaleInput,
} from "~/lib/services/sale-service";

export type { Sale, SaleWithItems, SaleStatus, CreateSaleInput, CreateSaleItemInput, UpdateSaleInput };

export interface CancelSaleInput {
  id: string;
  reason: string;
  refundMethod?: "efectivo" | "yape" | "plin" | "transferencia" | "saldo";
}

const QUERY_KEYS = {
  sales: ["sales-new"],
  sale: (id: string) => ["sales-new", id],
  byCustomer: (customerId: string) => ["sales-new", "customer", customerId],
  byStatus: (status: SaleStatus) => ["sales-new", "status", status],
} as const;

interface SaleFilters {
  customerId?: string;
  status?: SaleStatus;
}

/**
 * Get all sales with optional filters
 */
export function useSales(filters?: SaleFilters) {
  const saleService = useSaleService();

  return useQuery({
    queryKey: filters
      ? ["sales-new", "filtered", filters]
      : QUERY_KEYS.sales,
    queryFn: async () => {
      if (filters?.customerId) {
        return saleService.findByCustomerId(filters.customerId);
      } else if (filters?.status) {
        return saleService.findByStatus(filters.status);
      }
      return saleService.findByBusiness();
    },
  });
}

/**
 * Get a single sale by ID with items
 */
export function useSale(id: string | null) {
  const saleService = useSaleService();

  return useQuery({
    queryKey: id ? QUERY_KEYS.sale(id) : ["sales-new", "detail"],
    queryFn: async (): Promise<SaleWithItems | null> => {
      if (!id) return null;
      return saleService.findById(id);
    },
    enabled: !!id,
  });
}

/**
 * Get sales by customer ID
 */
export function useSalesByCustomer(customerId: string) {
  const saleService = useSaleService();

  return useQuery({
    queryKey: QUERY_KEYS.byCustomer(customerId),
    queryFn: async () => {
      return saleService.findByCustomerId(customerId);
    },
    enabled: !!customerId,
  });
}

/**
 * Get sales by status
 */
export function useSalesByStatus(status: SaleStatus) {
  const saleService = useSaleService();

  return useQuery({
    queryKey: QUERY_KEYS.byStatus(status),
    queryFn: async () => {
      return saleService.findByStatus(status);
    },
  });
}

/**
 * Create a new sale with items
 */
export function useCreateSale() {
  const saleService = useSaleService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sale,
      items,
    }: {
      sale: CreateSaleInput;
      items: CreateSaleItemInput[];
    }): Promise<Sale> => {
      return saleService.createWithItems(sale, items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sales });
    },
  });
}

/**
 * Create a draft sale without items and return the created sale
 */
export function useCreateDraftSale() {
  const saleService = useSaleService();
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (options?: {
      customerId?: string;
      distribucionId?: string;
      visitaId?: string;
      type?: "instant_sale" | "pre_order";
    }): Promise<Sale> => {
      console.log("[useCreateDraftSale] Mutation started");
      console.log("[useCreateDraftSale] business?.businessUserId:", business?.businessUserId);

      const sellerId = business?.businessUserId;

      if (!sellerId) {
        console.log("[useCreateDraftSale] ERROR: No sellerId available");
        throw new Error("Business seller is not available");
      }

      console.log("[useCreateDraftSale] Calling saleService.createDraft with sellerId:", sellerId);
      const sale = await saleService.createDraft({
        sellerId,
        type: options?.type ?? "instant_sale",
        saleType: "contado",
        customerId: options?.customerId,
        distribucionId: options?.distribucionId,
        visitaId: options?.visitaId,
      });
      console.log("[useCreateDraftSale] Sale created with id:", sale.id);
      return sale;
    },
    onSuccess: () => {
      console.log("[useCreateDraftSale] Mutation succeeded");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sales });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.byStatus("draft") });
    },
  });
}

/**
 * Confirm a sale (draft -> active)
 */
export function useConfirmSale() {
  const saleService = useSaleService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return saleService.confirm(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sale(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sales });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.byStatus("draft") });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.byStatus("active") });
    },
  });
}

/**
 * Confirm a pre_order (draft -> confirmed)
 */
export function useConfirmPreOrder() {
  const saleService = useSaleService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, baseVersion }: { id: string; baseVersion: number }): Promise<void> => {
      return saleService.confirmPreOrder(id, baseVersion);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sale(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sales });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.byStatus("draft") });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.byStatus("confirmed"),
      });
    },
  });
}

/**
 * Deliver a pre_order (confirmed -> delivered)
 */
export function useDeliverSale() {
  const saleService = useSaleService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return saleService.deliver(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sale(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sales });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.byStatus("confirmed"),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.byStatus("delivered"),
      });
    },
  });
}

/**
 * Cancel a sale
 */
export function useCancelSale() {
  const saleService = useSaleService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      reason,
    }: {
      id: string;
      reason: string;
    }): Promise<void> => {
      return saleService.cancel(id, reason);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.sale(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sales });
    },
  });
}

/**
 * Update a sale
 */
export function useUpdateSale() {
  const saleService = useSaleService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateSaleInput;
    }): Promise<void> => {
      return saleService.update(id, input);
    },
    onSuccess: async (_, variables) => {
      // Invalidate the specific sale query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sale(variables.id) });
      // Also invalidate the sales list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sales });
    },
  });
}

import { api } from "~/lib/api-client";

/**
 * Delete a draft sale (hard delete) or processed sale (soft delete)
 */
export function useDeleteSale() {
  const saleService = useSaleService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // Get sale to check its status
      const sale = await saleService.findById(id);
      if (!sale) {
        throw new Error("Venta no encontrada");
      }

      // Draft sales: hard delete locally
      // Processed sales: soft delete via API
      if (sale.status === "draft") {
        return saleService.delete(id);
      } else {
        // Call backend API for soft delete
        const { error } = await api.sales({ id }).delete();
        if (error) {
          throw new Error(String(error.value));
        }
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sale(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sales });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.byStatus("draft") });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.byStatus("cancelled") });
    },
  });
}
