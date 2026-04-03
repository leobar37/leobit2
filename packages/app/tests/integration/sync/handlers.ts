/**
 * MSW Handlers for Sync Integration Tests
 * 
 * Mocks the /sync/* endpoints that the PullService calls.
 * Uses relative paths that get prefixed with the base URL.
 */

import { http, HttpResponse } from "msw";

export interface SyncChange {
  idempotencyKey: string;
  entityType: string;
  operation: "create" | "update" | "delete";
  entityId: string;
  payload: Record<string, unknown>;
  localTimestamp: string;
  processedAt: string;
}

export interface SyncChangesResponse {
  success: boolean;
  data: {
    changes: SyncChange[];
    nextSince: string | null;
    hasMore: boolean;
    serverTimestamp: string;
  };
}

export interface SyncHealthResponse {
  success: boolean;
  data: {
    metrics: {
      total: number;
      pending: number;
    };
    errorSummary: Record<string, number>;
    recentErrors: string[];
  };
}

export const syncHandlers = {
  /**
   * Returns mock customer changes
   */
  withCustomers: http.get("/sync/changes", () => {
    return HttpResponse.json({
      success: true,
      data: {
        changes: [
          {
            idempotencyKey: "cust-create-1",
            entityType: "customers",
            operation: "create",
            entityId: "cust-001",
            payload: {
              name: "Juan Perez",
              phone: "+51 999 888 777",
              email: "juan@example.com",
            },
            localTimestamp: "2024-01-01T00:00:00Z",
            processedAt: "2024-01-01T00:00:00Z",
          },
          {
            idempotencyKey: "cust-create-2",
            entityType: "customers",
            operation: "create",
            entityId: "cust-002",
            payload: {
              name: "Maria Garcia",
              phone: "+51 999 777 666",
              email: "maria@example.com",
            },
            localTimestamp: "2024-01-01T00:00:00Z",
            processedAt: "2024-01-01T00:00:00Z",
          },
        ],
        nextSince: "2024-01-02T00:00:00Z",
        hasMore: false,
        serverTimestamp: new Date().toISOString(),
      },
    });
  }),

  /**
   * Returns empty changes (sync_operations table is empty - THE BUG SCENARIO)
   */
  empty: http.get("/sync/changes", () => {
    return HttpResponse.json({
      success: true,
      data: {
        changes: [],
        nextSince: null,
        hasMore: false,
        serverTimestamp: new Date().toISOString(),
      },
    });
  }),

  /**
   * Returns empty but hasMore: true - THE BUG SCENARIO
   * This causes infinite loop without loop protection
   */
  emptyWithHasMore: http.get("/sync/changes", () => {
    return HttpResponse.json({
      success: true,
      data: {
        changes: [],
        nextSince: "2024-01-01T00:00:00Z",
        hasMore: true, // Bug: says there's more but no data!
        serverTimestamp: new Date().toISOString(),
      },
    });
  }),

  /**
   * Returns products data
   */
  withProducts: http.get("/sync/changes", ({ request }) => {
    const url = new URL(request.url);
    const entityTypes = url.searchParams.get("entityTypes");

    if (entityTypes?.includes("products")) {
      return HttpResponse.json({
        success: true,
        data: {
          changes: [
            {
              idempotencyKey: "prod-create-1",
              entityType: "products",
              operation: "create",
              entityId: "prod-001",
              payload: {
                name: "Pollo Entero",
                description: "Pollo entero de 2kg",
                base_price: "12.50",
                unit: "kg",
                active: true,
              },
              localTimestamp: "2024-01-01T00:00:00Z",
              processedAt: "2024-01-01T00:00:00Z",
            },
          ],
          nextSince: "2024-01-02T00:00:00Z",
          hasMore: false,
          serverTimestamp: new Date().toISOString(),
        },
      });
    }

    // Default: return customers
    return HttpResponse.json({
      success: true,
      data: {
        changes: [
          {
            idempotencyKey: "cust-create-1",
            entityType: "customers",
            operation: "create",
            entityId: "cust-001",
            payload: { name: "Test Customer" },
            localTimestamp: "2024-01-01T00:00:00Z",
            processedAt: "2024-01-01T00:00:00Z",
          },
        ],
        nextSince: null,
        hasMore: false,
        serverTimestamp: new Date().toISOString(),
      },
    });
  }),

  /**
   * Returns sales data
   */
  withSales: http.get("/sync/changes", ({ request }) => {
    const url = new URL(request.url);
    const entityTypes = url.searchParams.get("entityTypes");

    if (entityTypes?.includes("sales")) {
      return HttpResponse.json({
        success: true,
        data: {
          changes: [
            {
              idempotencyKey: "sale-create-1",
              entityType: "sales",
              operation: "create",
              entityId: "sale-001",
              payload: {
                customer_id: "cust-001",
                total: "125.00",
                status: "completed",
                payment_method: "cash",
              },
              localTimestamp: "2024-01-01T00:00:00Z",
              processedAt: "2024-01-01T00:00:00Z",
            },
          ],
          nextSince: null,
          hasMore: false,
          serverTimestamp: new Date().toISOString(),
        },
      });
    }

    // Default
    return HttpResponse.json({
      success: true,
      data: {
        changes: [],
        nextSince: null,
        hasMore: false,
        serverTimestamp: new Date().toISOString(),
      },
    });
  }),

  /**
   * Returns paginated results
   */
  paginated: http.get("/sync/changes", ({ request }) => {
    const url = new URL(request.url);
    const since = url.searchParams.get("since");

    // First page
    if (!since) {
      return HttpResponse.json({
        success: true,
        data: {
          changes: [
            {
              idempotencyKey: "cust-create-1",
              entityType: "customers",
              operation: "create",
              entityId: "cust-001",
              payload: { name: "Customer 1" },
              localTimestamp: "2024-01-01T00:00:00Z",
              processedAt: "2024-01-01T00:00:00Z",
            },
          ],
          nextSince: "2024-01-01T00:00:01Z",
          hasMore: true,
          serverTimestamp: new Date().toISOString(),
        },
      });
    }

    // Second page
    if (since === "2024-01-01T00:00:01Z") {
      return HttpResponse.json({
        success: true,
        data: {
          changes: [
            {
              idempotencyKey: "cust-create-2",
              entityType: "customers",
              operation: "create",
              entityId: "cust-002",
              payload: { name: "Customer 2" },
              localTimestamp: "2024-01-01T00:00:02Z",
              processedAt: "2024-01-01T00:00:02Z",
            },
          ],
          nextSince: null,
          hasMore: false,
          serverTimestamp: new Date().toISOString(),
        },
      });
    }

    // Empty
    return HttpResponse.json({
      success: true,
      data: {
        changes: [],
        nextSince: null,
        hasMore: false,
        serverTimestamp: new Date().toISOString(),
      },
    });
  }),

  /**
   * Server error
   */
  error: http.get("/sync/changes", () => {
    return HttpResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }),

  /**
   * Unauthorized error
   */
  unauthorized: http.get("/sync/changes", () => {
    return HttpResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }),
};

export const syncHealthHandlers = {
  healthy: http.get("/sync/health", () => {
    return HttpResponse.json({
      success: true,
      data: {
        metrics: { total: 100, pending: 0 },
        errorSummary: {},
        recentErrors: [],
      },
    });
  }),

  empty: http.get("/sync/health", () => {
    return HttpResponse.json({
      success: true,
      data: {
        metrics: { total: 0, pending: 0 },
        errorSummary: {},
        recentErrors: [],
      },
    });
  }),
};
