import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { SyncProvider } from "~/components/sync/sync-status";
import { ElectricProvider } from "~/lib/db/electric-client";
import { AppLayout } from "~/components/layout/app-layout";

function OutletWithLog() {
  const location = useLocation();
  console.log('[ProtectedLayout] Outlet rendering, path:', location.pathname);
  return <Outlet />;
}

export default function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

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
        </AppLayout>
      </SyncProvider>
    </ElectricProvider>
  );
}
