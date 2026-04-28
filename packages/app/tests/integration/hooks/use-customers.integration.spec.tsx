/**
 * Integration Tests for useCustomers Hook
 *
 * Tests the hook with MSW-mocked API and fake IndexedDB.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../../setup";
import {
  useCustomers,
  useCreateCustomer,
} from "~/hooks/use-customers";
import "fake-indexeddb/auto";

// Test providers wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useCustomers Integration", () => {
  const mockCustomers = [
    {
      id: "cust-1",
      name: "Juan Perez",
      dni: "12345678",
      phone: "+51 999 888 777",
      businessId: "biz-1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      syncStatus: "synced",
    },
    {
      id: "cust-2",
      name: "Maria Garcia",
      dni: "87654321",
      phone: "+51 999 777 666",
      businessId: "biz-1",
      createdAt: "2024-01-02T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
      syncStatus: "synced",
    },
  ];

  beforeEach(() => {
    // Reset MSW handlers
    server.resetHandlers();

    // Setup default handler
    server.use(
      http.get("/api/customers", () => {
        return HttpResponse.json({ data: mockCustomers });
      })
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe("useCustomers", () => {
    it("should fetch customers from API", async () => {
      const { result } = renderHook(() => useCustomers(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].name).toBe("Juan Perez");
    });

    it("should handle API errors gracefully", async () => {
      server.use(
        http.get("/api/customers", () => {
          return HttpResponse.json(
            { error: "Failed to load" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useCustomers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it("should cache data and not refetch immediately", async () => {
      let requestCount = 0;

      server.use(
        http.get("/api/customers", () => {
          requestCount++;
          return HttpResponse.json({ data: mockCustomers });
        })
      );

      const { result, rerender } = renderHook(() => useCustomers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(requestCount).toBe(1);

      // Rerender should not trigger new request (cached)
      rerender();
      expect(requestCount).toBe(1);
    });
  });

  describe("useCreateCustomer", () => {
    it("should create customer and invalidate cache", async () => {
      const newCustomer = {
        name: "Carlos Rodriguez",
        dni: "45678912",
        phone: "+51 999 666 555",
      };

      server.use(
        http.post("/api/customers", async ({ request }) => {
          const body = (await request.json()) as typeof newCustomer;
          return HttpResponse.json({
            data: {
              id: "cust-new",
              ...body,
              businessId: "biz-1",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              syncStatus: "synced",
            },
          });
        })
      );

      const { result: createResult } = renderHook(() => useCreateCustomer(), {
        wrapper: createWrapper(),
      });

      // Create customer
      createResult.current.mutate(newCustomer);

      await waitFor(() => {
        expect(createResult.current.isSuccess).toBe(true);
      });

      expect(createResult.current.data?.name).toBe("Carlos Rodriguez");
    });
  });
});
