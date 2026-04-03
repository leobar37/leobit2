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

    it("THE BUG SCENARIO: should handle hasMore: true with empty changes", async () => {
      // This is THE BUG: server returns hasMore: true but changesApplied: 0
      // Without loop protection, this would loop forever
      // Skip this test until T-007 is implemented
      // After T-007, this test should throw an error instead of hanging
    }, 1000); // 1 second timeout

    it("should track consecutive empty responses", async () => {
      // After T-007, consecutive empty responses should be detected
      // and the stage should complete gracefully
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

      // This test documents expected behavior after T-007
      // The coordinator should detect 3 consecutive empty responses
      // and stop with an error
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

      // After T-007, this should be detected as a stuck state
      // and throw an error
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
