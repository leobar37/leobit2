/**
 * Tests for useInitialSync hook
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useInitialSync } from "../use-initial-sync";

// Mock react-router
let navigateMock: ReturnType<typeof vi.fn>;

vi.mock("react-router", () => ({
  useNavigate: () => {
    navigateMock ??= vi.fn();
    return navigateMock;
  },
}));

// Mock session-storage
const mockGetStoredAuthToken = vi.fn();
const mockGetStoredBusinessId = vi.fn();
const mockGetLocalDatabaseNamespace = vi.fn();
const mockGetPullCursorStorageKey = vi.fn();

vi.mock("~/lib/session-storage", () => ({
  getStoredAuthToken: () => mockGetStoredAuthToken(),
  getStoredBusinessId: () => mockGetStoredBusinessId(),
  getLocalDatabaseNamespace: () => mockGetLocalDatabaseNamespace(),
  getPullCursorStorageKey: (namespace: string) =>
    mockGetPullCursorStorageKey(namespace),
}));

// Mock database init
const mockInitPgliteDatabase = vi.fn();
const mockResetDatabase = vi.fn();

vi.mock("@avileo/drizzle-sync/client", async () => {
  const actual = await vi.importActual("@avileo/drizzle-sync/client");
  return {
    ...actual,
    initPgliteDatabase: () => mockInitPgliteDatabase(),
    resetDatabase: () => mockResetDatabase(),
  };
});

vi.mock("~/lib/sync/db-config", () => ({
  createAvileoDatabaseConfig: () => ({}),
  SCHEMA_HASH_KEY: "avileo_schema_hash",
}));

// Mock PullService
const mockPull = vi.fn();
const mockPullWithOptions = vi.fn();

vi.mock("~/lib/sync/pull-service", () => ({
  PullService: vi.fn().mockImplementation(() => ({
    pull: mockPull,
    pullWithOptions: mockPullWithOptions,
  })),
}));

// Mock StagedPullCoordinator
const mockExecuteStagedLoad = vi.fn();
const mockSetOnProgress = vi.fn();

vi.mock("~/lib/sync/staged-pull-coordinator", () => ({
  StagedPullCoordinator: vi.fn().mockImplementation(() => ({
    executeStagedLoad: mockExecuteStagedLoad,
    setOnProgress: mockSetOnProgress,
  })),
}));

describe("useInitialSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    localStorage.clear();

    // Default mocks
    mockGetStoredAuthToken.mockReturnValue("test-token");
    mockGetStoredBusinessId.mockReturnValue("test-business-id");
    mockGetLocalDatabaseNamespace.mockReturnValue("test-namespace");
    mockGetPullCursorStorageKey.mockReturnValue("avileo_pull_cursor:test-namespace");

    mockInitPgliteDatabase.mockResolvedValue({
      pg: {},
      db: {},
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("starts in initializing state", () => {
      const { result } = renderHook(() => useInitialSync());

      expect(result.current.progress.stage).toBe("initializing");
      expect(result.current.progress.message).toBe("Preparando sincronización...");
      expect(result.current.error).toBeNull();
      expect(result.current.isSchemaError).toBe(false);
      expect(result.current.isResetting).toBe(false);
    });

    it("has correct initial actions", () => {
      const { result } = renderHook(() => useInitialSync());

      expect(typeof result.current.actions.retry).toBe("function");
      expect(typeof result.current.actions.skip).toBe("function");
      expect(typeof result.current.actions.goToLogin).toBe("function");
      expect(typeof result.current.actions.resetAndSync).toBe("function");
    });
  });

  describe("authentication", () => {
    it("redirects to login when no auth token", async () => {
      mockGetStoredAuthToken.mockReturnValue(null);
      mockGetStoredBusinessId.mockReturnValue(null);

      renderHook(() => useInitialSync());

      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith("/login", { replace: true });
      });
    });

    it("redirects to login when no business id", async () => {
      mockGetStoredAuthToken.mockReturnValue("token");
      mockGetStoredBusinessId.mockReturnValue(null);

      renderHook(() => useInitialSync());

      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith("/login", { replace: true });
      });
    });
  });

  describe("quick sync (has cursor)", () => {
    beforeEach(() => {
      localStorage.setItem("avileo_pull_cursor:test-namespace", "some-cursor");
    });

    it("performs quick sync when cursor exists", async () => {
      mockPull.mockResolvedValue({
        success: true,
        changesApplied: 5,
        hasMore: false,
      });

      const { result } = renderHook(() => useInitialSync());

      await waitFor(() => {
        expect(mockInitPgliteDatabase).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockPull).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.progress.stage).toBe("completed");
      });

      expect(result.current.progress.changesApplied).toBe(5);
      expect(result.current.totalChanges).toBe(5);
    });

    it("navigates to dashboard after successful quick sync", async () => {
      mockPull.mockResolvedValue({
        success: true,
        changesApplied: 5,
        hasMore: false,
      });

      renderHook(() => useInitialSync());

      await waitFor(() => {
        expect(mockPull).toHaveBeenCalled();
      });

      // Fast-forward the 800ms delay
      act(() => {
        vi.advanceTimersByTime(800);
      });

      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith("/dashboard", { replace: true });
      });
    });

    it("handles non-fatal pull errors gracefully", async () => {
      mockPull.mockResolvedValue({
        success: false,
        error: "Network error",
        changesApplied: 0,
        hasMore: false,
      });

      const { result } = renderHook(() => useInitialSync());

      await waitFor(() => {
        expect(result.current.progress.stage).toBe("completed");
      });

      // Should still complete even with error
      expect(result.current.progress.message).toBe("Sincronización completada");
    });
  });

  describe("staged sync (first time)", () => {
    it("performs staged sync when no cursor exists", async () => {
      mockExecuteStagedLoad.mockResolvedValue({
        critical: {
          stage: "CRITICAL",
          status: "complete",
          changesApplied: 10,
        },
        recent: {
          stage: "RECENT_SALES",
          status: "complete",
          changesApplied: 5,
        },
        historical: Promise.resolve({
          stage: "HISTORICAL",
          status: "complete",
          changesApplied: 20,
        }),
      });

      const { result } = renderHook(() => useInitialSync());

      await waitFor(() => {
        expect(mockInitPgliteDatabase).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockExecuteStagedLoad).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.progress.stage).toBe("completed");
      });

      expect(result.current.totalChanges).toBe(15); // critical + recent only
    });

    it("throws error when critical stage fails", async () => {
      mockExecuteStagedLoad.mockResolvedValue({
        critical: {
          stage: "CRITICAL",
          status: "error",
          changesApplied: 0,
          error: "Failed to load critical data",
        },
        recent: {
          stage: "RECENT_SALES",
          status:          "pending",
          changesApplied: 0,
        },
        historical: Promise.resolve({
          stage: "HISTORICAL",
          status: "pending",
          changesApplied: 0,
        }),
      });

      const { result } = renderHook(() => useInitialSync());

      await waitFor(() => {
        expect(result.current.progress.stage).toBe("error");
      });

      expect(result.current.error).toBe("Error al cargar datos críticos");
    });

    it("throws error when recent sales stage fails", async () => {
      mockExecuteStagedLoad.mockResolvedValue({
        critical: {
          stage: "CRITICAL",
          status: "complete",
          changesApplied: 10,
        },
        recent: {
          stage: "RECENT_SALES",
          status: "error",
          changesApplied: 0,
          error: "Failed to load recent sales",
        },
        historical: Promise.resolve({
          stage: "HISTORICAL",
          status: "pending",
          changesApplied: 0,
        }),
      });

      const { result } = renderHook(() => useInitialSync());

      await waitFor(() => {
        expect(result.current.progress.stage).toBe("error");
      });

      expect(result.current.error).toBe("Error al cargar ventas recientes");
    });
  });

  describe("error handling", () => {
    it("detects schema errors", async () => {
      mockInitPgliteDatabase.mockRejectedValue(new Error("column does not exist: user_id"));

      const { result } = renderHook(() => useInitialSync());

      await waitFor(() => {
        expect(result.current.progress.stage).toBe("error");
      });

      expect(result.current.isSchemaError).toBe(true);
      expect(result.current.error).toContain("column does not exist");
    });

    it("detects relation errors as schema errors", async () => {
      mockInitPgliteDatabase.mockRejectedValue(
        new Error('relation "users" does not exist')
      );

      const { result } = renderHook(() => useInitialSync());

      await waitFor(() => {
        expect(result.current.progress.stage).toBe("error");
      });

      expect(result.current.isSchemaError).toBe(true);
    });

    it("does not mark non-schema errors as schema errors", async () => {
      mockInitPgliteDatabase.mockRejectedValue(new Error("Network timeout"));

      const { result } = renderHook(() => useInitialSync());

      await waitFor(() => {
        expect(result.current.progress.stage).toBe("error");
      });

      expect(result.current.isSchemaError).toBe(false);
      expect(result.current.error).toBe("Network timeout");
    });
  });

  describe("actions", () => {
    it("skip navigates to dashboard", () => {
      const { result } = renderHook(() => useInitialSync());

      act(() => {
        result.current.actions.skip();
      });

      expect(navigateMock).toHaveBeenCalledWith("/dashboard", { replace: true });
    });

    it("goToLogin navigates to login", () => {
      const { result } = renderHook(() => useInitialSync());

      act(() => {
        result.current.actions.goToLogin();
      });

      expect(navigateMock).toHaveBeenCalledWith("/login", { replace: true });
    });

    it("retry reloads the page", () => {
      const reloadMock = vi.fn();
      const originalLocation = window.location;
      // @ts-expect-error - mocking location
      window.location = { ...originalLocation, reload: reloadMock };

      const { result } = renderHook(() => useInitialSync());

      act(() => {
        result.current.actions.retry();
      });

      expect(reloadMock).toHaveBeenCalled();

      // Restore
      // @ts-expect-error - restoring location
      window.location = originalLocation;
    });

    it("resetAndSync clears localStorage and reloads", async () => {
      const reloadMock = vi.fn();
      const originalLocation = window.location;
      // @ts-expect-error - mocking location
      window.location = { ...originalLocation, reload: reloadMock };

      mockResetDatabase.mockResolvedValue(undefined);

      localStorage.setItem("avileo_schema_hash", "hash-123");
      localStorage.setItem("avileo_pull_cursor", "cursor-1");
      localStorage.setItem("avileo_pull_cursor:test", "cursor-2");
      localStorage.setItem("avileo_local_db_namespace", "namespace-1");

      const { result } = renderHook(() => useInitialSync());

      await act(async () => {
        await result.current.actions.resetAndSync();
      });

      expect(mockResetDatabase).toHaveBeenCalled();
      expect(localStorage.getItem("avileo_schema_hash")).toBeNull();
      expect(localStorage.getItem("avileo_pull_cursor")).toBeNull();
      expect(localStorage.getItem("avileo_local_db_namespace")).toBeNull();
      expect(reloadMock).toHaveBeenCalled();

      // Restore
      // @ts-expect-error - restoring location
      window.location = originalLocation;
    });

    it("handles reset errors gracefully", async () => {
      mockResetDatabase.mockRejectedValue(new Error("Reset failed"));

      const { result } = renderHook(() => useInitialSync());

      await act(async () => {
        await result.current.actions.resetAndSync();
      });

      expect(result.current.isResetting).toBe(false);
      expect(result.current.error).toBe(
        "No se pudo reiniciar la sincronización. Intenta nuevamente."
      );
      expect(result.current.progress.stage).toBe("error");
    });
  });

  describe("progress tracking", () => {
    it("updates progress during staged sync", async () => {
      let progressCallback: ((state: {
        stage: "CRITICAL" | "RECENT_SALES" | "HISTORICAL";
        status: "pending" | "loading" | "complete" | "error";
        changesApplied: number;
      }) => void) | null = null;

      mockSetOnProgress.mockImplementation((cb) => {
        progressCallback = cb;
      });

      mockExecuteStagedLoad.mockImplementation(async () => {
        // Simulate progress updates
        progressCallback?.({
          stage: "CRITICAL",
          status: "loading",
          changesApplied: 50,
        });

        return {
          critical: {
            stage: "CRITICAL",
            status: "complete",
            changesApplied: 100,
          },
          recent: {
            stage: "RECENT_SALES",
            status: "complete",
            changesApplied: 20,
          },
          historical: Promise.resolve({
            stage: "HISTORICAL",
            status: "complete",
            changesApplied: 200,
          }),
        };
      });

      const { result } = renderHook(() => useInitialSync());

      await waitFor(() => {
        expect(mockSetOnProgress).toHaveBeenCalled();
      });

      // Trigger progress update
      act(() => {
        progressCallback?.({
          stage: "CRITICAL",
          status: "loading",
          changesApplied: 50,
        });
      });

      expect(result.current.progress.stage).toBe("pulling");
      expect(result.current.progress.currentStage).toBe("CRITICAL");
    });
  });
});
