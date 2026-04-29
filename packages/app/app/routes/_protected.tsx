import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { AppLayout } from "~/components/layout/app-layout";
import { MobileSlotProvider } from "~/components/mobile";
import {
  getStoredBusinessId,
  getStoredAuthToken,
  clearStoredAuthState,
} from "~/lib/session-storage";
import { refreshSession } from "~/lib/auth-client";
import { useEffect, useState } from "react";
import { hydrateCurrentBusinessContext } from "~/lib/business-context";

export default function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [isHydratingBusiness, setIsHydratingBusiness] = useState(false);
  const [didAttemptBusinessHydration, setDidAttemptBusinessHydration] = useState(false);

  const SESSION_REFRESH_INTERVAL_MS = 15 * 60 * 1000;

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

    const interval = setInterval(checkSession, SESSION_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (getStoredBusinessId()) {
      setDidAttemptBusinessHydration(true);
      return;
    }

    let cancelled = false;

    const hydrateBusiness = async () => {
      setIsHydratingBusiness(true);
      await hydrateCurrentBusinessContext();
      if (!cancelled) {
        setDidAttemptBusinessHydration(true);
        setIsHydratingBusiness(false);
      }
    };

    hydrateBusiness();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const hasToken = !!getStoredAuthToken();

  if (!hasToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isLoading || !user || isHydratingBusiness || !didAttemptBusinessHydration) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const businessId = getStoredBusinessId() || "";

  if (!businessId && location.pathname !== "/business/create") {
    return <Navigate to="/business/create" replace />;
  }

  return (
    <MobileSlotProvider>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </MobileSlotProvider>
  );
}
