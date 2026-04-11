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
      behavior: {
        maxIterations: 1000,
        retryAttempts: 3,
        retryDelayMs: 10,
        onError: "throw",
      },
    },
    RECENT_SALES: {
      name: "RECENT_SALES",
      entities: ["sales", "sale_items"] as const,
      lookbackDays: 7,
      description: "Ventas recientes",
      blocking: true,
      behavior: {
        maxIterations: 1000,
        retryAttempts: 3,
        retryDelayMs: 10,
        onError: "throw",
      },
    },
    HISTORICAL: {
      name: "HISTORICAL",
      entities: ["abonos", "purchases"] as const,
      lookbackDays: null,
      description: "Histórico completo",
      blocking: false,
      behavior: {
        maxIterations: 1000,
        retryAttempts: 3,
        retryDelayMs: 10,
        onError: "continue",
        batchDelayMs: 10,
      },
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
      getStageCursor: vi.fn().mockReturnValue(null),
    };
    progressCallback = vi.fn();
    coordinator = new StagedPullCoordinator(mockPullService);
    coordinator.setOnProgress(progressCallback);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("loadStage - empty responses", () => {
    it("should complete when server returns empty with hasMore: false", async () => {
      mockPullService.pullWithOptions.mockResolvedValueOnce({
        success: true,
        changesApplied: 0,
        hasMore: false,
        nextSince: null,
      });

      const result = await coordinator.loadStage("CRITICAL");

      expect(result.status).toBe("complete");
      expect(result.changesApplied).toBe(0);
    });

    it("THE BUG SCENARIO: should handle hasMore: true with empty changes (T-007)", async () => {
      let callCount = 0;
      mockPullService.pullWithOptions.mockImplementation(async () => {
        callCount++;
        return {
          success: true,
          changesApplied: 0,
          hasMore: true,
          nextSince: "stuck-cursor-123",
        };
      });

      const result = await coordinator.loadStage("CRITICAL");

      expect(result.status).toBe("complete");
      expect(callCount).toBeGreaterThanOrEqual(1);
      expect(callCount).toBeLessThan(10);
    });

    it("should track consecutive empty responses with maxIterations protection", async () => {
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

      await expect(coordinator.loadStage("CRITICAL")).rejects.toThrow("exceeded 1000 iterations");
      expect(callCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("loadStage - pagination edge cases", () => {
    it("should handle many pages of data", async () => {
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

      const result = await coordinator.loadStage("RECENT_SALES");

      expect(result.status).toBe("complete");
      expect(result.changesApplied).toBe(250);
      expect(mockPullService.pullWithOptions).toHaveBeenCalledTimes(5);
    });

    it("should handle hasMore: true but no cursor change", async () => {
      mockPullService.pullWithOptions.mockImplementation(async () => ({
        success: true,
        changesApplied: 10,
        hasMore: true,
        nextSince: "same-cursor",
      }));

      await expect(coordinator.loadStage("CRITICAL")).rejects.toThrow("exceeded 1000 iterations");
    });
  });

  describe("loadStage - retry logic", () => {
    it("should retry on transient failures up to maxAttempts", async () => {
      let callCount = 0;
      mockPullService.pullWithOptions.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve({
            success: false,
            error: "Temporary error",
          });
        }
        return Promise.resolve({
          success: true,
          changesApplied: 10,
          hasMore: false,
          nextSince: null,
        });
      });

      const result = await coordinator.loadStage("CRITICAL");

      expect(result.status).toBe("complete");
      expect(callCount).toBe(3);
    });

    it("should throw after exhausting all retry attempts", async () => {
      mockPullService.pullWithOptions.mockResolvedValue({
        success: false,
        error: "Persistent error",
      });

      await expect(coordinator.loadStage("CRITICAL")).rejects.toThrow("Persistent error");
    });
  });

  describe("loadStage - error propagation", () => {
    it("should throw for CRITICAL stage after exhausting retries", async () => {
      mockPullService.pullWithOptions.mockResolvedValue({
        success: false,
        error: "Connection refused",
      });

      await expect(coordinator.loadStage("CRITICAL")).rejects.toThrow("Connection refused");
    });

    it("should return error state for HISTORICAL with onError: 'continue'", async () => {
      mockPullService.pullWithOptions.mockResolvedValue({
        success: false,
        error: "Background error",
      });

      const result = await coordinator.loadStage("HISTORICAL");

      expect(result.status).toBe("error");
      expect(result.error).toBe("Background error");
    });
  });

  describe("loadStage - progress reporting", () => {
    it("should report progress updates", async () => {
      mockPullService.pullWithOptions.mockResolvedValue({
        success: true,
        changesApplied: 10,
        hasMore: false,
        nextSince: null,
      });

      await coordinator.loadStage("RECENT_SALES");

      expect(progressCallback.mock.calls.length).toBeGreaterThanOrEqual(2);
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

      await coordinator.loadStage("CRITICAL");

      const progressCalls = progressCallback.mock.calls;
      const lastProgress = progressCalls[progressCalls.length - 1][0];
      expect(lastProgress.changesApplied).toBe(30);
    });
  });

  describe("loadStage - cursor handling", () => {
    it("should pass correct cursorKey for each stage", async () => {
      mockPullService.pullWithOptions.mockResolvedValue({
        success: true,
        changesApplied: 5,
        hasMore: false,
        nextSince: null,
      });

      await coordinator.loadStage("CRITICAL");
      expect(mockPullService.pullWithOptions).toHaveBeenCalledWith(
        expect.objectContaining({ cursorKey: "critical" })
      );
    });
  });

  describe("reset behavior", () => {
    it("should reset state for all stages", async () => {
      mockPullService.pullWithOptions.mockResolvedValueOnce({
        success: true,
        changesApplied: 10,
        hasMore: false,
        nextSince: null,
      });
      await coordinator.loadStage("CRITICAL");

      coordinator.reset();

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

      await coordinator.loadStage("CRITICAL");
      expect(coordinator.getAllState().critical.status).toBe("complete");

      coordinator.reset();
      const result = await coordinator.loadStage("CRITICAL");

      expect(result.status).toBe("complete");
      expect(result.changesApplied).toBe(5);
    });
  });
});
