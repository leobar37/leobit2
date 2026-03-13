import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServicesProvider } from "../lib/sync/service-provider";
import { SaleService } from "../lib/services/sale-service";

const mockInvalidateQueries = vi.fn();

import { useCreateDraftSale } from "./use-sales";

function createWrapper(businessUserId?: string) {
  const queryClient = new QueryClient();
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  invalidateSpy.mockImplementation(mockInvalidateQueries);
  queryClient.setQueryData(["business"], {
    businessUserId,
  });
  const pg = {
    exec: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue({ rows: [] }),
  };

  return {
    queryClient,
    wrapper: function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          <ServicesProvider
            pg={pg as never}
            businessId="biz-1"
            authToken="token-1"
          >
            {children}
          </ServicesProvider>
        </QueryClientProvider>
      );
    },
  };
}

describe("useCreateDraftSale", () => {
  beforeEach(() => {
    mockInvalidateQueries.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates a draft sale using the current business user id", async () => {
    const createDraftSpy = vi.spyOn(SaleService.prototype, "createDraft");
    createDraftSpy.mockResolvedValue({
      id: "sale-1",
    } as never);

    const { wrapper } = createWrapper("seller-123");
    const { result } = renderHook(() => useCreateDraftSale(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(createDraftSpy).toHaveBeenCalledWith({
      sellerId: "seller-123",
      type: "instant_sale",
      saleType: "contado",
    });
    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ["sales-new"],
      });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ["sales-new", "status", "draft"],
      });
    });
  });

  it("fails with a clear error when the business user is missing", async () => {
    const createDraftSpy = vi.spyOn(SaleService.prototype, "createDraft");

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateDraftSale(), { wrapper });

    const mutationPromise = result.current.mutateAsync();

    await expect(mutationPromise).rejects.toThrow(
      "Business seller is not available"
    );
    expect(createDraftSpy).not.toHaveBeenCalled();
  });
});
