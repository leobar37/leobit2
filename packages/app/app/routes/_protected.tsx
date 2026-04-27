import { useEffect, useState, useRef } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, LogOut, AlertCircle, WifiOff } from "lucide-react";
import { SyncProvider } from "~/components/sync/sync-status";
import { SyncDevTools, SyncDevToolsProvider } from "@avileo/drizzle-sync/react/devtools";
import { useClearSyncStorage } from "~/hooks/use-clear-sync-storage";
import {
  ConflictResolver,
  type ConflictData,
  type ConflictResolution,
} from "~/components/sync/conflict-resolver";
import { initDevTools } from "~/lib/debug/console";
import { addServiceDebugHelpers } from "~/lib/debug";
import { AppLayout } from "~/components/layout/app-layout";
import { useBusiness } from "~/hooks/use-business";
import { PERSISTED_REMOTE_QUERY_KEYS } from "~/lib/query/persisted-query-keys";
import { refreshSession } from "~/lib/auth-client";
import { getStoredBusinessId, getStoredAuthToken, getStoredBusinessUserId, clearStoredAuthState } from "~/lib/session-storage";
import { createFetchHttpClient, getDeviceId, getDeviceFingerprint } from "@avileo/drizzle-sync/client";
import type { SyncClientEngine } from "@avileo/drizzle-sync/client";
import { createAvileoSyncEngine, type AvileoSyncEngine } from "~/lib/sync/generated/engine";
// Local alias to align TypeScript's module-level type references
type LocalEngineState = SyncClientEngine<Record<string, unknown>> | null;
import { useSyncInit } from "@avileo/drizzle-sync/react";
import type { PurchaseService } from "~/lib/services/purchase-service";
import type { SupplierService } from "~/lib/services/supplier-service";
import type { ProductService } from "~/lib/services/product-service";
import type { CustomerService } from "~/lib/services/customer-service";
import type { SaleService } from "~/lib/services/sale-service";

function OutletWithLog() {
  return <Outlet />;
}

const BUSINESS_LOADING_TIMEOUT = 15000;

function DevToolsWithConfig({ children }: { children: React.ReactNode }) {
  const clearSync = useClearSyncStorage();
  return (
    <SyncDevToolsProvider config={{ onClearStorage: async () => { await clearSync.mutateAsync({ preserveSession: false }); } }}>
      {children}
    </SyncDevToolsProvider>
  );
}

function ServicesProviderWrapper({
  businessId,
  token,
  children,
}: {
  businessId: string;
  token: string;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();

  // Engine state — useState (not useMemo) so we can initialize asynchronously
  const [engine, setEngine] = useState<LocalEngineState>(null);
  const [isEngineLoading, setIsEngineLoading] = useState(true);

  // Async engine creation — must be in useEffect, not useMemo (useMemo does not await async factories)
  useEffect(() => {
    if (!businessId || !token) {
      setEngine(null);
      setIsEngineLoading(false);
      return;
    }

    let cancelled = false;
    const businessUserId = getStoredBusinessUserId() || "";

    (async () => {
      try {
        const { appServiceOverrides } = await import("~/lib/sync/service-overrides");
        if (cancelled) return;
        const eng = createAvileoSyncEngine({
          tenantId: businessId,
          userId: businessUserId,
          authToken: token,
          apiUrl: import.meta.env.VITE_API_URL || "http://localhost:5201",
          httpClient: createFetchHttpClient({
            baseUrl: import.meta.env.VITE_API_URL || "http://localhost:5201",
            getAuthToken: () => token,
            tenantHeader: { key: "x-business-id", value: () => businessId },
            getDeviceId: () => getDeviceId(),
            getFingerprint: () => getDeviceFingerprint(),
          }),
          serviceOverrides: appServiceOverrides,
        });
        if (cancelled) return;
        setEngine(eng as unknown as LocalEngineState);
      } catch (err) {
        if (cancelled) return;
        console.error("[ServicesProviderWrapper] Failed to create SyncClientEngine:", err);
        setEngine(null);
      } finally {
        if (!cancelled) {
          setIsEngineLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [businessId, token]);

  const { isReady, isLoading: isSyncLoading, error, schemaError, hasInitTimeout, progress, totalChanges } = useSyncInit(engine as unknown as Parameters<typeof useSyncInit>[0], { timeoutMs: 30000 });

  // Initialize dev tools and service debug helpers once engine is ready
  useEffect(() => {
    if (!engine || !isReady) return;

    initDevTools({ pg: engine.getPg() });

    const syncService = engine.getSyncService();
    if (!syncService) return;

    addServiceDebugHelpers({
      purchaseService: (engine as AvileoSyncEngine).getService("purchases") as PurchaseService,
      supplierService: (engine as AvileoSyncEngine).getService("suppliers") as SupplierService,
      syncService,
      productService: (engine as AvileoSyncEngine).getService("products") as ProductService,
      customerService: (engine as AvileoSyncEngine).getService("customers") as CustomerService,
      saleService: (engine as AvileoSyncEngine).getService("sales") as unknown as SaleService,
    });
  }, [engine, isReady]);

  // ALL hooks must be called before any conditional returns
  const { data: business, isLoading: isBusinessLoading, error: businessError, refetch: refetchBusiness, isFetching } = useBusiness();

  const [elapsedTime, setElapsedTime] = useState(0);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect business ID cache mismatch
  useEffect(() => {
    if (business && business.id) {
      const storedBusinessId = getStoredBusinessId();
      if (storedBusinessId && storedBusinessId !== business.id) {
        console.warn(`[ServicesProviderWrapper] Business ID mismatch: cached=${business.id}, localStorage=${storedBusinessId}. Invalidating cache.`);
        queryClient.invalidateQueries({ queryKey: PERSISTED_REMOTE_QUERY_KEYS.business });
        queryClient.removeQueries({ queryKey: PERSISTED_REMOTE_QUERY_KEYS.business });
      }
    }
  }, [business, queryClient]);

  // Detect offline mode
  const isOfflineMode = business && (businessError || (!navigator.onLine && isFetching));

  // Track elapsed time during business loading
  useEffect(() => {
    if (isBusinessLoading && !business) {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
        intervalRef.current = setInterval(() => {
          if (startTimeRef.current !== null) {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            setElapsedTime(elapsed);
          }
        }, 1000);
        timeoutRef.current = setTimeout(() => setHasTimedOut(true), BUSINESS_LOADING_TIMEOUT);
      }
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      intervalRef.current = null;
      timeoutRef.current = null;
      startTimeRef.current = null;
      setElapsedTime(0);
      setHasTimedOut(false);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isBusinessLoading, business]);

  // ─── Conditional returns (all hooks called above) ───────────────────────────

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

  const handleResetAndLogout = async () => {
    if (engine) {
      await engine.resetAndLogout();
    } else {
      handleLogout();
    }
  };

  // Engine initializing (database creation + staged sync in progress)
  if (!engine || isEngineLoading) {
    const progressMessage = progress?.message || "Inicializando base de datos local...";
    const changesCount = totalChanges > 0 ? `(${totalChanges} registros)` : "";

    return (
      <>
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">{progressMessage}</p>
            {changesCount && (
              <p className="text-xs text-muted-foreground/70">{changesCount}</p>
            )}
          </div>
        </div>
        <SyncDevTools enabled={import.meta.env.DEV} />
      </>
    );
  }

  // Engine init timeout
  if (hasInitTimeout) {
    return (
      <>
        <div className="flex flex-col items-center justify-center gap-4 py-12 px-4 min-h-[50vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
            <div className="text-center space-y-2 max-w-md">
              <p className="font-medium">La inicialización está tardando demasiado</p>
              <p className="text-sm text-muted-foreground">
                La base de datos local está tardando más de lo esperado en inicializar. Puedes reintentar o volver al login.
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => window.location.reload()}
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
        <SyncDevTools enabled={import.meta.env.DEV} />
      </>
    );
  }

  if (schemaError) {
    return (
      <>
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
            onClick={handleResetAndLogout}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Resetear e ir al login
          </button>
        </div>
        <SyncDevTools enabled={import.meta.env.DEV} />
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="flex flex-col items-center justify-center gap-4 py-12 px-4">
          <div className="text-center space-y-2">
            <p className="text-destructive font-medium">Error al inicializar</p>
            <p className="text-sm text-muted-foreground">
              {error.message}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Reintentar
          </button>
        </div>
        <SyncDevTools enabled={import.meta.env.DEV} />
      </>
    );
  }

  // Offline mode: we have cached business data from persister but API failed or we're offline
  if (isOfflineMode && business) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 bg-amber-500/90 text-white text-xs px-3 py-1.5 flex items-center gap-2 z-50">
          <WifiOff className="h-3 w-3" />
          Modo offline - datos del negocio en cache
        </div>
        {children}
      </>
    );
  }

  // Timeout with cached data - use persisted data from TanStack Query
  if (hasTimedOut && (isBusinessLoading || !business)) {
    if (business) {
      return (
        <>
          <div className="fixed top-0 left-0 right-0 bg-amber-500/90 text-white text-xs px-3 py-1.5 flex items-center gap-2 z-50">
            <WifiOff className="h-3 w-3" />
            Modo offline - datos del negocio en cache
          </div>
          {children}
        </>
      );
    }

    return (
      <>
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
        <SyncDevTools enabled={import.meta.env.DEV} />
      </>
    );
  }

  if (businessError) {
    return (
      <>
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
        <SyncDevTools enabled={import.meta.env.DEV} />
      </>
    );
  }

  if (isBusinessLoading || !business) {
    return (
      <>
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-sm text-muted-foreground">Cargando información del negocio...</p>
          {elapsedTime > 3 && (
            <p className="text-xs text-muted-foreground/70">
              Tiempo transcurrido: {elapsedTime}s
            </p>
          )}
        </div>
        <SyncDevTools enabled={import.meta.env.DEV} />
      </>
    );
  }

  return <>{children}</>;
}

export default function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [activeConflict, setActiveConflict] = useState<ConflictData | null>(null);

  // Keep session alive by refreshing every 15 minutes
  useEffect(() => {
    const checkSession = async () => {
      const session = await refreshSession();
      if (session) return;

      const token = getStoredAuthToken();
      if (!token) {
        clearStoredAuthState();
        window.location.href = "/login";
        return;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        console.warn("[ProtectedLayout] Session refresh skipped while offline");
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
      <>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
        <SyncDevTools enabled={import.meta.env.DEV} />
      </>
    );
  }

  const businessId = getStoredBusinessId() || "";
  const token = getStoredAuthToken() || "";

  if (!businessId && location.pathname !== "/business/create") {
    return <Navigate to="/business/create" replace />;
  }

  return (
    <SyncProvider>
      <ServicesProviderWrapper businessId={businessId} token={token}>
        <DevToolsWithConfig>
          <AppLayout>
            <OutletWithLog />
            <SyncDevTools enabled={import.meta.env.DEV} />
            <ConflictResolver
              conflict={activeConflict}
              isOpen={!!activeConflict}
              onClose={() => setActiveConflict(null)}
              onResolve={handleResolveConflict}
            />
          </AppLayout>
        </DevToolsWithConfig>
      </ServicesProviderWrapper>
    </SyncProvider>
  );
}
