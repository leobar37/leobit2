/**
 * Cursor Priority Fix Tests
 *
 * Tests verifying that the cursor priority fix works correctly:
 * - Saved stage cursor takes precedence over since parameter
 * - Fallback to since when no saved cursor
 * - Cursor persists before changes are applied
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PullService } from "../pull-service";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem(key: string) {
    return this.store[key] || null;
  },
  setItem(key: string, value: string) {
    this.store[key] = value;
  },
  removeItem(key: string) {
    delete this.store[key];
  },
};
Object.defineProperty(global, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

// Mock navigator.onLine
Object.defineProperty(global, "navigator", {
  value: { onLine: true },
  writable: true,
  configurable: true,
});

describe("PullService Cursor Priority Fix", () => {
  let pullService: PullService;
  const mockPg = {} as any;
  const mockDb = {} as any;
  const businessId = "test-business-id";
  const authToken = "test-auth-token";

  beforeEach(() => {
    mockLocalStorage.store = {}; // Clear storage
    mockFetch.mockClear();

    // Mock successful response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          changes: [],
          nextSince: "2026-04-06T12:00:00.000Z",
          hasMore: false,
          serverTimestamp: "2026-04-06T12:00:00.000Z",
        },
      }),
    });

    pullService = new PullService(mockPg, mockDb, businessId, authToken);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("cursor priority in pullWithOptions", () => {
    it("should use saved stage cursor over since parameter", async () => {
      // Setup: Save a cursor in localStorage
      mockLocalStorage.setItem(
        "avileo_pull_cursor_critical",
        "2026-04-06T10:30:00.000Z"
      );

      // Call pullWithOptions with a different since
      await pullService.pullWithOptions({
        entityTypes: ["customers"],
        since: "2026-03-01T00:00:00.000Z", // Should be ignored
        cursorKey: "critical",
      });

      // Verify fetch was called with the SAVED cursor, not the since
      const fetchUrl = decodeURIComponent(mockFetch.mock.calls[0][0]);
      expect(fetchUrl).toContain("since=2026-04-06T10:30:00.000Z");
      expect(fetchUrl).not.toContain("2026-03-01");
    });

    it("should fallback to since when no saved cursor", async () => {
      // No cursor in localStorage

      await pullService.pullWithOptions({
        entityTypes: ["customers"],
        since: "2026-03-01T00:00:00.000Z",
        cursorKey: "critical",
      });

      // Should use the provided since
      const fetchUrl = decodeURIComponent(mockFetch.mock.calls[0][0]);
      expect(fetchUrl).toContain("since=2026-03-01T00:00:00.000Z");
    });

    it("should use null cursor when neither saved nor since provided", async () => {
      await pullService.pullWithOptions({
        entityTypes: ["customers"],
        cursorKey: "critical",
      });

      // Should not include since parameter
      const fetchUrl = decodeURIComponent(mockFetch.mock.calls[0][0]);
      expect(fetchUrl).not.toContain("since=");
    });

    it("should save cursor to stage-specific key after successful pull", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            changes: [{ id: "1", entityType: "customers" }],
            nextSince: "2026-04-06T15:45:00.000Z",
            hasMore: false,
            serverTimestamp: "2026-04-06T15:45:00.000Z",
          },
        }),
      });

      await pullService.pullWithOptions({
        entityTypes: ["customers"],
        since: "2026-03-01T00:00:00.000Z",
        cursorKey: "critical",
      });

      // Verify cursor was saved
      expect(mockLocalStorage.getItem("avileo_pull_cursor_critical")).toBe(
        "2026-04-06T15:45:00.000Z"
      );
    });

    it("should get saved cursor via getStageCursor method", async () => {
      mockLocalStorage.setItem(
        "avileo_pull_cursor_recent",
        "2026-04-06T20:00:00.000Z"
      );

      const cursor = pullService.getStageCursor("recent");

      expect(cursor).toBe("2026-04-06T20:00:00.000Z");
    });

    it("should return null for non-existent stage cursor", async () => {
      const cursor = pullService.getStageCursor("nonexistent");

      expect(cursor).toBeNull();
    });
  });

  describe("cursor persistence order", () => {
    it("should persist cursor before next pagination call", async () => {
      // First call returns hasMore=true
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              changes: [{ id: "1", entityType: "customers" }],
              nextSince: "2026-04-06T14:00:00.000Z",
              hasMore: true,
              serverTimestamp: "2026-04-06T14:00:00.000Z",
            },
          }),
        })
        // Second call should use the new cursor
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              changes: [],
              nextSince: "2026-04-06T14:01:00.000Z",
              hasMore: false,
              serverTimestamp: "2026-04-06T14:01:00.000Z",
            },
          }),
        });

      // First pull
      await pullService.pullWithOptions({
        entityTypes: ["customers"],
        since: "2026-03-01T00:00:00.000Z",
        cursorKey: "critical",
      });

      // Verify cursor was saved after first pull
      expect(mockLocalStorage.getItem("avileo_pull_cursor_critical")).toBe(
        "2026-04-06T14:00:00.000Z"
      );

      // Second pull should use saved cursor automatically
      await pullService.pullWithOptions({
        entityTypes: ["customers"],
        since: "2026-03-01T00:00:00.000Z", // Should be ignored
        cursorKey: "critical",
      });

      // Verify second call used the saved cursor
      const secondCallUrl = decodeURIComponent(mockFetch.mock.calls[1][0]);
      expect(secondCallUrl).toContain("since=2026-04-06T14:00:00.000Z");
    });
  });

  describe("resume scenario simulation", () => {
    it("should resume from saved cursor after page reload simulation", async () => {
      // Simulate: first session saved a cursor
      mockLocalStorage.setItem(
        "avileo_pull_cursor_critical",
        "2026-04-06T16:30:00.000Z"
      );

      // Create new PullService instance (simulating page reload)
      const newPullService = new PullService(mockPg, mockDb, businessId, authToken);

      // Call should use saved cursor, not since
      await newPullService.pullWithOptions({
        entityTypes: ["customers"],
        since: "2026-03-01T00:00:00.000Z", // Initial since, should be ignored
        cursorKey: "critical",
      });

      const fetchUrl = decodeURIComponent(mockFetch.mock.calls[0][0]);
      expect(fetchUrl).toContain("since=2026-04-06T16:30:00.000Z");
      expect(fetchUrl).not.toContain("2026-03-01");
    });
  });
});
