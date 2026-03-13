import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
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
import { refreshSession } from "~/lib/auth-client";
import { getStoredBusinessId, getStoredAuthToken } from "~/lib/session-storage";

function OutletWithLog() {
  useAutoFileUploadProcessor();
  return <Outlet />;
}

function ServicesProviderWrapper({
  businessId,
  token,
}: {
  businessId: string;
  token: string;
}) {
  const { pg, isInitialized } = useEngine();

  if (!isInitialized || !pg) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <ServicesProvider pg={pg} businessId={businessId} authToken={token}>
      <OutletWithLog />
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
    const interval = setInterval(
      () => {
        void refreshSession();
      },
      15 * 60 * 1000,
    );

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
        <AppLayout
          headerAccessory={
            <SyncDevToolsDrawer triggerClassName="text-muted-foreground hover:text-foreground" />
          }
        >
          <SyncErrorMonitor />
          <ServicesProviderWrapper businessId={businessId} token={token} />
        </AppLayout>
        <ConflictResolver
          conflict={activeConflict}
          isOpen={!!activeConflict}
          onClose={() => setActiveConflict(null)}
          onResolve={handleResolveConflict}
        />
      </SyncProvider>
    </EngineProvider>
  );
}
