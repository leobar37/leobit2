/**
 * Sales Hook (Service-based)
 * Reactively fetch and mutate sales using PGlite services
 */

import { useCallback } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncEngine } from "@avileo/drizzle-sync/react";
import { SaleService } from "~/lib/services/sale-service";
import { useBusiness } from "~/hooks/use-business";
import { useToastError } from "~/hooks/use-toast-error";
import { useManualSync } from "~/hooks/use-manual-sync";
import type {
  Sale,
  SaleWithItems,
  SaleListItem,
  SaleStatus,
  CreateSaleInput,
  CreateSaleItemInput,
  UpdateSaleInput,
  SalePageQuery,
} from "~/lib/services/sale-service";

export type { Sale, SaleWithItems, SaleListItem, SaleStatus, CreateSaleInput, CreateSaleItemInput, UpdateSaleInput };

export interface CancelSaleInput {
  id: string;
  reason: string;
  refundMethod?: "efectivo" | "yape" | "plin" | "transferencia" | "saldo";
  refundAmount?: number;
  refundReference?: string;
}

const QUERY_KEYS = {
  sales: ["sales-new"],
  sale: (id: string) => ["sales-new", id],
  byCustomer: (customerId: string) => ["sales-new", "customer", customerId],
  byStatus: (status: SaleStatus) => ["sales-new", "status", status],
  page: (query: SalePageQuery) => ["sales-new", "page", query],
} as const;

interface SaleFilters {
  customerId?: string;
  status?: SaleStatus;
  distribucionId?: string | 'none' | 'all';
}

export interface PaginatedSalesResult {
  items: SaleListItem[];
  total: number;
}

/**
 * Get all sales with optional filters (paginated - max 50 per page)
 */
export function useSales(filters?: SaleFilters) {
  const engine = useSyncEngine();
  const saleService = engine.use("sales", () => new SaleService(engine));
  const DEFAULT_PAGE_SIZE = 50;

  return useQuery({
    queryKey: filters
      ? ["sales-new", "filtered", filters]
      : QUERY_KEYS.sales,
    queryFn: async () => {
      const query: SalePageQuery = {
        limit: DEFAULT_PAGE_SIZE,
        offset: 0,
        ...(filters?.customerId && { customerId: filters.customerId }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.distribucionId && filters.distribucionId !== 'all' && {
          distribucionId: filters.distribucionId === 'none' ? 'none' : filters.distribucionId,
        }),
      };
      const result = await saleService.findPageByBusiness(query);
      return result.items;
    },
  });
}

export function usePaginatedSales(query: SalePageQuery) {
  const engine = useSyncEngine();
  const saleService = engine.use("sales", () => new SaleService(engine));

  return useQuery({
    queryKey: QUERY_KEYS.page(query),
    queryFn: async (): Promise<PaginatedSalesResult> => {
      return saleService.findPageByBusiness(query);
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Get a single sale by ID with items
 */
export function useSale(id: string | null) {
  const engine = useSyncEngine();
  const saleService = engine.use("sales", () => new SaleService(engine));

  return useQuery({
    queryKey: id ? QUERY_KEYS.sale(id) : ["sales-new", "detail"],
    queryFn: async (): Promise<SaleWithItems | null> => {
      if (!id) return null;
      return saleService.findById(id);
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

/**
 * Hook to check the sync status of a specific sale
 * Returns sync status information useful for UI decisions
 */
export function useSaleSyncStatus(saleId: string | null) {
  const { data: sale, isLoading, error } = useSale(saleId);
  const { pushNow } = useManualSync();
  const queryClient = useQueryClient();

  const ensureSynced = useCallback(async (): Promise<boolean> => {
    if (sale?.syncStatus === "synced") return true;
    const result = await pushNow();
    if (result.failed === 0) {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sale(saleId!) });
    }
    return result.failed === 0;
  }, [sale?.syncStatus, pushNow, queryClient, saleId]);

  return {
    isSynced: sale?.syncStatus === "synced",
    isPending: sale?.syncStatus === "pending",
    hasSyncError: sale?.syncStatus === "error",
    syncAttempts: sale?.syncAttempts ?? 0,
    syncStatus: sale?.syncStatus ?? "pending",
    sale,
    isLoading,
    error,
    ensureSynced,
  };
}

/**
 * Get sales by customer ID (paginated)
 */
export function useSalesByCustomer(customerId: string) {
  const engine = useSyncEngine();
  const saleService = engine.use("sales", () => new SaleService(engine));
  const DEFAULT_PAGE_SIZE = 50;

  return useQuery({
    queryKey: QUERY_KEYS.byCustomer(customerId),
    queryFn: async () => {
      const result = await saleService.findPageByBusiness({
        limit: DEFAULT_PAGE_SIZE,
        offset: 0,
        customerId,
      });
      return result.items;
    },
    enabled: !!customerId,
  });
}

/**
 * Get sales by status (paginated)
 */
export function useSalesByStatus(status: SaleStatus) {
  const engine = useSyncEngine();
  const saleService = engine.use("sales", () => new SaleService(engine));
  const DEFAULT_PAGE_SIZE = 50;

  return useQuery({
    queryKey: QUERY_KEYS.byStatus(status),
    queryFn: async () => {
      const result = await saleService.findPageByBusiness({
        limit: DEFAULT_PAGE_SIZE,
        offset: 0,
        status,
      });
      return result.items;
    },
  });
}

/**
 * Create a new sale with items
 */
export function useCreateSale() {
  const engine = useSyncEngine();
  const saleService = engine.use("sales", () => new SaleService(engine));
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
      queryClient.invalidateQueries({ queryKey: ["sales-new", "page"], exact: false });
    },
  });
}

/**
 * Create a draft sale without items and return the created sale
 */
export function useCreateDraftSale() {
  const engine = useSyncEngine();
  const saleService = engine.use("sales", () => new SaleService(engine));
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (options?: {
      customerId?: string;
      distribucionId?: string;
      visitaId?: string;
      type?: "instant_sale" | "pre_order";
      deliveryDate?: string;
    }): Promise<Sale> => {
      const perfStart = performance.now();

      const sellerId = business?.businessUserId;

      if (!sellerId) {
        console.log("[useCreateDraftSale] ERROR: No sellerId available");
        throw new Error("Business seller is not available");
      }

      const sale = await saleService.createDraft({
        sellerId,
        type: options?.type ?? "instant_sale",
        saleType: "contado",
        customerId: options?.customerId,
        distribucionId: options?.distribucionId,
        visitaId: options?.visitaId,
        deliveryDate: options?.deliveryDate,
      });
      console.log("[Perf][useCreateDraftSale] mutationFn", {
        saleId: sale.id,
        totalMs: Number((performance.now() - perfStart).toFixed(2)),
      });
      return sale;
    },
    onSuccess: (sale) => {
      queryClient.setQueryData(QUERY_KEYS.sale(sale.id), {
        ...sale,
        items: [],
      });
    },
  });
}

/**
 * Confirm a sale (draft -> active)
 */
export function useConfirmSale() {
  const engine = useSyncEngine();
  const saleService = engine.use("sales", () => new SaleService(engine));
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
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
      queryClient.invalidateQueries({ queryKey: ["customers-new"] });
    },
  });
}

/**
 * Confirm a pre_order (draft -> confirmed)
 */
export function useConfirmPreOrder() {
  const engine = useSyncEngine();
  const saleService = engine.use("sales", () => new SaleService(engine));
  const queryClient = useQueryClient();
  const { showError } = useToastError();

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
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
      queryClient.invalidateQueries({ queryKey: ["customers-new"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Error al confirmar el pedido";
      // Check if it's a version conflict error
      if (message.includes("modificada") || message.includes("modificado")) {
        showError("Conflicto de versión", {
          description: "Esta venta fue modificada. Refresca la página e intenta de nuevo.",
          duration: 6000,
        });
      } else {
        showError("Error al confirmar", error);
      }
    },
  });
}

/**
 * Deliver a pre_order (confirmed -> delivered)
 */
export function useDeliverSale() {
  const engine = useSyncEngine();
  const saleService = engine.use("sales", () => new SaleService(engine));
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
  const engine = useSyncEngine();
  const saleService = engine.use("sales", () => new SaleService(engine));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      reason,
    }: CancelSaleInput): Promise<void> => {
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
  const engine = useSyncEngine();
  const saleService = engine.use("sales", () => new SaleService(engine));
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
    onSuccess: async (_data, variables) => {
      // Apply partial optimistic update to sale detail cache
      queryClient.setQueryData(
        QUERY_KEYS.sale(variables.id),
        (previous: SaleWithItems | null | undefined) => {
          if (!previous) return previous;

          return {
            ...previous,
            ...variables.input,
            updatedAt: new Date().toISOString(),
          };
        }
      );

      // Invalidate page/list queries so next fetch gets fresh data
      queryClient.invalidateQueries({ queryKey: ["sales-new", "page"], exact: false });
    },
    onError: (_error, variables) => {
      // On error, invalidate the sale cache so the next read
      // fetches authoritative data from the server instead of
      // keeping the stale partial update from onSettled
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sale(variables.id) });
    },
  });
}

/**
 * Delete a draft sale (hard delete) or cancel a processed sale (soft delete)
 * All operations go through the sync engine
 */
export function useDeleteSale() {
  const engine = useSyncEngine();
  const saleService = engine.use("sales", () => new SaleService(engine));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }): Promise<void> => {
      if (status === "draft") {
        // Hard delete for drafts
        return saleService.delete(id);
      } else {
        // Soft delete (cancel) for processed sales
        return saleService.cancel(id, "Cancelado por el usuario");
      }
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sale(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sales });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.byStatus("draft") });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.byStatus("cancelled") });
    },
  });
}
