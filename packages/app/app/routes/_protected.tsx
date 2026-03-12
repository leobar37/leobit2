import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { SyncProvider } from "~/components/sync/sync-status";
import { SyncErrorMonitor } from "~/components/sync/sync-error-monitor";
import { ElectricProvider } from "~/lib/db/electric-client";
import { AppLayout } from "~/components/layout/app-layout";
import { useAutoFileUploadProcessor } from "~/hooks/use-auto-file-upload";
// import { HelpButton } from "~/components/help";
import { refreshSession } from "~/lib/auth-client";

const isAuthDebugEnabled = import.meta.env.DEV;

function debugProtected(message: string, payload?: unknown) {
  if (!isAuthDebugEnabled) return;

  if (payload === undefined) {
    console.log(`[ProtectedLayout] ${message}`);
    return;
  }

  console.log(`[ProtectedLayout] ${message}`, payload);
}

function OutletWithLog() {
  const location = useLocation();
  debugProtected("Outlet rendering", { path: location.pathname });
  useAutoFileUploadProcessor();
  return <Outlet />;
}



export default function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    debugProtected("Auth guard snapshot", {
      path: location.pathname,
      isLoading,
      hasUser: Boolean(user),
      userId: user?.id ?? null,
    });
  }, [isLoading, location.pathname, user]);

  // Keep session alive by refreshing every 15 minutes
  // This prevents JWT token expiration issues
  useEffect(() => {
    const interval = setInterval(() => {
      debugProtected("Refreshing session from keep-alive interval");
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
    debugProtected("Redirecting to login because user is missing", {
      path: location.pathname,
    });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <ElectricProvider>
      <SyncProvider>
        <AppLayout>
          <SyncErrorMonitor />
          <OutletWithLog />
          {/* <HelpButton /> */}
        </AppLayout>
      </SyncProvider>
    </ElectricProvider>
  );
}
