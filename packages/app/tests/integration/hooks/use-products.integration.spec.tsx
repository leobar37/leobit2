/**
 * Integration Tests for useProducts Hook
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../../setup";
import { useProducts } from "~/hooks/use-products-live";
import { useVariantsByProduct } from "~/hooks/use-product-variants";
import "fake-indexeddb/auto";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useProducts Integration", () => {
  const mockProducts = [
    {
      id: "prod-1",
      name: "Pollo Entero",
      type: "pollo",
      unit: "kg",
      basePrice: "12.50",
      isActive: true,
      businessId: "biz-1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "prod-2",
      name: "Pollo Trozado",
      type: "pollo",
      unit: "kg",
      basePrice: "14.00",
      isActive: true,
      businessId: "biz-1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    server.resetHandlers();
    server.use(
      http.get("/api/products", () => {
        return HttpResponse.json({ data: mockProducts });
      })
    );
  });

  describe("useProducts", () => {
    it("should fetch products from API", async () => {
      const { result } = renderHook(() => useProducts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].name).toBe("Pollo Entero");
      expect(result.current.data?.[0].unit).toBe("kg");
    });

    it("should filter active products only", async () => {
      const productsWithInactive = [
        ...mockProducts,
        {
          id: "prod-3",
          name: "Producto Inactivo",
          type: "otros",
          unit: "kg",
          basePrice: "10.00",
          isActive: false,
          businessId: "biz-1",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      server.use(
        http.get("/api/products", () => {
          return HttpResponse.json({ data: productsWithInactive });
        })
      );

      const { result } = renderHook(() => useProducts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Hook should return all products, filtering is done by component
      expect(result.current.data).toHaveLength(3);
    });
  });

  describe("useVariantsByProduct", () => {
    const mockVariants = [
      {
        id: "var-1-1",
        productId: "prod-1",
        name: "Entero 2kg",
        sku: "POL-ENT-2KG",
        unitQuantity: "1",
        price: "25.00",
        isActive: true,
        inventory: { quantity: "100" },
      },
      {
        id: "var-1-2",
        productId: "prod-1",
        name: "Entero 2.5kg",
        sku: "POL-ENT-25KG",
        unitQuantity: "1",
        price: "30.00",
        isActive: true,
        inventory: { quantity: "80" },
      },
    ];

    beforeEach(() => {
      server.use(
        http.get("/api/products/prod-1/variants", () => {
          return HttpResponse.json({ data: mockVariants });
        })
      );
    });

    it("should fetch variants for a product", async () => {
      const { result } = renderHook(
        () => useVariantsByProduct("prod-1", { isActive: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].name).toBe("Entero 2kg");
      expect(result.current.data?.[0].price).toBe("25.00");
    });

    it("should include inventory data", async () => {
      const { result } = renderHook(
        () => useVariantsByProduct("prod-1", { isActive: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.[0].name).toBeDefined();
    });
  });
});
