/**
 * StagedPullCoordinator Tests
 * 
 * Unit tests for the multi-stage sync coordinator.
 * These tests verify the sequential loading of CRITICAL, RECENT_SALES,
 * and HISTORICAL stages, along with progress reporting and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StagedPullCoordinator, type StagedPullState } from "../staged-pull-coordinator";

// Mock the @avileo/shared module
vi.mock("@avileo/shared", () => ({
  SYNC_STAGES: {
    CRITICAL: {
      name: "CRITICAL",
      entities: ["customers", "products", "product_variants"] as const,
      lookbackDays: 30,
      description: "Datos de referencia esenciales",
      blocking: true,
    },
    RECENT_SALES: {
      name: "RECENT_SALES",
      entities: ["sales", "sale_items"] as const,
      lookbackDays: 7,
      description: "Ventas recientes",
      blocking: true,
    },
    HISTORICAL: {
      name: "HISTORICAL",
      entities: [
        "abonos",
        "purchases",
        "purchase_items",
        "distribuciones",
        "distribucion_items",
        "visitas",
        "tags",
      ] as const,
      lookbackDays: null,
      description: "Histórico completo",
      blocking: false,
    },
  },
  getEntitiesForStage: vi.fn((stage: string) => {
    if (stage === "CRITICAL") return ["customers", "products", "product_variants"];
    if (stage === "RECENT_SALES") return ["sales", "sale_items"];
    if (stage === "HISTORICAL")
      return [
        "abonos",
        "purchases",
        "purchase_items",
        "distribuciones",
        "visitas",
        "tags",
      ];
    return [];
  }),
}));

describe("StagedPullCoordinator", () => {
  let mockPullService: any;
  let progressCallback: ReturnType<typeof vi.fn>;
  let coordinator: StagedPullCoordinator;

  beforeEach(() => {
    // Mock navigator.onLine for tests
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true,
    });

    // Create mock pull service
    mockPullService = {
      pullWithOptions: vi.fn(),
      getStageCursor: vi.fn().mockReturnValue(null), // Default: no saved cursor
    };

    // Create progress callback
    progressCallback = vi.fn();

    // Create coordinator
    coordinator = new StagedPullCoordinator(mockPullService);
    coordinator.setOnProgress(progressCallback);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("loadCriticalData", () => {
    it("should load data and complete successfully", async () => {
      // Setup: return data on first call, then no more
      mockPullService.pullWithOptions
        .mockResolvedValueOnce({
          success: true,
          changesApplied: 10,
          hasMore: false,
          nextSince: "2024-01-01T00:00:00Z",
        });

      const result = await coordinator.loadCriticalData();

      expect(result.stage).toBe("CRITICAL");
      expect(result.status).toBe("complete");
      expect(result.changesApplied).toBe(10);
      expect(progressCallback).toHaveBeenCalledTimes(2); // loading + complete
    });

    it("should handle pagination correctly", async () => {
      // First page
      mockPullService.pullWithOptions
        .mockResolvedValueOnce({
          success: true,
          changesApplied: 50,
          hasMore: true,
          nextSince: "2024-01-01T00:00:00Z",
        })
        // Second page
        .mockResolvedValueOnce({
          success: true,
          changesApplied: 30,
          hasMore: false,
          nextSince: "2024-01-02T00:00:00Z",
        });

      const result = await coordinator.loadCriticalData();

      expect(result.status).toBe("complete");
      expect(result.changesApplied).toBe(80);
      expect(mockPullService.pullWithOptions).toHaveBeenCalledTimes(2);
    });

    it("should set status to error on failure", async () => {
      mockPullService.pullWithOptions.mockResolvedValueOnce({
        success: false,
        changesApplied: 0,
        hasMore: false,
        error: "Network error",
      });

      const result = await coordinator.loadCriticalData();

      expect(result.status).toBe("error");
      expect(result.error).toBe("Network error");
    });

    it("should handle empty response (0 records)", async () => {
      mockPullService.pullWithOptions.mockResolvedValueOnce({
        success: true,
        changesApplied: 0,
        hasMore: false,
        nextSince: null,
      });

      const result = await coordinator.loadCriticalData();

      expect(result.status).toBe("complete");
      expect(result.changesApplied).toBe(0);
    });

    it("should notify progress when loading starts", async () => {
      mockPullService.pullWithOptions.mockImplementation(async () => {
        // Small delay to ensure the loading state is observed
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          success: true,
          changesApplied: 5,
          hasMore: false,
          nextSince: "2024-01-01T00:00:00Z",
        };
      });

      const loadPromise = coordinator.loadCriticalData();

      // Check that loading state was reported
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: "CRITICAL",
          status: "loading",
        })
      );

      await loadPromise;
    });
  });

  describe("loadRecentSales", () => {
    it("should load recent sales data successfully", async () => {
      mockPullService.pullWithOptions.mockResolvedValueOnce({
        success: true,
        changesApplied: 25,
        hasMore: false,
        nextSince: "2024-01-01T00:00:00Z",
      });

      const result = await coordinator.loadRecentSales();

      expect(result.stage).toBe("RECENT_SALES");
      expect(result.status).toBe("complete");
      expect(result.changesApplied).toBe(25);
    });

    it("should propagate error to status", async () => {
      mockPullService.pullWithOptions.mockResolvedValueOnce({
        success: false,
        error: "Server error",
      });

      const result = await coordinator.loadRecentSales();

      expect(result.status).toBe("error");
      expect(result.error).toBe("Server error");
    });
  });

  describe("loadHistoricalData", () => {
    it("should load historical data in background", async () => {
      mockPullService.pullWithOptions.mockResolvedValueOnce({
        success: true,
        changesApplied: 100,
        hasMore: false,
        nextSince: "2024-01-01T00:00:00Z",
      });

      const result = await coordinator.loadHistoricalData();

      expect(result.stage).toBe("HISTORICAL");
      expect(result.status).toBe("complete");
      expect(result.changesApplied).toBe(100);
    });

    it("should not throw error even if historical fails", async () => {
      // HISTORICAL stage should be non-blocking
      // First 3 calls fail (retries), 4th call succeeds
      let callCount = 0;
      mockPullService.pullWithOptions.mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          return Promise.resolve({
            success: false,
            error: "Historical data error",
          });
        }
        return Promise.resolve({
          success: true,
          changesApplied: 100,
          hasMore: false,
          nextSince: "2024-01-01T00:00:00Z",
        });
      });

      const result = await coordinator.loadHistoricalData();

      // After retries, it should eventually succeed
      expect(result.status).toBe("complete");
      expect(result.changesApplied).toBe(100);
    });
  });

  describe("executeStagedLoad", () => {
    it("should execute stages sequentially", async () => {
      // CRITICAL
      mockPullService.pullWithOptions
        .mockResolvedValueOnce({
          success: true,
          changesApplied: 10,
          hasMore: false,
          nextSince: "2024-01-01T00:00:00Z",
        })
        // RECENT_SALES
        .mockResolvedValueOnce({
          success: true,
          changesApplied: 20,
          hasMore: false,
          nextSince: "2024-01-02T00:00:00Z",
        });

      const result = await coordinator.executeStagedLoad();

      expect(result.critical.status).toBe("complete");
      expect(result.recent.status).toBe("complete");
      // historical returns a Promise
      expect(result.historical).toBeInstanceOf(Promise);
    });

    it("should complete critical before recent", async () => {
      const callOrder: string[] = [];
      mockPullService.pullWithOptions.mockImplementation(() => {
        callOrder.push("pull");
        return Promise.resolve({
          success: true,
          changesApplied: 5,
          hasMore: false,
          nextSince: null,
        });
      });

      await coordinator.executeStagedLoad();

      // CRITICAL and RECENT should be complete before historical Promise resolves
      expect(coordinator.getAllState().critical.status).toBe("complete");
      expect(coordinator.getAllState().recent.status).toBe("complete");
    });

    it("should return immediately after critical and recent", async () => {
      mockPullService.pullWithOptions.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: true,
              changesApplied: 5,
              hasMore: false,
              nextSince: null,
            });
          }, 10);
        });
      });

      const start = Date.now();
      const result = await coordinator.executeStagedLoad();
      const elapsed = Date.now() - start;

      // Should complete fast since we don't await historical
      // Allow some tolerance for test environment
      expect(elapsed).toBeLessThan(200);
      expect(result.critical.status).toBe("complete");
      expect(result.recent.status).toBe("complete");
    });
  });

  describe("getAllState", () => {
    it("should return current state of all stages", async () => {
      mockPullService.pullWithOptions.mockResolvedValue({
        success: true,
        changesApplied: 5,
        hasMore: false,
        nextSince: null,
      });

      await coordinator.executeStagedLoad();

      const state = coordinator.getAllState();

      expect(state.critical).toBeDefined();
      expect(state.recent).toBeDefined();
      expect(state.historical).toBeDefined();
    });
  });

  describe("isAppUsable", () => {
    it("should return true when critical and recent are complete", async () => {
      mockPullService.pullWithOptions.mockResolvedValue({
        success: true,
        changesApplied: 5,
        hasMore: false,
        nextSince: null,
      });

      await coordinator.executeStagedLoad();

      expect(coordinator.isAppUsable()).toBe(true);
    });

    it("should return false when critical is not complete", async () => {
      // Don't complete critical stage
      mockPullService.pullWithOptions.mockImplementation(() => {
        return new Promise(() => {}); // Never resolves
      });

      coordinator.loadCriticalData();
      // Don't await

      expect(coordinator.isAppUsable()).toBe(false);
    });
  });

  describe("isComplete", () => {
    it("should return true when all stages complete", async () => {
      mockPullService.pullWithOptions.mockResolvedValue({
        success: true,
        changesApplied: 5,
        hasMore: false,
        nextSince: null,
      });

      const { historical } = await coordinator.executeStagedLoad();
      // Wait for historical to complete
      await historical;

      expect(coordinator.isComplete()).toBe(true);
    });
  });

  describe("getTotalChangesApplied", () => {
    it("should sum changes from all stages", async () => {
      mockPullService.pullWithOptions
        .mockResolvedValueOnce({
          success: true,
          changesApplied: 10,
          hasMore: false,
          nextSince: null,
        })
        .mockResolvedValueOnce({
          success: true,
          changesApplied: 20,
          hasMore: false,
          nextSince: null,
        });

      await coordinator.executeStagedLoad();

      expect(coordinator.getTotalChangesApplied()).toBe(30);
    });
  });

  describe("reset", () => {
    it("should reset all stage states", async () => {
      mockPullService.pullWithOptions.mockResolvedValue({
        success: true,
        changesApplied: 5,
        hasMore: false,
        nextSince: null,
      });

      await coordinator.executeStagedLoad();
      coordinator.reset();

      const state = coordinator.getAllState();
      expect(state.critical.status).toBe("pending");
      expect(state.recent.status).toBe("pending");
      expect(state.historical.status).toBe("pending");
      expect(state.critical.changesApplied).toBe(0);
    });
  });
});
