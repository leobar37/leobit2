import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2, CloudDownload, Database, CheckCircle2, AlertTriangle } from "lucide-react";
import { initDatabase, resetDatabase, SCHEMA_HASH_KEY } from "~/engine/db";
import { PullService } from "~/lib/sync/pull-service";
import { StagedPullCoordinator, type StagedPullState } from "~/lib/sync/staged-pull-coordinator";
import { SYNC_STAGES, type SyncStage } from "@avileo/shared";
import { getStoredAuthToken, getStoredBusinessId, getLocalDatabaseNamespace, getPullCursorStorageKey } from "~/lib/session-storage";
import { Button } from "@/components/ui/button";
import { DebugWidget } from "~/devtools";

/**
 * Check if an error is related to database schema issues
 */
function isSchemaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();
  return (
    (lowerMessage.includes("column") &&
      (lowerMessage.includes("does not exist") || lowerMessage.includes("no existe"))) ||
    (lowerMessage.includes("relation") && lowerMessage.includes("does not exist")) ||
    lowerMessage.includes("schema") ||
    lowerMessage.includes("syntax error")
  );
}

interface SyncProgress {
  stage: "initializing" | "pulling" | "completed" | "error";
  message: string;
  progress?: number;
  changesApplied?: number;
  currentStage?: string;
}

export default function SyncPage() {
  const navigate = useNavigate();
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    stage: "initializing",
    message: "Preparando sincronización...",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSchemaErrorState, setIsSchemaErrorState] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const syncAttempted = useRef(false);

  const waitForAuth = async (maxRetries = 30, delayMs = 300): Promise<{ token: string; businessId: string } | null> => {
    for (let i = 0; i < maxRetries; i++) {
      const token = getStoredAuthToken();
      const businessId = getStoredBusinessId();
      if (token && businessId) {
        return { token, businessId };
      }
      // Log progress every 10 retries to help debugging
      if (i > 0 && i % 10 === 0) {
        console.log(`[SyncPage] Waiting for auth... attempt ${i}/${maxRetries} (token: ${token ? 'yes' : 'no'}, businessId: ${businessId ? 'yes' : 'no'})`);
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return null;
  };

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (syncAttempted.current) return;
    syncAttempted.current = true;

    async function performInitialSync() {
      setSyncProgress({
        stage: "initializing",
        message: "Verificando sesión...",
        progress: 5,
      });

      const authData = await waitForAuth();

      if (!authData) {
        setError("No hay sesión activa. Por favor, inicia sesión nuevamente.");
        return;
      }

      const { token, businessId } = authData;

      try {
        // Step 1: Initialize database
        setSyncProgress({
          stage: "initializing",
          message: "Inicializando base de datos local...",
          progress: 10,
        });

        const { pg, db } = await initDatabase();

        // Step 2: Check if we have a cursor (previous sync)
        const namespace = getLocalDatabaseNamespace();
        const cursorKey = getPullCursorStorageKey(namespace);
        const hasCursor = !!localStorage.getItem(cursorKey);

        const pullService = new PullService(pg, db, businessId, token);

        if (hasCursor) {
          // We have synced before, just do a quick pull and go
          setSyncProgress({
            stage: "pulling",
            message: "Sincronizando cambios recientes...",
            progress: 50,
          });

          const result = await pullService.pull();

          if (result.success) {
            setSyncProgress({
              stage: "completed",
              message: `Sincronización completada (${result.changesApplied} cambios)`,
              progress: 100,
              changesApplied: result.changesApplied,
            });
          } else {
            // Non-fatal error, we can still proceed
            console.warn("[SyncPage] Pull had issues but continuing:", result.error);
            setSyncProgress({
              stage: "completed",
              message: "Sincronización completada",
              progress: 100,
            });
          }
        } else {
          // First time sync - use staged loading for better UX
          setSyncProgress({
            stage: "pulling",
            message: "Preparando descarga de datos...",
            progress: 15,
          });

          const coordinator = new StagedPullCoordinator(pullService);
          
          // Track total changes across all stages for accurate reporting
          let totalChanges = 0;
          const stageTotals = new Map<SyncStage, number>();
          
          coordinator.setOnProgress((state: StagedPullState) => {
            // Accumulate total changes across all stages
            if (state.status === "loading" || state.status === "complete") {
              // Only add changes when we receive new data (not on status change to complete)
              // This prevents double-counting when stage completes
              const currentTotal = totalChanges;
              const newChanges = state.changesApplied - (stageTotals.get(state.stage) || 0);
              if (newChanges > 0) {
                totalChanges += newChanges;
              }
              // Update stage tracking
              stageTotals.set(state.stage, state.changesApplied);
            }
            
            // Calculate progress based on stage
            const stageProgress = {
              CRITICAL: { min: 15, max: 50, label: SYNC_STAGES.CRITICAL.description },
              RECENT_SALES: { min: 50, max: 75, label: SYNC_STAGES.RECENT_SALES.description },
              HISTORICAL: { min: 75, max: 95, label: SYNC_STAGES.HISTORICAL.description },
            };
            
            const range = stageProgress[state.stage];
            let progress: number;
            
            if (state.status === "complete") {
              progress = range.max;
            } else if (state.status === "loading") {
              // Estimate progress within stage (assume max 1000 changes per stage)
              const estimatedProgress = Math.min(state.changesApplied / 1000, 0.9);
              progress = range.min + (estimatedProgress * (range.max - range.min));
            } else {
              progress = range.min;
            }
            
            // Show descriptive message with current total
            const stageName = range.label;
            const progressText = state.status === "complete" 
              ? `${stageName} completado` 
              : `${stageName}: ${totalChanges} registros cargados`;
            
            setSyncProgress({
              stage: state.status === "error" ? "error" : "pulling",
              message: progressText,
              progress: Math.floor(progress),
              changesApplied: totalChanges,
              currentStage: state.stage,
            });
          });

          // Execute staged load
          const { critical, recent, historical } = await coordinator.executeStagedLoad();
          
          // Check if critical stages completed successfully
          if (critical.status === "error") {
            throw new Error(critical.error || "Error al cargar datos críticos");
          }
          
          if (recent.status === "error") {
            throw new Error(recent.error || "Error al cargar ventas recientes");
          }

          // App is usable now! Show completion
          setSyncProgress({
            stage: "completed",
            message: `Datos listos (${totalChanges} registros)`,
            progress: 100,
            changesApplied: totalChanges,
          });
          
          // Historical data continues loading in background
          // We don't await it - app is usable immediately
          historical.then((histState) => {
            if (histState.status === "complete") {
              console.log(`[SyncPage] Historical data loaded: ${histState.changesApplied} changes`);
            }
          });
        }

        // Navigate to dashboard
        setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 800);

      } catch (err) {
        console.error("[SyncPage] Sync failed:", err);
        const errorMessage = err instanceof Error ? err.message : "Error de sincronización";
        setError(errorMessage);
        setIsSchemaErrorState(isSchemaError(err));
        setSyncProgress({
          stage: "error",
          message: "Error al sincronizar",
        });
      }
    }

    // Start sync immediately - we have token and businessId from localStorage
    performInitialSync();
  }, [navigate]);

  const handleRetry = () => {
    syncAttempted.current = false;
    setError(null);
    setSyncProgress({
      stage: "initializing",
      message: "Preparando sincronización...",
    });
    // Trigger useEffect again
    window.location.reload();
  };

  const handleSkip = () => {
    navigate("/dashboard", { replace: true });
  };

  const handleGoToLogin = () => {
    navigate("/login", { replace: true });
  };

  const handleResetAndSync = async () => {
    setIsResetting(true);
    setError(null);
    setSyncProgress({
      stage: "initializing",
      message: "Reiniciando base de datos local...",
    });

    try {
      // Clear ALL sync-related localStorage to force complete reset
      // This is critical when switching browsers - the old IndexedDB may have stale schema
      localStorage.removeItem(SCHEMA_HASH_KEY);

      // Clear pull cursor keys (all namespaces)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key === "avileo_pull_cursor" || key.startsWith("avileo_pull_cursor:"))) {
          localStorage.removeItem(key);
          i--; // Adjust index after removal
        }
      }

      // Clear namespace so a fresh database name is used
      // This prevents stale IndexedDB from old browser being reused
      localStorage.removeItem("avileo_local_db_namespace");

      // Reset the database (closes PGlite and deletes IndexedDB)
      await resetDatabase();

      // Reload the page to restart sync from scratch
      window.location.reload();
    } catch (err) {
      console.error("[SyncPage] Reset failed:", err);
      setError("No se pudo reiniciar la sincronización. Intenta nuevamente.");
      setIsResetting(false);
      setSyncProgress({
        stage: "error",
        message: "Error al reiniciar",
      });
    }
  };

  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center bg-gradient-to-b from-orange-50/50 to-white px-4 py-6">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-500 shadow-[0_8px_30px_rgba(249,115,22,0.3)]">
          {syncProgress.stage === "completed" ? (
            <CheckCircle2 className="h-10 w-10 text-white" />
          ) : (
            <CloudDownload className="h-10 w-10 text-white" />
          )}
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {syncProgress.stage === "completed"
              ? "¡Listo!"
              : syncProgress.stage === "error"
              ? "Error de sincronización"
              : "Sincronizando datos"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {syncProgress.stage === "completed"
              ? "Tus datos están actualizados"
              : syncProgress.stage === "error"
              ? "No se pudieron sincronizar los datos"
              : syncProgress.currentStage 
                ? "Descargando información..."
                : "Estamos descargando tu información del servidor"}
          </p>
        </div>

        {/* Progress */}
        {!error && (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-orange-500 transition-all duration-500 ease-out"
                style={{ width: `${syncProgress.progress ?? 0}%` }}
              />
            </div>

            {/* Status */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2
                className={`h-4 w-4 ${
                  syncProgress.stage === "completed" ? "hidden" : "animate-spin"
                }`}
              />
              <span>{syncProgress.message}</span>
            </div>

            {/* Stats */}
            {syncProgress.changesApplied !== undefined &&
              syncProgress.changesApplied > 0 && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70">
                  <Database className="h-3 w-3" />
                  <span>{syncProgress.changesApplied} registros sincronizados</span>
                </div>
              )}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="space-y-4">
            {isSchemaErrorState && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Problema detectado con la base de datos local</p>
                    <p className="mt-1">Reiniciar la sincronización descargará los datos nuevamente desde el servidor.</p>
                  </div>
                </div>
              </div>
            )}
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>

            <div className="flex flex-col gap-2">
              {isSchemaErrorState ? (
                <Button
                  onClick={handleResetAndSync}
                  disabled={isResetting}
                  className="h-12 w-full rounded-2xl bg-orange-500 text-base font-semibold text-white hover:bg-orange-600"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reiniciando...
                    </>
                  ) : (
                    "Reiniciar sincronización"
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleRetry}
                  className="h-12 w-full rounded-2xl bg-orange-500 text-base font-semibold text-white hover:bg-orange-600"
                >
                  Intentar nuevamente
                </Button>
              )}
              <Button
                onClick={handleSkip}
                variant="outline"
                className="h-12 w-full rounded-2xl text-base"
              >
                Continuar sin sincronizar
              </Button>
              <Button
                onClick={handleGoToLogin}
                variant="ghost"
                className="h-10 text-sm text-muted-foreground"
              >
                Volver al login
              </Button>
            </div>
          </div>
        )}

        {/* Tips */}
        {!error && syncProgress.stage !== "completed" && (
          <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <strong>Consejo:</strong> Esta sincronización solo ocurre al iniciar sesión.
              Los datos se guardan localmente para trabajar sin conexión.
            </p>
          </div>
        )}
      </div>
      <DebugWidget />
    </div>
  );
}
