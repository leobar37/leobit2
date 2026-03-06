import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { SyncProvider } from "~/components/sync/sync-status";
import { ElectricProvider } from "~/lib/db/electric-client";
import { AppLayout } from "~/components/layout/app-layout";
import { HelpButton } from "~/components/help";
import { refreshSession } from "~/lib/auth-client";

function OutletWithLog() {
  const location = useLocation();
  console.log('[ProtectedLayout] Outlet rendering, path:', location.pathname);
  return <Outlet />;
}



export default function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Keep session alive by refreshing every 15 minutes
  // This prevents JWT token expiration issues
  useEffect(() => {
    const interval = setInterval(() => {
      void refreshSession();
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <ElectricProvider>
      <SyncProvider>
        <AppLayout>
          <OutletWithLog />
          <HelpButton />
        </AppLayout>
      </SyncProvider>
    </ElectricProvider>
  );
}
