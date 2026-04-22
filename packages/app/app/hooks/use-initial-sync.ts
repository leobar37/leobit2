/**
 * Initial Sync Hook
 *
 * Orchestrates the initial synchronization flow after login.
 * Handles database initialization, staged pull, and error recovery.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { initPgliteDatabase, resetDatabase } from "@avileo/drizzle-sync/client";
import { SCHEMA_HASH_KEY, createAvileoDatabaseConfig } from "~/lib/sync/db-config";
import { PullService } from "~/lib/sync/pull-service";
import {
  StagedPullCoordinator,
  type StagedPullState,
  type StagedPullResult,
} from "~/lib/sync/staged-pull-coordinator";
import { SYNC_STAGES, type SyncStage } from "@avileo/shared";
import {
  getStoredAuthToken,
  getStoredBusinessId,
  setStoredBusinessId,
  setStoredBusinessUserId,
  clearStoredAuthState,
  clearStoredBusinessId,
  getLocalDatabaseNamespace,
  getPullCursorStorageKey,
} from "~/lib/session-storage";
import { api } from "~/lib/api-client";
import { isSchemaError } from "~/lib/sync/schema-error";

export type SyncStageStatus = "initializing" | "pulling" | "completed" | "error";

export interface SyncProgress {
  stage: SyncStageStatus;
  message: string;
  progress?: number;
  changesApplied?: number;
  currentStage?: string;
}

export interface UseInitialSyncReturn {
  /** Current sync progress state */
  progress: SyncProgress;
  /** Error message if sync failed */
  error: string | null;
  /** Whether the error is a schema error requiring reset */
  isSchemaError: boolean;
  /** Whether a reset operation is in progress */
  isResetting: boolean;
  /** Whether sync has been attempted */
  hasAttempted: boolean;
  /** Total changes applied across all stages */
  totalChanges: number;
  /** Actions available */
  actions: {
    /** Retry the sync operation */
    retry: () => void;
    /** Skip sync and go to dashboard */
    skip: () => void;
    /** Go to login page */
    goToLogin: () => void;
    /** Reset database and re-sync */
    resetAndSync: () => Promise<void>;
  };
}

/**
 * Attempt to hydrate businessId from API when missing in storage
 * This handles the case where user has valid token but businessId was lost/corrupted
 */
async function hydrateBusinessFromAPI(): Promise<string | null> {
  try {
    console.log("[useInitialSync] Attempting to hydrate businessId from API...");
    const { data, error } = await api.businesses.me.get();

    if (error || !data?.success || !data.data?.id) {
      console.warn("[useInitialSync] Failed to hydrate businessId from API:", error);
      return null;
    }

    // Store the retrieved businessId
    setStoredBusinessId(data.data.id);
    if (data.data.businessUserId) {
      setStoredBusinessUserId(data.data.businessUserId);
    }

    console.log("[useInitialSync] Successfully hydrated businessId:", data.data.id);
    return data.data.id;
  } catch (err) {
    console.error("[useInitialSync] Exception hydrating businessId:", err);
    return null;
  }
}

interface StageProgressConfig {
  min: number;
  max: number;
  label: string;
}

const STAGE_PROGRESS: Record<SyncStage, StageProgressConfig> = {
  CRITICAL: { min: 15, max: 50, label: SYNC_STAGES.CRITICAL.description },
  RECENT_SALES: { min: 50, max: 75, label: SYNC_STAGES.RECENT_SALES.description },
  HISTORICAL: { min: 75, max: 95, label: SYNC_STAGES.HISTORICAL.description },
};

/**
 * Hook for managing initial synchronization after login
 */
export function useInitialSync(): UseInitialSyncReturn {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<SyncProgress>({
    stage: "initializing",
    message: "Preparando sincronización...",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSchemaErrorState, setIsSchemaErrorState] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [totalChanges, setTotalChanges] = useState(0);
  const syncAttempted = useRef(false);

  /**
   * Calculate progress within a stage based on changes applied
   */
  const calculateStageProgress = (
    state: StagedPullState,
    range: StageProgressConfig
  ): number => {
    if (state.status === "complete") {
      return range.max;
    }
    if (state.status === "loading") {
      // Estimate progress within stage (assume max 1000 changes per stage)
      const estimatedProgress = Math.min(state.changesApplied / 1000, 0.9);
      return range.min + estimatedProgress * (range.max - range.min);
    }
    return range.min;
  };

  /**
   * Build progress message from stage state
   */
  const buildProgressMessage = (
    state: StagedPullState,
    accumulatedChanges: number
  ): string => {
    const stageLabel = STAGE_PROGRESS[state.stage].label;
    if (state.status === "complete") {
      return `${stageLabel} completado`;
    }
    return `${stageLabel}: ${accumulatedChanges} registros cargados`;
  };

  /**
   * Handle progress updates from the staged coordinator
   */
  const handleStagedProgress = useCallback(
    (
      state: StagedPullState,
      stageTotals: Map<SyncStage, number>,
      accumulatedTotal: number
    ): { newTotal: number; updatedTotals: Map<SyncStage, number> } => {
      const updatedTotals = new Map(stageTotals);

      if (state.status === "loading" || state.status === "complete") {
        // Only add changes when we receive new data (not on status change to complete)
        const previousTotal = stageTotals.get(state.stage) || 0;
        const newChanges = state.changesApplied - previousTotal;
        let newTotal = accumulatedTotal;

        if (newChanges > 0) {
          newTotal += newChanges;
        }

        updatedTotals.set(state.stage, state.changesApplied);

        const range = STAGE_PROGRESS[state.stage];
        const progressValue = calculateStageProgress(state, range);
        const stageStatus: "pulling" | "completed" | "error" =
          state.status === "complete" ? "completed" : "pulling";

        setProgress({
          stage: stageStatus,
          message: buildProgressMessage(state, newTotal),
          progress: Math.floor(progressValue),
          changesApplied: newTotal,
          currentStage: state.stage,
        });

        return { newTotal, updatedTotals };
      }

      return { newTotal: accumulatedTotal, updatedTotals };
    },
    []
  );

  /**
   * Perform a quick sync for returning users (has cursor)
   */
  const performQuickSync = useCallback(
    async (pullService: PullService): Promise<boolean> => {
      setProgress({
        stage: "pulling",
        message: "Sincronizando cambios recientes...",
        progress: 50,
      });

      const result = await pullService.pull();

      if (result.success) {
        setProgress({
          stage: "completed",
          message: `Sincronización completada (${result.changesApplied} cambios)`,
          progress: 100,
          changesApplied: result.changesApplied,
        });
        setTotalChanges(result.changesApplied);
        return true;
      }

      // Non-fatal error, we can still proceed
      console.warn("[useInitialSync] Pull had issues but continuing:", result.error);
      setProgress({
        stage: "completed",
        message: "Sincronización completada",
        progress: 100,
      });
      return true;
    },
    []
  );

  /**
   * Perform a staged sync for first-time users (no cursor)
   */
  const performStagedSync = useCallback(
    async (pullService: PullService): Promise<boolean> => {
      setProgress({
        stage: "pulling",
        message: "Preparando descarga de datos...",
        progress: 15,
      });

      const coordinator = new StagedPullCoordinator(pullService);
      const stageTotals = new Map<SyncStage, number>();
      let accumulatedTotal = 0;

      coordinator.setOnProgress((state: StagedPullState) => {
        const result = handleStagedProgress(state, stageTotals, accumulatedTotal);
        accumulatedTotal = result.newTotal;
        // Update the map for next iteration (note: this won't affect the local Map in the callback
        // but we rely on accumulatedTotal for the running total)
      });

      const { critical, recent, historical } = await coordinator.executeStagedLoad();

      // Check if critical stages completed successfully
      if (critical.status === "error") {
        throw new Error(critical.error || "Error al cargar datos críticos");
      }

      if (recent.status === "error") {
        throw new Error(recent.error || "Error al cargar ventas recientes");
      }

      // Calculate final totals
      const finalTotal = critical.changesApplied + recent.changesApplied;
      setTotalChanges(finalTotal);

      // App is usable now! Show completion
      setProgress({
        stage: "completed",
        message: `Datos listos (${finalTotal} registros)`,
        progress: 100,
        changesApplied: finalTotal,
      });

      // Historical data continues loading in background
      historical.then((histState) => {
        if (histState.status === "complete") {
          console.log(
            `[useInitialSync] Historical data loaded: ${histState.changesApplied} changes`
          );
          setTotalChanges((prev) => prev + histState.changesApplied);
        }
      });

      return true;
    },
    [handleStagedProgress]
  );

  /**
   * Main sync execution
   */
  const performSync = useCallback(async () => {
    // Prevent double execution in React StrictMode
    if (syncAttempted.current) return;
    syncAttempted.current = true;

    setProgress({
      stage: "initializing",
      message: "Verificando sesión...",
      progress: 5,
    });

    // Get auth data immediately (no polling per requirements)
    let token = getStoredAuthToken();
    let businessId = getStoredBusinessId();

    // Handle case: token exists but businessId is missing (inconsistent state)
    if (token && !businessId) {
      console.log("[useInitialSync] Token exists but businessId missing, attempting recovery...");
      const hydratedBusinessId = await hydrateBusinessFromAPI();

      if (hydratedBusinessId) {
        businessId = hydratedBusinessId;
        console.log("[useInitialSync] Recovery successful, continuing with sync");
      } else {
        // Recovery failed - clear auth state to force fresh login
        console.log("[useInitialSync] Recovery failed, clearing auth state and redirecting to login");
        clearStoredAuthState();
        clearStoredBusinessId();
        navigate("/login", { replace: true });
        return;
      }
    }

    // Handle case: no token at all (genuinely not logged in)
    if (!token) {
      console.log("[useInitialSync] No token, redirecting to login");
      navigate("/login", { replace: true });
      return;
    }

    try {
      // Step 1: Initialize database
      setProgress({
        stage: "initializing",
        message: "Inicializando base de datos local...",
        progress: 10,
      });

      const { pg, db } = await initPgliteDatabase(createAvileoDatabaseConfig());

      // Step 2: Check if we have a cursor (previous sync)
      const namespace = getLocalDatabaseNamespace();
      const cursorKey = getPullCursorStorageKey(namespace);
      const hasCursor = !!localStorage.getItem(cursorKey);

      // Type guard: businessId should never be null at this point, but TypeScript needs assurance
      if (!businessId) {
        console.error("[useInitialSync] Unexpected state: businessId is null after auth checks");
        navigate("/login", { replace: true });
        return;
      }

      const pullService = new PullService(pg, db, businessId, token);

      if (hasCursor) {
        // We have synced before, just do a quick pull and go
        await performQuickSync(pullService);
      } else {
        // First time sync - use staged loading for better UX
        await performStagedSync(pullService);
      }

      // Navigate to dashboard after short delay for user to see completion
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 800);
    } catch (err) {
      console.error("[useInitialSync] Sync failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Error de sincronización";
      setError(errorMessage);
      setIsSchemaErrorState(isSchemaError(err));
      setProgress({
        stage: "error",
        message: "Error al sincronizar",
      });
    }
  }, [navigate, performQuickSync, performStagedSync]);

  // Start sync on mount
  useEffect(() => {
    performSync();
  }, [performSync]);

  /**
   * Retry the sync operation
   */
  const retry = useCallback(() => {
    syncAttempted.current = false;
    setError(null);
    setIsSchemaErrorState(false);
    setProgress({
      stage: "initializing",
      message: "Preparando sincronización...",
    });
    // Reload page to restart sync
    window.location.reload();
  }, []);

  /**
   * Skip sync and go to dashboard
   */
  const skip = useCallback(() => {
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  /**
   * Go to login page
   */
  const goToLogin = useCallback(() => {
    navigate("/login", { replace: true });
  }, [navigate]);

  /**
   * Reset database and re-sync
   */
  const resetAndSync = useCallback(async () => {
    setIsResetting(true);
    setError(null);
    setProgress({
      stage: "initializing",
      message: "Reiniciando base de datos local...",
    });

    try {
      // Clear ALL sync-related localStorage to force complete reset
      localStorage.removeItem(SCHEMA_HASH_KEY);

      // Clear pull cursor keys (all namespaces)
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key === "avileo_pull_cursor" || key.startsWith("avileo_pull_cursor:"))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // Clear namespace so a fresh database name is used
      localStorage.removeItem("avileo_local_db_namespace");

      // Reset the database (closes PGlite and deletes IndexedDB)
      await resetDatabase();

      // Reload the page to restart sync from scratch
      window.location.reload();
    } catch (err) {
      console.error("[useInitialSync] Reset failed:", err);
      setError("No se pudo reiniciar la sincronización. Intenta nuevamente.");
      setIsResetting(false);
      setProgress({
        stage: "error",
        message: "Error al reiniciar",
      });
    }
  }, []);

  return {
    progress,
    error,
    isSchemaError: isSchemaErrorState,
    isResetting,
    hasAttempted: syncAttempted.current,
    totalChanges,
    actions: {
      retry,
      skip,
      goToLogin,
      resetAndSync,
    },
  };
}
