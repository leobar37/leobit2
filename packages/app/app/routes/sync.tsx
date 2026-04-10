import { Loader2, CloudDownload, Database, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DebugWidget } from "~/devtools";
import { useInitialSync } from "~/hooks/use-initial-sync";

export default function SyncPage() {
  const {
    progress,
    error,
    isSchemaError,
    isResetting,
    totalChanges,
    actions: { retry, skip, goToLogin, resetAndSync },
  } = useInitialSync();

  const isError = error !== null;
  const isCompleted = progress.stage === "completed";

  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center bg-gradient-to-b from-orange-50/50 to-white px-4 py-6">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-500 shadow-[0_8px_30px_rgba(249,115,22,0.3)]">
          {isCompleted ? (
            <CheckCircle2 className="h-10 w-10 text-white" />
          ) : (
            <CloudDownload className="h-10 w-10 text-white" />
          )}
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isCompleted
              ? "¡Listo!"
              : isError
                ? "Error de sincronización"
                : "Sincronizando datos"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isCompleted
              ? "Tus datos están actualizados"
              : isError
                ? "No se pudieron sincronizar los datos"
                : progress.currentStage
                  ? "Descargando información..."
                  : "Estamos descargando tu información del servidor"}
          </p>
        </div>

        {/* Progress */}
        {!isError && (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-orange-500 transition-all duration-500 ease-out"
                style={{ width: `${progress.progress ?? 0}%` }}
              />
            </div>

            {/* Status */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2
                className={`h-4 w-4 ${
                  isCompleted ? "hidden" : "animate-spin"
                }`}
              />
              <span>{progress.message}</span>
            </div>

            {/* Stats */}
            {(progress.changesApplied ?? 0) > 0 && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70">
                <Database className="h-3 w-3" />
                <span>{progress.changesApplied} registros sincronizados</span>
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="space-y-4">
            {isSchemaError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Problema detectado con la base de datos local</p>
                    <p className="mt-1">
                      Reiniciar la sincronización descargará los datos nuevamente desde el servidor.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>

            <div className="flex flex-col gap-2">
              {isSchemaError ? (
                <Button
                  onClick={resetAndSync}
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
                  onClick={retry}
                  className="h-12 w-full rounded-2xl bg-orange-500 text-base font-semibold text-white hover:bg-orange-600"
                >
                  Intentar nuevamente
                </Button>
              )}
              <Button onClick={skip} variant="outline" className="h-12 w-full rounded-2xl text-base">
                Continuar sin sincronizar
              </Button>
              <Button
                onClick={goToLogin}
                variant="ghost"
                className="h-10 text-sm text-muted-foreground"
              >
                Volver al login
              </Button>
            </div>
          </div>
        )}

        {/* Tips */}
        {!isError && !isCompleted && (
          <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <strong>Consejo:</strong> Esta sincronización solo ocurre al iniciar sesión. Los datos
              se guardan localmente para trabajar sin conexión.
            </p>
          </div>
        )}
      </div>
      <DebugWidget />
    </div>
  );
}
