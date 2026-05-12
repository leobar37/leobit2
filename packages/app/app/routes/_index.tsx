import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { getStoredAuthToken } from "@/lib/session-storage";
import { Loader2 } from "lucide-react";
import type { Route } from "./+types/_index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Avileo" },
    { name: "description", content: "Controla tus cuentas desde el celular, sin papel. Avileo es el cuaderno digital para tu negocio." },
  ];
}

/**
 * Check if JWT token is expired (without verification, just decoding payload)
 */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp;
    if (!exp) return false;
    return Date.now() >= exp * 1000;
  } catch {
    return true; // If we can't parse, treat as expired
  }
}

const LOADING_TIMEOUT_MS = 3000;

function SplashScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <img src="/logo.svg" alt="Avileo" className="w-20 h-20" />
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold">Avileo</h1>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  const { user, isLoading } = useAuth();
  const [showTimeoutRedirect, setShowTimeoutRedirect] = useState(false);

  // Safety timeout: don't stay in loading state forever
  useEffect(() => {
    if (!isLoading) return;

    const timer = setTimeout(() => {
      console.log("[Index] Loading timeout reached, forcing redirect");
      setShowTimeoutRedirect(true);
    }, LOADING_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isLoading]);

  // Sync check: if no token in localStorage, redirect immediately without waiting for session
  const hasStoredToken = getStoredAuthToken();

  // Show loading while checking session
  if (isLoading && !showTimeoutRedirect) {
    return <SplashScreen />;
  }

  // If no stored token, user must login
  if (!hasStoredToken || showTimeoutRedirect) {
    if (showTimeoutRedirect) {
      console.log("[Index] Timeout redirect to login");
    } else {
      console.log("[Index] No stored token found, redirecting to login");
    }
    return <Navigate to="/login" replace />;
  }

  // If token is expired, redirect to login
  if (isTokenExpired(hasStoredToken)) {
    console.log("[Index] Token is expired, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // If we have a token but no session user yet, let sync handle validation
  // This handles the case where token exists but session is not loaded yet
  if (!user) {
    console.log("[Index] Token exists but no session user, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  // User is authenticated with valid session
  return <Navigate to="/dashboard" replace />;
}
