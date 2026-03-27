import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2, CloudDownload, Database, CheckCircle2, AlertTriangle } from "lucide-react";
import { initDatabase, resetDatabase, SCHEMA_HASH_KEY } from "~/engine/db";
import { PullService } from "~/lib/sync/pull-service";
import { getStoredAuthToken, getStoredBusinessId, getLocalDatabaseNamespace, getPullCursorStorageKey } from "~/lib/session-storage";
import { Button } from "@/components/ui/button";

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

  const waitForAuth = async (maxRetries = 10, delayMs = 300): Promise<{ token: string; businessId: string } | null> => {
    for (let i = 0; i < maxRetries; i++) {
      const token = getStoredAuthToken();
      const businessId = getStoredBusinessId();
      if (token && businessId) {
        return { token, businessId };
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

        if (hasCursor) {
          // We have synced before, just do a quick pull and go
          setSyncProgress({
            stage: "pulling",
            message: "Sincronizando cambios recientes...",
            progress: 50,
          });

          const pullService = new PullService(pg, db, businessId, token);
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
          // First time sync - pull all data
          setSyncProgress({
            stage: "pulling",
            message: "Descargando datos del servidor...",
            progress: 30,
          });

          const pullService = new PullService(pg, db, businessId, token);

          // Do multiple pulls until we get all data
          let totalApplied = 0;
          let attempts = 0;
          const maxAttempts = 50; // Safety limit

          while (attempts < maxAttempts) {
            const result = await pullService.pull();

            if (!result.success) {
              throw new Error(result.error || "Error al sincronizar");
            }

            totalApplied += result.changesApplied;

            // Update progress
            const progress = Math.min(30 + (attempts * 2), 90);
            setSyncProgress({
              stage: "pulling",
              message: `Descargando datos... (${totalApplied} registros)`,
              progress,
              changesApplied: totalApplied,
            });

            if (!result.hasMore) {
              break;
            }

            attempts++;
          }

          setSyncProgress({
            stage: "completed",
            message: `Sincronización completada (${totalApplied} registros)`,
            progress: 100,
            changesApplied: totalApplied,
          });
        }

        // Wait a moment to show completion before navigating
        // Note: We don't close pg here because EngineProvider will reuse it
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
    </div>
  );
}
