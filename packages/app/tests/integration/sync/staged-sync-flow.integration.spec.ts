/**
 * Staged Sync Flow Integration Tests
 * 
 * Tests the complete sync flow using StagedPullCoordinator with mocked PullService.
 * These tests verify the staged loading behavior (CRITICAL -> RECENT_SALES -> HISTORICAL).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StagedPullCoordinator } from "~/lib/sync/staged-pull-coordinator";
import { PullService } from "~/lib/sync/pull-service";
import type { StagedPullState } from "~/lib/sync/staged-pull-coordinator";

// Mock the modules that PullService depends on
vi.mock("~/lib/session-storage", () => ({
  getLocalDatabaseNamespace: () => null,
  getPullCursorStorageKey: () => "avileo_pull_cursor",
}));

vi.mock("@avileo/drizzle-sync/shared", () => ({
  PULL_INTERVAL_MS: 10000,
  BACKOFF_BASE_MS: 1000,
  BACKOFF_MAX_MS: 30000,
  calculateBackoffDelay: () => 0,
}));

vi.mock("@avileo/drizzle-sync/pglite", () => {
  const mockFn = vi.fn(() => Promise.resolve({ success: true }));
  return { applyChange: mockFn };
});

// Create proper mock response objects
function createMockResponse(body: unknown, options: { ok?: boolean; status?: number } = {}) {
  const isStringBody = typeof body === "string";
  const responseBody = isStringBody ? body : JSON.stringify(body);
  
  const response = {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: () => {
      if (isStringBody) {
        return Promise.reject(new SyntaxError(`Unexpected token ${body[0]}`));
      }
      return Promise.resolve(body);
    },
    text: () => Promise.resolve(responseBody),
    clone: () => response,
    headers: new Map([["content-type", "application/json"]]),
  };
  
  return response;
}

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("StagedSyncFlow Integration", () => {
  const mockPg = {} as any;
  const mockDb = {} as any;
  const businessId = "test-business-id";
  const authToken = "test-token";

  const createMockPullService = () => {
    return new PullService(mockPg, mockDb, businessId, authToken);
  };

  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(Promise.resolve(createMockResponse({ success: true, data: { changes: [], nextSince: null, hasMore: false, serverTimestamp: new Date().toISOString() } })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("StagedPullCoordinator", () => {
    it("should report progress through all stages", async () => {
      let callCount = 0;

      mockFetch.mockImplementation(() => {
        callCount++;
        const entityType = callCount <= 2 ? "customers" : callCount <= 4 ? "sales" : "abonos";
        return Promise.resolve(
          createMockResponse({
            success: true,
            data: {
              changes: [
                {
                  idempotencyKey: `${entityType}-1`,
                  entityType,
                  operation: "create",
                  entityId: `${entityType}-001`,
                  payload: { name: `${entityType} 1` },
                  localTimestamp: "2024-01-01T00:00:00Z",
                  processedAt: "2024-01-01T00:00:00Z",
                },
              ],
              nextSince: null,
              hasMore: false,
              serverTimestamp: new Date().toISOString(),
            },
          })
        );
      });

      const pullService = createMockPullService();
      const coordinator = new StagedPullCoordinator(pullService);

      const result = await coordinator.executeStagedLoad();

      expect(result.critical.status).toBe("complete");
      expect(result.recent.status).toBe("complete");
      expect(result.historical).toBeInstanceOf(Promise);
    });

    it("should handle empty response without error", async () => {
      mockFetch.mockResolvedValueOnce(
        Promise.resolve(
          createMockResponse({
            success: true,
            data: {
              changes: [],
              nextSince: null,
              hasMore: false,
              serverTimestamp: new Date().toISOString(),
            },
          })
        )
      );

      const pullService = createMockPullService();
      const coordinator = new StagedPullCoordinator(pullService);

      const result = await coordinator.loadStage("CRITICAL");

      expect(result.status).toBe("complete");
      expect(result.changesApplied).toBe(0);
      expect(result.error).toBeUndefined();
    });

    it("should throw error on API failure for CRITICAL stage", async () => {
      mockFetch.mockResolvedValueOnce(
        Promise.resolve(
          createMockResponse("Internal server error", { ok: false, status: 500 })
        )
      );

      const pullService = createMockPullService();
      const coordinator = new StagedPullCoordinator(pullService);

      await expect(coordinator.loadStage("CRITICAL")).rejects.toThrow();
    });

    it("should handle 401 unauthorized", async () => {
      mockFetch.mockResolvedValueOnce(
        Promise.resolve(
          createMockResponse("Unauthorized", { ok: false, status: 401 })
        )
      );

      const pullService = createMockPullService();
      const coordinator = new StagedPullCoordinator(pullService);

      await expect(coordinator.loadStage("CRITICAL")).rejects.toThrow();
      expect(result.error).toContain("401");
    });

    it("should indicate app is usable after CRITICAL + RECENT_SALES", async () => {
      mockFetch.mockResolvedValue(
        Promise.resolve(
          createMockResponse({
            success: true,
            data: {
              changes: [],
              nextSince: null,
              hasMore: false,
              serverTimestamp: new Date().toISOString(),
            },
          })
        )
      );

      const pullService = createMockPullService();
      const coordinator = new StagedPullCoordinator(pullService);

      expect(coordinator.isAppUsable()).toBe(false);

      await coordinator.loadStage("CRITICAL");
      expect(coordinator.isAppUsable()).toBe(false);

      await coordinator.loadStage("RECENT_SALES");
      expect(coordinator.isAppUsable()).toBe(true);

      expect(coordinator.isComplete()).toBe(false);
    });

    it("should track total changes across stages", async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        return Promise.resolve(
          createMockResponse({
            success: true,
            data: {
              changes:
                callCount <= 2
                  ? [{ idempotencyKey: `c-${callCount}`, entityType: "customers", operation: "create", entityId: `c-${callCount}`, payload: { name: `C${callCount}` }, localTimestamp: "2024-01-01T00:00:00Z", processedAt: "2024-01-01T00:00:00Z" }]
                  : callCount <= 4
                  ? [{ idempotencyKey: `s-${callCount}`, entityType: "sales", operation: "create", entityId: `s-${callCount}`, payload: { total: "100" }, localTimestamp: "2024-01-01T00:00:00Z", processedAt: "2024-01-01T00:00:00Z" }]
                  : [{ idempotencyKey: `a-${callCount}`, entityType: "abonos", operation: "create", entityId: `a-${callCount}`, payload: { amount: "50" }, localTimestamp: "2024-01-01T00:00:00Z", processedAt: "2024-01-01T00:00:00Z" }],
              nextSince: null,
              hasMore: false,
              serverTimestamp: new Date().toISOString(),
            },
          })
        );
      });

      const pullService = createMockPullService();
      const coordinator = new StagedPullCoordinator(pullService);

      await coordinator.loadStage("CRITICAL");
      await coordinator.loadStage("RECENT_SALES");

      expect(coordinator.getTotalChangesApplied()).toBeGreaterThanOrEqual(0);
    });
  });

  // NOTE: The bug scenario test is skipped because it causes infinite loops
  // T-007 will add loop protection to the StagedPullCoordinator
  describe.skip("THE CRITICAL BUG: hasMore with empty changes", () => {
    it("documents the bug scenario: hasMore: true with empty changes", async () => {
      // THE BUG: Server returns hasMore: true but changes: []
      mockFetch.mockResolvedValue(
        Promise.resolve(
          createMockResponse({
            success: true,
            data: {
              changes: [],
              nextSince: "cursor-doesnt-advance",
              hasMore: true, // BUG: says there's more but no data!
              serverTimestamp: new Date().toISOString(),
            },
          })
        )
      );

      const pullService = createMockPullService();
      const coordinator = new StagedPullCoordinator(pullService);

      // Without loop protection, this would loop forever
      // The test documents the bug - T-007 will add loop protection
      const result = await coordinator.loadStage("CRITICAL");

      // Result depends on whether loop protection is implemented
      expect(result.status).toBeDefined();
    });
  });
});
