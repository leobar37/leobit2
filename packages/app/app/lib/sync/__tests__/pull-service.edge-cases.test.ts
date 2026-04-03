/**
 * PullService Edge Cases Tests
 * 
 * Tests for edge cases and bug scenarios in the PullService,
 * particularly focusing on the "stuck sync" scenario.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PullService } from "../pull-service";

// Mock session-storage
vi.mock("~/lib/session-storage", () => ({
  getLocalDatabaseNamespace: () => null,
  getPullCursorStorageKey: (namespace?: string | null) =>
    namespace ? `avileo_pull_cursor:${namespace}` : "avileo_pull_cursor",
}));

// Mock config
vi.mock("../config", () => ({
  PULL_INTERVAL_MS: 10000,
  BACKOFF_BASE_MS: 1000,
  BACKOFF_MAX_MS: 30000,
  calculateBackoffDelay: vi.fn((failures: number) => {
    if (failures === 0) return 0;
    return Math.min(1000 * Math.pow(2, failures - 1), 30000);
  }),
}));

// Mock change-applier - use function form to get vi access
vi.mock("../change-applier", () => {
  const mockFn = vi.fn(() => Promise.resolve({ success: true }));
  return { applyChange: mockFn };
});

// Global fetch mock
const mockFetch = vi.fn();

describe("PullService Edge Cases", () => {
  const mockPg = {} as any;
  const mockDb = {} as any;
  const businessId = "test-business-id";
  const authToken = "test-token";

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            changes: [],
            nextSince: null,
            hasMore: false,
            serverTimestamp: new Date().toISOString(),
          },
        }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("THE CRITICAL BUG: hasMore: true with 0 changes", () => {
    it("should handle empty response with hasMore: false (normal)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              changes: [],
              nextSince: null,
              hasMore: false,
              serverTimestamp: new Date().toISOString(),
            },
          }),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      const result = await service.pull();

      expect(result.success).toBe(true);
      expect(result.changesApplied).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it("documents the bug: hasMore: true with empty changes causes potential loop", async () => {
      // This is THE BUG SCENARIO
      // Server returns hasMore: true but changes: []
      // Without loop protection in StagedPullCoordinator, this causes infinite loop
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              changes: [],
              nextSince: "cursor-doesnt-advance",
              hasMore: true, // Bug: says there's more but no data
              serverTimestamp: new Date().toISOString(),
            },
          }),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      const result = await service.pull();

      // PullService itself doesn't loop - it just returns the response
      // Loop protection needs to be in StagedPullCoordinator
      expect(result.success).toBe(true);
      expect(result.changesApplied).toBe(0);
      expect(result.hasMore).toBe(true); // This is the dangerous signal
    });
  });

  describe("pullWithOptions edge cases", () => {
    it("should pass entityTypes as comma-separated string", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              changes: [],
              nextSince: null,
              hasMore: false,
              serverTimestamp: new Date().toISOString(),
            },
          }),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      await service.pullWithOptions({
        entityTypes: ["customers", "products", "product_variants"],
      });

      const url = mockFetch.mock.calls[0][0] as string;
      // URLSearchParams encodes commas as %2C
      expect(url).toContain("entityTypes=customers%2Cproducts%2Cproduct_variants");
    });

    it("should handle single entity type", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              changes: [],
              nextSince: null,
              hasMore: false,
              serverTimestamp: new Date().toISOString(),
            },
          }),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      await service.pullWithOptions({
        entityTypes: ["customers"],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("entityTypes=customers"),
        expect.any(Object)
      );
    });

    it("should send limit parameter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              changes: [],
              nextSince: null,
              hasMore: false,
              serverTimestamp: new Date().toISOString(),
            },
          }),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      await service.pullWithOptions({
        limit: 50,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("limit=50"),
        expect.any(Object)
      );
    });

    it("should send cursor when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              changes: [],
              nextSince: null,
              hasMore: false,
              serverTimestamp: new Date().toISOString(),
            },
          }),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      await service.pullWithOptions({
        since: "2024-01-01T00:00:00Z",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("since=2024-01-01"),
        expect.any(Object)
      );
    });

    it("should use stage-specific cursor key", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              changes: [],
              nextSince: null,
              hasMore: false,
              serverTimestamp: new Date().toISOString(),
            },
          }),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      await service.pullWithOptions({
        cursorKey: "critical",
      });

      // The cursor key is used for saving to localStorage
      // Verify the method doesn't throw
      expect(service.getLastSince()).toBeNull();
    });
  });

  describe("concurrent pulls prevention", () => {
    it("should prevent concurrent pulls", async () => {
      // Create service and manually set isPullingFlag
      const service = new PullService(mockPg, mockDb, businessId, authToken) as any;
      service.isPullingFlag = true;

      const result = await service.pull();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Pull already in progress");
    });

    it("should reset isPullingFlag on error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Server error"),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken) as any;

      await service.pull();

      expect(service.isPullingFlag).toBe(false);
    });
  });

  describe("backoff behavior", () => {
    it("should increment consecutive failures on HTTP error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);

      await service.pull();
      expect(service.getStatus().consecutiveFailures).toBe(1);

      await service.pull();
      expect(service.getStatus().consecutiveFailures).toBe(2);
    });

    it("should reset consecutive failures on success", async () => {
      // First, cause some failures
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Error"),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Error"),
        });

      const service = new PullService(mockPg, mockDb, businessId, authToken);

      await service.pull();
      await service.pull();

      expect(service.getStatus().consecutiveFailures).toBe(2);

      // Now mock success
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              changes: [],
              nextSince: null,
              hasMore: false,
              serverTimestamp: new Date().toISOString(),
            },
          }),
      });

      await service.pull();

      expect(service.getStatus().consecutiveFailures).toBe(0);
    });

    it("should track lastError on failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Database connection failed"),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);

      await service.pull();

      expect(service.getStatus().lastError).toContain("500");
    });
  });

  describe("error handling", () => {
    it("should handle 401 Unauthorized", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      const result = await service.pull();

      expect(result.success).toBe(false);
      expect(result.error).toContain("401");
    });

    it("should handle 403 Forbidden", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve("Forbidden"),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      const result = await service.pull();

      expect(result.success).toBe(false);
      expect(result.error).toContain("403");
    });

    it("should handle network timeout (AbortError)", async () => {
      mockFetch.mockRejectedValue(new Error("Aborted"));

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      const result = await service.pull();

      expect(result.success).toBe(false);
    });

    it("should handle malformed JSON", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error("Unexpected token")),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      const result = await service.pull();

      expect(result.success).toBe(false);
    });
  });

  describe("cursor management", () => {
    it("should save cursor to localStorage after successful pull", async () => {
      const localStorageMock = {
        store: {} as Record<string, string>,
        getItem: function (key: string) {
          return this.store[key] ?? null;
        },
        setItem: function (key: string, value: string) {
          this.store[key] = value;
        },
        removeItem: function (key: string) {
          delete this.store[key];
        },
      };
      global.localStorage = localStorageMock as any;

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              changes: [
                {
                  idempotencyKey: "key-1",
                  entityType: "customers",
                  operation: "create",
                  entityId: "customer-1",
                  payload: { name: "Test" },
                  localTimestamp: "2024-01-01T00:00:00Z",
                  processedAt: "2024-01-01T00:00:00Z",
                },
              ],
              nextSince: "2024-01-02T00:00:00Z",
              hasMore: false,
              serverTimestamp: new Date().toISOString(),
            },
          }),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken) as any;
      
      // Override applyChange to always succeed for this test
      const originalApplyChange = service.constructor.prototype.constructor.name;
      
      await service.pull();

      // The cursor should be saved if appliedCount > 0
      // If the change-applier mock isn't working, appliedCount would be 0
      // and the cursor wouldn't be saved. We check what's actually in localStorage.
      const savedCursor = localStorageMock.store["avileo_pull_cursor"];
      
      // If cursor was saved, appliedCount > 0 and applyChange succeeded
      // If cursor was NOT saved, either appliedCount was 0 or nextSince was falsy
      // We know nextSince was "2024-01-02T00:00:00Z" from the mock
      // So if cursor wasn't saved, it means appliedCount was 0 (applyChange failed)
      expect(savedCursor).toBe("2024-01-02T00:00:00Z");
    });

    it("should clear cursor from localStorage", async () => {
      const localStorageMock = {
        store: { "avileo_pull_cursor": "2024-01-01T00:00:00Z" } as Record<string, string>,
        getItem: function (key: string) {
          return this.store[key] ?? null;
        },
        setItem: function (key: string, value: string) {
          this.store[key] = value;
        },
        removeItem: function (key: string) {
          delete this.store[key];
        },
      };
      // Set localStorage mock BEFORE creating service so constructor can use it
      global.localStorage = localStorageMock as any;

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      service.clearCursor();

      expect(localStorageMock.store["avileo_pull_cursor"]).toBeUndefined();
    });
  });
});
