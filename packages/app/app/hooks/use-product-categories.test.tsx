import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api-client", () => ({
  api: {
    "product-categories": Object.assign(
      vi.fn(() => ({ get: vi.fn(), put: vi.fn(), delete: vi.fn() })),
      { get: vi.fn(), post: vi.fn() }
    ),
  },
}));

vi.mock("../lib/api-utils", () => ({
  extractData: vi.fn((response: {
    data?: { success: boolean; data?: unknown } | null;
    error?: { value: unknown } | null;
  }) => {
    if (response.error) throw new Error(String(response.error.value));
    if (!response.data?.success || !response.data.data)
      throw new Error("Request failed");
    return response.data.data;
  }),
}));

import { api } from "../lib/api-client";
import {
  useProductCategories,
  useProductCategory,
  useCreateProductCategory,
  useUpdateProductCategory,
  useDeleteProductCategory,
} from "./use-product-categories";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

const mockCategory = {
  id: "cat-1",
  name: "Pollo",
  color: "#f97316",
  businessId: "biz-1",
  createdAt: "2026-04-30T00:00:00Z",
  updatedAt: "2026-04-30T00:00:00Z",
};

describe("useProductCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches all product categories", async () => {
    (api["product-categories"].get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true, data: [mockCategory] },
      error: null,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProductCategories(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockCategory]);
  });
});

describe("useProductCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches a single product category by id", async () => {
    const detailGet = vi.fn().mockResolvedValue({
      data: { success: true, data: mockCategory },
      error: null,
    });
    (api["product-categories"] as ReturnType<typeof vi.fn>).mockReturnValue({
      get: detailGet,
      put: vi.fn(),
      delete: vi.fn(),
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProductCategory("cat-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockCategory);
  });

  it("returns undefined when id is null", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProductCategory(null), { wrapper });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });
});

describe("useCreateProductCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a product category and invalidates the list", async () => {
    (api["product-categories"].post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true, data: mockCategory },
      error: null,
    });

    const { queryClient, wrapper } = createWrapper();
    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateProductCategory(), { wrapper });

    let created: unknown;
    await act(async () => {
      created = await result.current.mutateAsync({ name: "Pollo" });
    });

    expect(api["product-categories"].post).toHaveBeenCalledWith({ name: "Pollo" });
    expect(created).toEqual(mockCategory);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["product-categories"] })
    );
  });
});

describe("useUpdateProductCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a product category and invalidates queries", async () => {
    const updated = { ...mockCategory, name: "Pollo Premium" };
    const detailPut = vi.fn().mockResolvedValue({
      data: { success: true, data: updated },
      error: null,
    });
    (api["product-categories"] as ReturnType<typeof vi.fn>).mockReturnValue({
      get: vi.fn(),
      put: detailPut,
      delete: vi.fn(),
    });

    const { queryClient, wrapper } = createWrapper();
    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateProductCategory(), { wrapper });

    let returned: unknown;
    await act(async () => {
      returned = await result.current.mutateAsync({
        id: "cat-1",
        input: { name: "Pollo Premium" },
      });
    });

    expect(detailPut).toHaveBeenCalledWith({ name: "Pollo Premium" });
    expect(returned).toEqual(updated);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["product-categories", "cat-1"] })
    );
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["product-categories"] })
    );
  });
});

describe("useDeleteProductCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a product category and invalidates queries", async () => {
    const detailDelete = vi.fn().mockResolvedValue({ error: null });
    (api["product-categories"] as ReturnType<typeof vi.fn>).mockReturnValue({
      get: vi.fn(),
      put: vi.fn(),
      delete: detailDelete,
    });

    const { queryClient, wrapper } = createWrapper();
    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteProductCategory(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("cat-1");
    });

    expect(detailDelete).toHaveBeenCalled();
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["product-categories", "cat-1"] })
    );
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["product-categories"] })
    );
  });
});
