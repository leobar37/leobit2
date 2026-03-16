import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { PullService, type PullStatus, type PullResult } from "./pull-service";

vi.mock("~/lib/session-storage", () => ({
  getLocalDatabaseNamespace: () => "scope-1",
  getPullCursorStorageKey: (namespace?: string | null) =>
    namespace ? `avileo_pull_cursor:${namespace}` : "avileo_pull_cursor",
}));

class LocalStorageMock {
  private store: Record<string, string> = {};
  getItem(key: string): string | null { return this.store[key] ?? null; }
  setItem(key: string, value: string): void { this.store[key] = value; }
  removeItem(key: string): void { delete this.store[key]; }
  clear(): void { this.store = {}; }
}

const localStorageMock = new LocalStorageMock();

// @ts-ignore - Override global localStorage for tests
global.localStorage = localStorageMock;

describe("PullService", () => {
  const mockPg = {} as any;
  const mockDb = {} as any;
  const businessId = "test-business-id";
  const authToken = "test-token";

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("loads cursor from localStorage if exists", () => {
      localStorageMock.setItem("avileo_pull_cursor:scope-1", "2024-01-01T00:00:00Z");

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      
      expect(service.getStatus().cursor).toBe("2024-01-01T00:00:00Z");
    });

    it("initializes with null cursor if not in localStorage", () => {
      const service = new PullService(mockPg, mockDb, businessId, authToken);
      
      expect(service.getStatus().cursor).toBeNull();
    });
  });

  describe("getStatus", () => {
    it("returns initial status", () => {
      const service = new PullService(mockPg, mockDb, businessId, authToken);
      const status = service.getStatus();

      expect(status.isPulling).toBe(false);
      expect(status.lastPullTime).toBeNull();
      expect(status.lastError).toBeNull();
      expect(status.consecutiveFailures).toBe(0);
    });

    it("has correct PullStatus shape", () => {
      const service = new PullService(mockPg, mockDb, businessId, authToken);
      const status: PullStatus = service.getStatus();

      expect(typeof status.isPulling).toBe("boolean");
      expect(status.lastPullTime instanceof Date || status.lastPullTime === null).toBe(true);
      expect(typeof status.lastError === "string" || status.lastError === null).toBe(true);
      expect(typeof status.consecutiveFailures).toBe("number");
      expect(typeof status.cursor === "string" || status.cursor === null).toBe(true);
    });
  });

  describe("getBackoffDelay", () => {
    it("returns 0 when no failures", async () => {
      const service = new PullService(mockPg, mockDb, businessId, authToken) as any;
      
      expect(service.getBackoffDelay()).toBe(0);
    });

    it("calculates exponential backoff", async () => {
      const service = new PullService(mockPg, mockDb, businessId, authToken) as any;
      service.consecutiveFailures = 3;
      
      const delay = service.getBackoffDelay();
      expect(delay).toBeGreaterThan(0);
      expect(delay).toBeLessThanOrEqual(30000);
    });

    it("caps backoff at max value", async () => {
      const service = new PullService(mockPg, mockDb, businessId, authToken) as any;
      service.consecutiveFailures = 100;
      
      const delay = service.getBackoffDelay();
      expect(delay).toBe(30000);
    });
  });

  describe("clearCursor", () => {
    it("clears cursor from localStorage and instance", () => {
      localStorageMock.setItem("avileo_pull_cursor:scope-1", "2024-01-01T00:00:00Z");
      const service = new PullService(mockPg, mockDb, businessId, authToken);

      service.clearCursor();

      expect(localStorageMock.getItem("avileo_pull_cursor:scope-1")).toBeNull();
      expect(service.getStatus().cursor).toBeNull();
    });
  });

  describe("setOnChangesApplied", () => {
    it("sets callback for changes notification", () => {
      const service = new PullService(mockPg, mockDb, businessId, authToken);
      const callback = vi.fn();
      
      service.setOnChangesApplied(callback);
      
      expect(() => service.setOnChangesApplied(callback)).not.toThrow();
    });
  });

  describe("pull", () => {
    it("prevents concurrent pulls", async () => {
      const service = new PullService(mockPg, mockDb, businessId, authToken) as any;
      service.isPullingFlag = true;

      const result = await service.pull();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Pull already in progress");
    });

    it("fetches changes from API with auth headers", async () => {
      const mockResponse = {
        success: true,
        data: {
          changes: [],
          nextSince: "2024-01-02T00:00:00Z",
          hasMore: false,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      await service.pull();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/sync/changes"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: `Bearer ${authToken}`,
            "x-business-id": businessId,
          }),
        })
      );
    });

    it("sends cursor as query param when exists", async () => {
      const mockResponse = {
        success: true,
        data: {
          changes: [],
          nextSince: null,
          hasMore: false,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      localStorageMock.setItem("avileo_pull_cursor:scope-1", "2024-01-01T00:00:00Z");
      const service = new PullService(mockPg, mockDb, businessId, authToken);

      await service.pull();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("since=2024-01-01"),
        expect.any(Object)
      );
    });

    it("does not send cursor when not exists", async () => {
      const mockResponse = {
        success: true,
        data: {
          changes: [],
          nextSince: null,
          hasMore: false,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);

      await service.pull();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/sync/changes?"),
        expect.any(Object)
      );
    });

    it("handles HTTP error with status code", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      const result = await service.pull();

      expect(result.success).toBe(false);
      expect(result.error).toContain("401");
    });

    it("handles HTTP 500 error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      const result = await service.pull();

      expect(result.success).toBe(false);
      expect(result.error).toContain("500");
    });

    it("handles empty changes successfully", async () => {
      const mockResponse = {
        success: true,
        data: {
          changes: [],
          nextSince: null,
          hasMore: false,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      const result = await service.pull();

      expect(result.success).toBe(true);
      expect(result.changesApplied).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it("handles invalid response format", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false }),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      const result = await service.pull();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid response format");
    });

    it("resets failure count on successful pull", async () => {
      const mockResponse = {
        success: true,
        data: {
          changes: [],
          nextSince: null,
          hasMore: false,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken) as any;
      service.consecutiveFailures = 5;
      
      await service.pull();

      expect(service.getStatus().consecutiveFailures).toBe(0);
    });

    it("increments failure count on HTTP error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Error"),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      await service.pull();

      expect(service.getStatus().consecutiveFailures).toBe(1);
    });

    it("sets lastError on failure", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve("Forbidden"),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      await service.pull();

      expect(service.getStatus().lastError).toBeTruthy();
    });

    it("has correct PullResult shape", async () => {
      const mockResponse = {
        success: true,
        data: {
          changes: [],
          nextSince: null,
          hasMore: false,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      const result: PullResult = await service.pull();

      expect(typeof result.success).toBe("boolean");
      expect(typeof result.changesApplied).toBe("number");
      expect(typeof result.hasMore).toBe("boolean");
    });
  });

  describe("pullAll", () => {
    it("pulls until hasMore is false", async () => {
      const mockResponse1 = {
        success: true,
        data: {
          changes: [{
            idempotencyKey: "key-1",
            entityType: "customers",
            operation: "insert",
            entityId: "entity-1",
            payload: { name: "Test" },
            localTimestamp: "2024-01-01T00:00:00Z",
            processedAt: "2024-01-01T00:00:00Z",
          }],
          nextSince: "2024-01-02T00:00:00Z",
          hasMore: true,
        },
      };
      const mockResponse2 = {
        success: true,
        data: {
          changes: [],
          nextSince: null,
          hasMore: false,
        },
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse1),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse2),
        });

      mockPg.query = vi.fn().mockResolvedValue({ rows: [] });
      mockPg.exec = vi.fn().mockResolvedValue(undefined);

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      const result = await service.pullAll();

      expect(result.totalApplied).toBe(1);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("stops on error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Error"),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      const result = await service.pullAll();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("returns errors array on failure", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Server Error"),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      const result = await service.pullAll();

      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe("startAutoPull / stopAutoPull", () => {
    it("starts periodic pull and does immediate pull", () => {
      vi.useRealTimers();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { changes: [], nextSince: null, hasMore: false },
        }),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      service.startAutoPull();

      expect(fetch).toHaveBeenCalled();
      
      service.stopAutoPull();
    });

    it("does nothing if already running", () => {
      const service = new PullService(mockPg, mockDb, businessId, authToken) as any;
      service.pullIntervalId = 123 as any;

      service.startAutoPull();

      expect(service.pullIntervalId).toBe(123);
    });

    it("clears interval when stopping", () => {
      const service = new PullService(mockPg, mockDb, businessId, authToken) as any;
      service.pullIntervalId = setInterval(() => {}, 10000) as any;

      service.stopAutoPull();

      expect(service.pullIntervalId).toBeNull();
    });
  });

  describe("forcePullNow", () => {
    it("delegates to pull method", async () => {
      const mockResponse = {
        success: true,
        data: {
          changes: [],
          nextSince: null,
          hasMore: false,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const service = new PullService(mockPg, mockDb, businessId, authToken);
      const result = await service.forcePullNow();

      expect(result.success).toBe(true);
    });
  });

  describe("getLastSince", () => {
    it("returns current cursor", () => {
      localStorageMock.setItem("avileo_pull_cursor:scope-1", "2024-01-01T00:00:00Z");
      const service = new PullService(mockPg, mockDb, businessId, authToken);

      expect(service.getLastSince()).toBe("2024-01-01T00:00:00Z");
    });

    it("returns null when no cursor", () => {
      const service = new PullService(mockPg, mockDb, businessId, authToken);

      expect(service.getLastSince()).toBeNull();
    });
  });
});
