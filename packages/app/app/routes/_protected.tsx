import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { SyncProvider } from "~/components/sync/sync-status";
import { SyncErrorMonitor } from "~/components/sync/sync-error-monitor";
import { SyncDevToolsDrawer } from "~/components/sync/sync-devtools-drawer";
import { PullSyncWrapper } from "~/components/sync/pull-sync-wrapper";
import {
  ConflictResolver,
  type ConflictData,
  type ConflictResolution,
} from "~/components/sync/conflict-resolver";
import { EngineProvider, useEngine } from "~/engine";
import { ServicesProvider } from "~/lib/sync/service-provider";
import { AppLayout } from "~/components/layout/app-layout";
import { useAutoFileUploadProcessor } from "~/hooks/use-auto-file-upload";
import { useBusiness } from "~/hooks/use-business";
import { refreshSession } from "~/lib/auth-client";
import { getStoredBusinessId, getStoredAuthToken, clearStoredAuthState } from "~/lib/session-storage";

function OutletWithLog() {
  useAutoFileUploadProcessor();
  return <Outlet />;
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
  const { pg, db, isInitialized, error, schemaError, resetAndLogout } = useEngine();
  const { data: business, isLoading: isBusinessLoading } = useBusiness();

  if (!isInitialized || !pg || !db) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <p className="text-sm text-muted-foreground">Inicializando base de datos local...</p>
      </div>
    );
  }

  // Show schema error with reset option
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

  // Wait for business data to load before providing services
  if (isBusinessLoading || !business) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <p className="text-sm text-muted-foreground">Cargando información del negocio...</p>
      </div>
    );
  }

  const businessUserId = business.businessUserId;

  return (
    <ServicesProvider pg={pg} db={db} businessId={businessId} businessUserId={businessUserId} authToken={token}>
      <PullSyncWrapper>
        {children}
      </PullSyncWrapper>
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
    setActiveConflict(null);
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
