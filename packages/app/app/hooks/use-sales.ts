/**
 * Sales Hook (API-based)
 * Reactively fetch and mutate sales using Eden Treaty API
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { queryKeys } from "~/lib/query-keys";
import { useBusiness } from "~/hooks/use-business";
import { useToastError } from "~/hooks/use-toast-error";
import { getSaleFinancialState } from "~/hooks/use-sale-calculations";

export type SaleStatus = "draft" | "confirmed" | "active" | "delivered" | "cancelled";
export type SaleType = "instant_sale" | "pre_order";
export type SalePaymentType = "contado" | "credito";

export interface SaleCustomer {
  id: string;
  name: string;
  dni: string | null;
  phone: string | null;
}

export interface SaleItem {
  id: string;
  businessId: string;
  saleId: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: string | null;
  orderedQuantity: string | null;
  deliveredQuantity: string | null;
  unitPrice: string | null;
  unitPriceQuoted: string | null;
  unitPriceFinal: string | null;
  subtotal: string;
  isModified: boolean;
  originalQuantity: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  businessId: string;
  customerId: string | null;
  customer?: SaleCustomer | null;
  sellerId: string;
  distribucionId: string | null;
  visitaId: string | null;
  type: SaleType;
  saleType: SalePaymentType;
  paymentMode: "pago_total" | "a_cuenta" | "debe_todo" | null;
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  tara: string | null;
  netWeight: string | null;
  saleDate: string;
  deliveryDate: string | null;
  orderDate: string | null;
  status: SaleStatus;
  version: number;
  allowCustomerEdit: boolean;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  refundAmount: string | null;
  refundDate: string | null;
  refundMethod: "efectivo" | "yape" | "plin" | "transferencia" | "saldo" | null;
  refundReference: string | null;
  refundNotes: string | null;
  advancePaymentMethod: string | null;
  advanceReferenceNumber: string | null;
  advanceProofImageId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SaleWithItems = Sale & { items: SaleItem[] };
export type SaleListItem = Sale & { items?: SaleItem[] };

export interface SalePageQuery {
  limit: number;
  offset: number;
  customerId?: string;
  status?: SaleStatus;
  distribucionId?: string | "none" | "all";
  search?: string;
  type?: SaleType;
  saleType?: SalePaymentType;
  startDate?: string;
  endDate?: string;
  hasBalanceDue?: boolean;
}

export interface PaginatedSalesResult {
  items: SaleListItem[];
  total: number;
}

export interface CreateSaleInput {
  customerId?: string;
  sellerId: string;
  distribucionId?: string;
  visitaId?: string;
  type?: SaleType;
  saleType?: SalePaymentType;
  totalAmount: number;
  amountPaid?: number;
  tara?: number;
  netWeight?: number;
  deliveryDate?: string;
  orderDate?: string;
  paymentMode?: "pago_total" | "a_cuenta" | "debe_todo";
}

export interface CreateSaleItemInput {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity?: number;
  orderedQuantity?: number;
  unitPrice?: number;
  unitPriceQuoted?: number;
  subtotal: number;
}

export interface UpdateSaleInput {
  customerId?: string;
  saleType?: SalePaymentType;
  type?: SaleType;
  totalAmount?: number;
  amountPaid?: number;
  balanceDue?: number;
  tara?: number;
  netWeight?: number;
  deliveryDate?: string;
  orderDate?: string;
  paymentMode?: "pago_total" | "a_cuenta" | "debe_todo";
}

export interface CancelSaleInput {
  id: string;
  reason: string;
  refundMethod?: "efectivo" | "yape" | "plin" | "transferencia" | "saldo";
  refundAmount?: number;
  refundReference?: string;
}

interface SaleFilters {
  customerId?: string;
  status?: SaleStatus;
  distribucionId?: string | "none" | "all";
}

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function applyClientSideFilters(
  sales: SaleListItem[],
  filters?: SalePageQuery | SaleFilters
): SaleListItem[] {
  if (!filters) return sales;

  return sales.filter((sale) => {
    const pageFilters = filters as SalePageQuery;

    if (pageFilters.customerId && sale.customerId !== pageFilters.customerId) {
      return false;
    }
    if (pageFilters.status && sale.status !== pageFilters.status) {
      return false;
    }
    if (pageFilters.distribucionId && pageFilters.distribucionId !== "all") {
      if (pageFilters.distribucionId === "none") {
        if (sale.distribucionId !== null) return false;
      } else if (sale.distribucionId !== pageFilters.distribucionId) {
        return false;
      }
    }
    if (pageFilters.type && sale.type !== pageFilters.type) {
      return false;
    }
    if (pageFilters.hasBalanceDue && toNumber(sale.balanceDue) <= 0) {
      return false;
    }
    if (pageFilters.search?.trim()) {
      const term = pageFilters.search.trim().toLowerCase();
      const inId = sale.id.toLowerCase().includes(term);
      const inCustomer = sale.customer?.name?.toLowerCase().includes(term) ?? false;
      const inType = sale.saleType.toLowerCase().includes(term);
      if (!inId && !inCustomer && !inType) return false;
    }

    return true;
  });
}

/**
 * Get all sales with optional filters (paginated - max 50 per page)
 */
export function useSales(filters?: SaleFilters) {
  const DEFAULT_PAGE_SIZE = 50;

  return useQuery({
    queryKey: filters
      ? queryKeys.sales.lists(filters)
      : queryKeys.sales.all,
    queryFn: async () => {
      const response = await api.sales.get({
        query: {
          limit: String(DEFAULT_PAGE_SIZE),
          offset: "0",
        },
      });
      const sales = extractData<SaleListItem[]>(response);
      return applyClientSideFilters(sales, filters);
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

export function usePaginatedSales(query: SalePageQuery) {
  return useQuery({
    queryKey: queryKeys.sales.lists(query),
    queryFn: async (): Promise<PaginatedSalesResult> => {
      const fetchLimit = query.limit * 3;
      const response = await api.sales.get({
        query: {
          ...(query.startDate && { startDate: query.startDate }),
          ...(query.endDate && { endDate: query.endDate }),
          ...(query.saleType && { saleType: query.saleType }),
          limit: String(fetchLimit),
          offset: String(query.offset),
        },
      });
      const sales = extractData<SaleListItem[]>(response);
      const filtered = applyClientSideFilters(sales, query);

      return {
        items: filtered.slice(0, query.limit),
        total: filtered.length,
      };
    },
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

/**
 * Get a single sale by ID with items
 */
export function useSale(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.sales.detail(id) : ["sales", "detail"],
    queryFn: async (): Promise<SaleWithItems | null> => {
      if (!id) return null;
      const response = await api.sales({ id }).get();
      return extractData<SaleWithItems>(response);
    },
    enabled: !!id,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

/**
 * Get sales by customer ID (paginated)
 */
export function useSalesByCustomer(customerId: string) {
  const DEFAULT_PAGE_SIZE = 50;

  return useQuery({
    queryKey: queryKeys.sales.byCustomer(customerId),
    queryFn: async () => {
      const response = await api.sales.get({
        query: {
          limit: String(DEFAULT_PAGE_SIZE),
          offset: "0",
        },
      });
      const sales = extractData<SaleListItem[]>(response);
      return sales.filter((sale) => sale.customerId === customerId);
    },
    enabled: !!customerId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

/**
 * Get sales by status (paginated)
 */
export function useSalesByStatus(status: SaleStatus) {
  const DEFAULT_PAGE_SIZE = 50;

  return useQuery({
    queryKey: queryKeys.sales.byStatus(status),
    queryFn: async () => {
      const response = await api.sales.get({
        query: {
          limit: String(DEFAULT_PAGE_SIZE),
          offset: "0",
        },
      });
      const sales = extractData<SaleListItem[]>(response);
      return sales.filter((sale) => sale.status === status);
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

/**
 * Create a new sale with items
 */
export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sale,
      items,
    }: {
      sale: CreateSaleInput;
      items: CreateSaleItemInput[];
    }): Promise<Sale> => {
      const response = await api.sales.post({
        customerId: sale.customerId,
        distribucionId: sale.distribucionId,
        visitaId: sale.visitaId,
        type: sale.type,
        saleType: sale.saleType ?? "contado",
        totalAmount: sale.totalAmount,
        amountPaid: sale.amountPaid ?? 0,
        tara: sale.tara,
        netWeight: sale.netWeight,
        deliveryDate: sale.deliveryDate,
        orderDate: sale.orderDate,
        items: items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          variantId: item.variantId,
          variantName: item.variantName,
          quantity: item.quantity,
          orderedQuantity: item.orderedQuantity,
          unitPrice: item.unitPrice,
          unitPriceQuoted: item.unitPriceQuoted,
          subtotal: item.subtotal,
        })),
      });
      return extractData<Sale>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.lists({}), exact: false });
    },
  });
}

/**
 * Create a draft sale without items and return the created sale
 */
export function useCreateDraftSale() {
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
      const sellerId = business?.businessUserId;

      if (!sellerId) {
        throw new Error("Business seller is not available");
      }

      const response = await api.sales.post({
        saleType: "contado",
        totalAmount: 0,
        amountPaid: 0,
        type: options?.type ?? "instant_sale",
        customerId: options?.customerId,
        distribucionId: options?.distribucionId,
        visitaId: options?.visitaId,
        deliveryDate: options?.deliveryDate,
        items: [],
      });

      const sale = extractData<Sale>(response);
      return sale;
    },
    onSuccess: (sale) => {
      queryClient.setQueryData(queryKeys.sales.detail(sale.id), {
        ...sale,
        items: [],
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
    },
  });
}

/**
 * Confirm a sale (draft -> active)
 */
export function useConfirmSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await api.sales({ id }).confirm.post({});
      extractData(response);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.byStatus("draft") });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.byStatus("active") });
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
      queryClient.invalidateQueries({ queryKey: ["customers-new"] });
    },
  });
}

/**
 * Confirm a pre_order (draft -> confirmed)
 */
export function useConfirmPreOrder() {
  const queryClient = useQueryClient();
  const { showError } = useToastError();

  return useMutation({
    mutationFn: async ({ id, baseVersion }: { id: string; baseVersion: number }): Promise<void> => {
      const response = await api.sales({ id }).confirm.post({ baseVersion });
      extractData(response);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.byStatus("draft") });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.byStatus("confirmed") });
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
      queryClient.invalidateQueries({ queryKey: ["customers-new"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Error al confirmar el pedido";
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, baseVersion }: { id: string; baseVersion: number }): Promise<void> => {
      const response = await api.sales({ id }).deliver.post({ baseVersion });
      extractData(response);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.byStatus("confirmed") });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.byStatus("delivered") });
    },
  });
}

/**
 * Cancel a sale
 */
export function useCancelSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason, refundAmount, refundMethod, refundReference }: CancelSaleInput): Promise<void> => {
      const response = await api.sales({ id }).cancel.post({
        reason,
        refundAmount,
        refundMethod,
        refundReference,
      });
      extractData(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
    },
  });
}

/**
 * Update a sale
 */
export function useUpdateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateSaleInput;
    }): Promise<void> => {
      const response = await api.sales({ id }).patch({
        customerId: input.customerId ?? null,
        deliveryDate: input.deliveryDate ?? null,
        saleType: input.saleType,
        paymentMode: input.paymentMode ?? null,
        totalAmount: input.totalAmount,
        amountPaid: input.amountPaid,
      });
      extractData(response);
    },
    onSuccess: async (_data, variables) => {
      queryClient.setQueryData(
        queryKeys.sales.detail(variables.id),
        (previous: SaleWithItems | null | undefined) => {
          if (!previous) return previous;

          const nextSaleType = variables.input.saleType ?? previous.saleType;
          const nextTotalAmount = variables.input.totalAmount ?? toNumber(previous.totalAmount);
          const nextAmountPaid = variables.input.amountPaid ?? toNumber(previous.amountPaid);
          const { balanceDue } = getSaleFinancialState({
            saleType: nextSaleType,
            totalAmount: nextTotalAmount,
            amountPaid: nextAmountPaid,
          });

          return {
            ...previous,
            ...variables.input,
            totalAmount: nextTotalAmount.toString(),
            amountPaid: nextAmountPaid.toString(),
            balanceDue: balanceDue.toString(),
            updatedAt: new Date().toISOString(),
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.lists({}), exact: false });
    },
    onError: (_error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.detail(variables.id) });
    },
  });
}

/**
 * Delete a draft sale (hard delete) or cancel a processed sale (soft delete)
 */
export function useDeleteSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }): Promise<void> => {
      if (status === "draft") {
        const response = await api.sales({ id }).delete();
        if (response.error) throw new Error(String(response.error.value));
      } else {
        const response = await api.sales({ id }).cancel.post({ reason: "Cancelado por el usuario" });
        extractData(response);
      }
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.byStatus("draft") });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.byStatus("cancelled") });
    },
  });
}
