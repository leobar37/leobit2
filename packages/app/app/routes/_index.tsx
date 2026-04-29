import { Navigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { getStoredAuthToken } from "@/lib/session-storage";
import { Loader2 } from "lucide-react";
import type { Route } from "./+types/_index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Avileo" },
    { name: "description", content: "Sistema de ventas de pollo" },
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

export default function Index() {
  const { user, isLoading } = useAuth();

  // Sync check: if no token in localStorage, redirect immediately without waiting for session
  const hasStoredToken = getStoredAuthToken();

  // Show loading while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // If no stored token, user must login
  if (!hasStoredToken) {
    console.log("[Index] No stored token found, redirecting to landing");
    return <Navigate to="/landing" replace />;
  }

  // If token is expired, redirect to landing
  if (isTokenExpired(hasStoredToken)) {
    console.log("[Index] Token is expired, redirecting to landing");
    return <Navigate to="/landing" replace />;
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
