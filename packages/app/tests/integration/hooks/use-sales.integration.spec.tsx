// @ts-nocheck - Test file
/**
 * Integration Tests for useSales Hook
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../../setup";
import { useCreateSale } from "~/hooks/use-sales";
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

describe("useSales Integration", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  describe("useCreateSale", () => {
    it("should create a cash sale successfully", async () => {
      const createdSale = {
        id: "sale-1",
        businessId: "biz-1",
        clientId: null,
        sellerId: "seller-1",
        saleType: "contado" as const,
        totalAmount: "100.00",
        amountPaid: "100.00",
        balanceDue: "0.00",
        items: [
          {
            productId: "prod-1",
            productName: "Pollo Entero",
            variantId: "var-1-1",
            variantName: "Entero 2kg",
            quantity: 10,
            unitPrice: 10,
            subtotal: 100,
          },
        ],
        createdAt: new Date().toISOString(),
      };

      server.use(
        http.post("/api/sales", async ({ request }) => {
          const body = (await request.json()) as {
            totalAmount: number;
            amountPaid: number;
          };
          return HttpResponse.json({
            data: {
              ...createdSale,
              totalAmount: body.totalAmount.toFixed(2),
              amountPaid: body.amountPaid.toFixed(2),
            },
          });
        })
      );

      const { result } = renderHook(() => useCreateSale(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        clientId: undefined,
        saleType: "contado",
        totalAmount: 100,
        amountPaid: 100,
        items: [
          {
            productId: "prod-1",
            productName: "Pollo Entero",
            variantId: "var-1-1",
            variantName: "Entero 2kg",
            quantity: 10,
            unitPrice: 10,
            subtotal: 100,
          },
        ],
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.totalAmount).toBe("100.00");
      expect(result.current.data?.saleType).toBe("contado");
    });

    it("should create a credit sale with balance due", async () => {
      server.use(
        http.post("/api/sales", async ({ request }) => {
          const body = (await request.json()) as {
            totalAmount: number;
            amountPaid: number;
            clientId?: string;
          };
          const balanceDue = body.totalAmount - body.amountPaid;

          return HttpResponse.json({
            data: {
              id: "sale-2",
              businessId: "biz-1",
              clientId: body.clientId || null,
              sellerId: "seller-1",
              saleType: "credito" as const,
              totalAmount: body.totalAmount.toFixed(2),
              amountPaid: body.amountPaid.toFixed(2),
              balanceDue: balanceDue.toFixed(2),
              items: [],
              createdAt: new Date().toISOString(),
            },
          });
        })
      );

      const { result } = renderHook(() => useCreateSale(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        clientId: "cust-1",
        saleType: "credito",
        totalAmount: 200,
        amountPaid: 50,
        items: [],
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.balanceDue).toBe("150.00");
      expect(result.current.data?.clientId).toBe("cust-1");
    });

    it("should handle sale creation errors", async () => {
      server.use(
        http.post("/api/sales", () => {
          return HttpResponse.json(
            { error: "Insufficient stock" },
            { status: 400 }
          );
        })
      );

      const { result } = renderHook(() => useCreateSale(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        saleType: "contado",
        totalAmount: 100,
        amountPaid: 100,
        items: [],
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });
});
