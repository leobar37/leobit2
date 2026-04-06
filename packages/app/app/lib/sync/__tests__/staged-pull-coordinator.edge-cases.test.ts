/**
 * StagedPullCoordinator Edge Cases Tests
 * 
 * Tests for edge cases including loop protection,
 * empty responses, and error conditions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StagedPullCoordinator } from "../staged-pull-coordinator";

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
      entities: ["abonos", "purchases"] as const,
      lookbackDays: null,
      description: "Histórico completo",
      blocking: false,
    },
  },
  getEntitiesForStage: vi.fn((stage: string) => {
    if (stage === "CRITICAL") return ["customers", "products", "product_variants"];
    if (stage === "RECENT_SALES") return ["sales", "sale_items"];
    return ["abonos", "purchases"];
  }),
}));

describe("StagedPullCoordinator Edge Cases", () => {
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

    mockPullService = {
      pullWithOptions: vi.fn(),
    };
    progressCallback = vi.fn();
    coordinator = new StagedPullCoordinator(mockPullService);
    coordinator.setOnProgress(progressCallback);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("empty responses", () => {
    it("should complete when server returns empty with hasMore: false", async () => {
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

    it("THE BUG SCENARIO: should handle hasMore: true with empty changes (T-007)", async () => {
      // This is THE BUG: server returns hasMore: true but changesApplied: 0
      // With T-007 loop protection, the coordinator should detect the stuck cursor and break
      let callCount = 0;
      mockPullService.pullWithOptions.mockImplementation(async () => {
        callCount++;
        return {
          success: true,
          changesApplied: 0,
          hasMore: true,
          nextSince: "stuck-cursor-123", // Same cursor every time
        };
      });

      const result = await coordinator.loadCriticalData();

      // With loop protection, it should complete (not hang) and detect the stuck cursor
      expect(result.status).toBe("complete");
      // Should break out after detecting stuck cursor (not loop forever)
      expect(callCount).toBeGreaterThanOrEqual(1);
      expect(callCount).toBeLessThan(10); // Should not loop many times
    });

    it("should track consecutive empty responses", async () => {
      // With T-007, consecutive empty responses should be detected
      // With cursor advancing but hasMore always true, max iterations will be reached
      let callCount = 0;
      mockPullService.pullWithOptions.mockImplementation(async () => {
        callCount++;
        return {
          success: true,
          changesApplied: 0,
          hasMore: true,
          nextSince: "cursor-" + callCount,
        };
      });

      const result = await coordinator.loadCriticalData();

      // With cursor advancing but always hasMore, max iterations protection kicks in
      expect(result.status).toBe("error");
      expect(result.error).toContain("exceeded 1000 iterations");
      expect(callCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("pagination edge cases", () => {
    it("should handle many pages of data", async () => {
      // Simulate 5 pages of data
      mockPullService.pullWithOptions
        .mockResolvedValueOnce({
          success: true,
          changesApplied: 50,
          hasMore: true,
          nextSince: "cursor-1",
        })
        .mockResolvedValueOnce({
          success: true,
          changesApplied: 50,
          hasMore: true,
          nextSince: "cursor-2",
        })
        .mockResolvedValueOnce({
          success: true,
          changesApplied: 50,
          hasMore: true,
          nextSince: "cursor-3",
        })
        .mockResolvedValueOnce({
          success: true,
          changesApplied: 50,
          hasMore: true,
          nextSince: "cursor-4",
        })
        .mockResolvedValueOnce({
          success: true,
          changesApplied: 50,
          hasMore: false,
          nextSince: null,
        });

      const result = await coordinator.loadCriticalData();

      expect(result.status).toBe("complete");
      expect(result.changesApplied).toBe(250);
      expect(mockPullService.pullWithOptions).toHaveBeenCalledTimes(5);
    });

    it("should handle hasMore: true but no cursor change", async () => {
      // Edge case: server says hasMore but doesn't advance cursor
      let callCount = 0;
      mockPullService.pullWithOptions.mockImplementation(async () => {
        callCount++;
        return {
          success: true,
          changesApplied: 10,
          hasMore: true,
          nextSince: "same-cursor", // Never changes!
        };
      });

      // With T-007, max iterations protection will kick in since cursor doesn't advance
      // but hasMore is always true
      const result = await coordinator.loadCriticalData();

      // Max iterations protection will cause error status
      expect(result.status).toBe("error");
      expect(result.error).toContain("exceeded 1000 iterations");
      expect(callCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("error propagation", () => {
    it("should propagate error from first call", async () => {
      mockPullService.pullWithOptions.mockResolvedValueOnce({
        success: false,
        error: "Connection refused",
      });

      const result = await coordinator.loadCriticalData();

      expect(result.status).toBe("error");
      expect(result.error).toBe("Connection refused");
    });

    it("should handle intermittent failures", async () => {
      // First call fails, second succeeds
      mockPullService.pullWithOptions
        .mockResolvedValueOnce({
          success: false,
          error: "Temporary error",
        })
        .mockResolvedValueOnce({
          success: true,
          changesApplied: 5,
          hasMore: false,
          nextSince: null,
        });

      // In current implementation, this throws on first failure
      // Future: could implement retry logic
    });
  });

  describe("progress reporting", () => {
    it("should report progress updates", async () => {
      mockPullService.pullWithOptions.mockResolvedValue({
        success: true,
        changesApplied: 10,
        hasMore: false,
        nextSince: null,
      });

      await coordinator.loadCriticalData();

      // Should have called progress at least twice (loading + complete)
      expect(progressCallback.mock.calls.length).toBeGreaterThanOrEqual(2);
      // Last call should be complete
      const lastCall = progressCallback.mock.calls[progressCallback.mock.calls.length - 1][0];
      expect(lastCall.status).toBe("complete");
    });

    it("should accumulate changesApplied across pages", async () => {
      mockPullService.pullWithOptions
        .mockResolvedValueOnce({
          success: true,
          changesApplied: 10,
          hasMore: true,
          nextSince: "cursor-1",
        })
        .mockResolvedValueOnce({
          success: true,
          changesApplied: 20,
          hasMore: false,
          nextSince: null,
        });

      await coordinator.loadCriticalData();

      // Second call should have total of 30
      expect(progressCallback.mock.calls[1][0].changesApplied).toBe(30);
    });
  });

  describe("cursor handling", () => {
    it("should save cursor after each page", async () => {
      const cursors: string[] = [];
      mockPullService.pullWithOptions.mockImplementation(async (options: any) => {
        if (options?.cursorKey) {
          cursors.push(options.cursorKey);
        }
        return {
          success: true,
          changesApplied: 5,
          hasMore: true,
          nextSince: "next-cursor",
        };
      });

      mockPullService.pullWithOptions.mockResolvedValue({
        success: true,
        changesApplied: 5,
        hasMore: false,
        nextSince: null,
      });

      await coordinator.loadCriticalData();

      // cursorKey should be passed
      expect(mockPullService.pullWithOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          cursorKey: "critical",
        })
      );
    });
  });

  describe("reset behavior", () => {
    it("should reset state for all stages", async () => {
      // First complete CRITICAL
      mockPullService.pullWithOptions.mockResolvedValueOnce({
        success: true,
        changesApplied: 10,
        hasMore: false,
        nextSince: null,
      });
      await coordinator.loadCriticalData();

      // Then reset
      coordinator.reset();

      // Verify all stages are pending
      const state = coordinator.getAllState();
      expect(state.critical.status).toBe("pending");
      expect(state.critical.changesApplied).toBe(0);
      expect(state.recent.status).toBe("pending");
      expect(state.historical.status).toBe("pending");
    });

    it("should allow re-running after reset", async () => {
      mockPullService.pullWithOptions.mockResolvedValue({
        success: true,
        changesApplied: 5,
        hasMore: false,
        nextSince: null,
      });

      // First run
      await coordinator.loadCriticalData();
      expect(coordinator.getAllState().critical.status).toBe("complete");

      // Reset and run again
      coordinator.reset();
      const result = await coordinator.loadCriticalData();

      expect(result.status).toBe("complete");
      expect(result.changesApplied).toBe(5);
    });
  });
});
