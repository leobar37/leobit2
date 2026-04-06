import { useEffect, useState, useRef } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, RefreshCw, LogOut, AlertCircle, WifiOff } from "lucide-react";
import { SyncProvider } from "~/components/sync/sync-status";
import { SyncErrorMonitor } from "~/components/sync/sync-error-monitor";
import { SyncDevToolsDrawer } from "~/components/sync/sync-devtools-drawer";
import {
  ConflictResolver,
  type ConflictData,
  type ConflictResolution,
} from "~/components/sync/conflict-resolver";
import { EngineProvider, useEngine } from "~/engine";
import { ServicesProvider } from "~/lib/sync/service-provider";
import { AppLayout } from "~/components/layout/app-layout";
import { useAutoFileUploadProcessor } from "~/hooks/use-auto-file-upload";
import { useBusinessWithCacheStatus } from "~/hooks/use-business";
import { refreshSession } from "~/lib/auth-client";
import { getStoredBusinessId, getStoredAuthToken, getStoredBusinessUserId, clearStoredAuthState } from "~/lib/session-storage";
import { useCachedBusiness } from "~/hooks/use-cached-business";

function OutletWithLog() {
  useAutoFileUploadProcessor();
  return <Outlet />;
}

const BUSINESS_LOADING_TIMEOUT = 15000;

function ServicesProviderWrapper({
  businessId,
  token,
  children,
}: {
  businessId: string;
  token: string;
  children: React.ReactNode;
}) {
  const { pg, db, isInitialized, error, schemaError, resetAndLogout } = useEngine();
  const { data: businessData, isLoading: isBusinessLoading, error: businessError, refetch: refetchBusiness } = useBusinessWithCacheStatus();

  const business = businessData && !businessData.fromCache ? businessData : undefined;

  const [elapsedTime, setElapsedTime] = useState(0);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use synchronous cache check via useQuery with staleTime: Infinity
  const { data: cachedBusinessData } = useCachedBusiness(pg);

  // Clear cache when business loads successfully from API
  useEffect(() => {
    if (business && !businessData?.fromCache) {
      // Business loaded from API successfully, any cached data is now stale
      // The cache will be updated with fresh data on next successful API call
    }
  }, [business, businessData?.fromCache]);

  useEffect(() => {
    if (isBusinessLoading && !business) {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();

        intervalRef.current = setInterval(() => {
          if (startTimeRef.current) {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            setElapsedTime(elapsed);
          }
        }, 1000);

        timeoutRef.current = setTimeout(() => {
          setHasTimedOut(true);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        }, BUSINESS_LOADING_TIMEOUT);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      startTimeRef.current = null;
      setElapsedTime(0);
      setHasTimedOut(false);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isBusinessLoading, business]);

  const handleRetry = async () => {
    setHasTimedOut(false);
    setElapsedTime(0);
    startTimeRef.current = null;
    await refetchBusiness();
  };

  const handleLogout = () => {
    clearStoredAuthState();
    window.location.href = "/login";
  };

  if (!isInitialized || !pg || !db) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <p className="text-sm text-muted-foreground">Inicializando base de datos local...</p>
      </div>
    );
  }

  if (schemaError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 px-4">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Error de sincronización</p>
          <p className="text-sm text-muted-foreground">
            La base de datos local está desactualizada. Por favor, resetea el sistema para sincronizar nuevamente.
          </p>
          {error && (
            <p className="text-xs text-muted-foreground/70 mt-2">
              {error.message}
            </p>
          )}
        </div>
        <button
          onClick={resetAndLogout}
          className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          Resetear e ir al login
        </button>
      </div>
    );
  }

  if (businessError && cachedBusinessData) {
    // API failed but we have cached data - use it
    const businessUserId = cachedBusinessData.businessUserId || getStoredBusinessUserId() || "";
    return (
      <ServicesProvider pg={pg} db={db} businessId={businessId} businessUserId={businessUserId} authToken={token}>
        <div className="fixed top-0 left-0 right-0 bg-amber-500/90 text-white text-xs px-3 py-1.5 flex items-center gap-2 z-50">
          <WifiOff className="h-3 w-3" />
          Modo offline - datos del negocio en cache
        </div>
        {children}
      </ServicesProvider>
    );
  }

  if (hasTimedOut && (isBusinessLoading || !business)) {
    if (cachedBusinessData) {
      // Timeout but we have cached data - use it
      const businessUserId = cachedBusinessData.businessUserId || getStoredBusinessUserId() || "";
      return (
        <ServicesProvider pg={pg} db={db} businessId={businessId} businessUserId={businessUserId} authToken={token}>
          <div className="fixed top-0 left-0 right-0 bg-amber-500/90 text-white text-xs px-3 py-1.5 flex items-center gap-2 z-50">
            <WifiOff className="h-3 w-3" />
            Modo offline - datos del negocio en cache
          </div>
          {children}
        </ServicesProvider>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 px-4 min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-amber-500" />
          </div>
          <div className="text-center space-y-2 max-w-md">
            <p className="font-medium">La carga está tardando demasiado</p>
            <p className="text-sm text-muted-foreground">
              La conexión con el servidor está tardando más de lo esperado. Puedes reintentar o volver al login.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Tiempo transcurrido: {elapsedTime}s
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Volver al login
          </button>
        </div>
      </div>
    );
  }

  if (businessError) {
    // API error and no cache - show error UI
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 px-4 min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="text-center space-y-2 max-w-md">
            <p className="font-medium">Error al cargar el negocio</p>
            <p className="text-sm text-muted-foreground">
              No se pudo obtener la información del negocio. Esto puede deberse a problemas de conexión o que la sesión haya expirado.
            </p>
            {businessError instanceof Error && (
              <p className="text-xs text-muted-foreground/70 mt-2">
                {businessError.message}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Volver al login
          </button>
        </div>
      </div>
    );
  }

  if (isBusinessLoading || !business) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <p className="text-sm text-muted-foreground">Cargando información del negocio...</p>
        {elapsedTime > 3 && (
          <p className="text-xs text-muted-foreground/70">
            Tiempo transcurrido: {elapsedTime}s
          </p>
        )}
      </div>
    );
  }

  const businessUserId = business.businessUserId;

  return (
    <ServicesProvider pg={pg} db={db} businessId={businessId} businessUserId={businessUserId} authToken={token}>
      {children}
    </ServicesProvider>
  );
}

export default function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [activeConflict, setActiveConflict] = useState<ConflictData | null>(
    null,
  );

  // Keep session alive by refreshing every 15 minutes
  useEffect(() => {
    const checkSession = async () => {
      const session = await refreshSession();
      if (!session) {
        clearStoredAuthState();
        window.location.href = "/login";
        return;
      }
    };

    const interval = setInterval(checkSession, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleResolveConflict = async (resolution: ConflictResolution) => {
    if (!activeConflict) return;

    try {
      const businessId = getStoredBusinessId();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getStoredAuthToken()}`,
      };
      if (businessId) {
        headers["x-business-id"] = businessId;
      }

      const response = await fetch(`/sync/conflicts/${activeConflict.id}/resolve`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          resolution: resolution.resolution,
          mergedData: resolution.mergedData,
        }),
      });

      if (!response.ok) {
        console.error("Failed to resolve conflict:", await response.text());
        return;
      }

      console.log("Conflict resolved successfully");
    } catch (error) {
      console.error("Error resolving conflict:", error);
    } finally {
      setActiveConflict(null);
    }
  };

  const hasToken = !!getStoredAuthToken();

  if (!hasToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const businessId = getStoredBusinessId() || "";
  const token = getStoredAuthToken() || "";

  return (
    <EngineProvider businessId={businessId} token={token}>
      <SyncProvider>
        <ServicesProviderWrapper businessId={businessId} token={token}>
          <AppLayout
            headerAccessory={
              <SyncDevToolsDrawer triggerClassName="text-muted-foreground hover:text-foreground" />
            }
          >
            <SyncErrorMonitor />
            <OutletWithLog />
            <ConflictResolver
              conflict={activeConflict}
              isOpen={!!activeConflict}
              onClose={() => setActiveConflict(null)}
              onResolve={handleResolveConflict}
            />
          </AppLayout>
        </ServicesProviderWrapper>
      </SyncProvider>
    </EngineProvider>
  );
}
