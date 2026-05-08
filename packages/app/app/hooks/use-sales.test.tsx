import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("~/lib/api-client", () => ({
  api: {
    sales: {
      post: vi.fn(),
    },
  },
}));

vi.mock("~/lib/api-utils", () => ({
  extractData: vi.fn(
    (response: {
      data?: { success: boolean; data?: unknown } | null;
      error?: { value: unknown } | null;
    }) => {
      if (response.error) throw new Error(String(response.error.value));
      if (!response.data?.success || !response.data.data)
        throw new Error("Request failed");
      return response.data.data;
    }
  ),
}));

vi.mock("~/hooks/use-business", () => ({
  useBusiness: vi.fn(),
}));

import { api } from "~/lib/api-client";
import { useBusiness } from "~/hooks/use-business";
import { useCreateDraftSale } from "./use-sales";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return {
    queryClient,
    wrapper: function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    },
  };
}

describe("useCreateDraftSale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a draft sale using the current business user id", async () => {
    (useBusiness as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { businessUserId: "seller-123" },
    });

    const mockSale = {
      id: "sale-1",
      sellerId: "seller-123",
      type: "instant_sale",
      saleType: "contado",
      totalAmount: "0",
      amountPaid: "0",
      status: "draft",
      businessId: "biz-1",
      customerId: null,
      distribucionId: null,
      visitaId: null,
      paymentMode: null,
      balanceDue: "0",
      tara: null,
      netWeight: null,
      saleDate: new Date().toISOString(),
      deliveryDate: null,
      orderDate: null,
      version: 1,
      allowCustomerEdit: true,
      cancelledAt: null,
      cancelledBy: null,
      cancelReason: null,
      refundAmount: null,
      refundDate: null,
      refundMethod: null,
      refundReference: null,
      refundNotes: null,
      advancePaymentMethod: null,
      advanceReferenceNumber: null,
      advanceProofImageId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    (api.sales.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        success: true,
        data: mockSale,
      },
      error: null,
    });

    const { queryClient, wrapper } = createWrapper();
    const setQueryDataSpy = vi.spyOn(queryClient, "setQueryData");
    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateDraftSale(), { wrapper });

    let sale: unknown;
    await act(async () => {
      sale = await result.current.mutateAsync();
    });

    expect(api.sales.post).toHaveBeenCalledWith(
      expect.objectContaining({
        saleType: "contado",
        totalAmount: 0,
        amountPaid: 0,
        type: "instant_sale",
        items: [],
      })
    );

    expect(sale).toEqual(mockSale);
    expect(setQueryDataSpy).toHaveBeenCalledWith(
      ["sales", "sale-1"],
      expect.objectContaining({ id: "sale-1", items: [] })
    );
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["sales"] })
    );
  });

  it("creates a draft sale even when the business user is missing", async () => {
    (useBusiness as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
    });
    const mockSale = {
      id: "sale-1",
      type: "instant_sale",
      saleType: "contado",
      totalAmount: "0",
      amountPaid: "0",
      status: "draft",
      businessId: "biz-1",
      balanceDue: "0",
      items: [],
    };
    (api.sales.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        success: true,
        data: mockSale,
      },
      error: null,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateDraftSale(), { wrapper });

    const sale = await result.current.mutateAsync();

    expect(api.sales.post).toHaveBeenCalled();
    expect(sale).toEqual(mockSale);
  });
});
