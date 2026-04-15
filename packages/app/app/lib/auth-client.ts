import { createAuthClient } from "better-auth/react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "~/lib/query/client";
import { PERSISTED_REMOTE_QUERY_KEYS } from "~/lib/query/persisted-query-keys";
import { clearStoredAuthState, getStoredAuthToken } from "./session-storage";

export interface AuthSessionData {
  user?: {
    id?: string;
    email?: string;
    name?: string;
  };
  session?: {
    id?: string;
  };
}

function isAuthenticationError(error: unknown): boolean {
  if (!error) return false;

  const maybeStatus = (error as { status?: unknown; response?: { status?: unknown } }).status
    ?? (error as { response?: { status?: unknown } }).response?.status;

  if (maybeStatus === 401 || maybeStatus === 403) {
    return true;
  }

  const message = String(
    (error as { message?: unknown; value?: { message?: unknown } }).message
      ?? (error as { value?: { message?: unknown } }).value?.message
      ?? error
  ).toLowerCase();

  return (
    message.includes("401")
    || message.includes("403")
    || message.includes("unauthorized")
    || message.includes("forbidden")
    || message.includes("invalid token")
    || (message.includes("session") && message.includes("expired"))
    || message.includes("jwt")
  );
}

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5201",

  fetchOptions: {
    credentials: "omit",
    auth: {
      type: "Bearer",
      token: () => getStoredAuthToken() || "",
    },
    onSuccess: (ctx) => {
      const authToken = ctx.response.headers.get("set-auth-token");
      if (authToken) {
        localStorage.setItem("bearer_token", authToken);
      }
    },
  },
});

export const { signIn, signUp, signOut, changePassword } = authClient;

function isOfflineError(error: unknown): boolean {
  if (!error) return false;
  const message = String(
    (error as { message?: unknown; value?: { message?: unknown } }).message
      ?? (error as { value?: { message?: unknown } }).value?.message
      ?? error
  ).toLowerCase();

  return (
    message.includes("failed to fetch")
    || message.includes("networkerror")
    || message.includes("network request failed")
    || message.includes("load failed")
    || message.includes("fetch failed")
    || message.includes("err_network")
  );
}

function setCachedAuthSession(session: AuthSessionData | null): void {
  if (!session) {
    queryClient.removeQueries({ queryKey: PERSISTED_REMOTE_QUERY_KEYS.authSession });
    return;
  }
  queryClient.setQueryData(PERSISTED_REMOTE_QUERY_KEYS.authSession, session);
}

export function getCachedAuthSession(): AuthSessionData | null {
  return queryClient.getQueryData<AuthSessionData>(PERSISTED_REMOTE_QUERY_KEYS.authSession) ?? null;
}

export function clearAuthSessionCache(): void {
  queryClient.removeQueries({ queryKey: PERSISTED_REMOTE_QUERY_KEYS.authSession });
}

async function fetchAuthSessionFromServer(): Promise<AuthSessionData | null> {
  console.log("[DEBUG Auth] fetchAuthSessionFromServer START");
  try {
    console.log("[DEBUG Auth] Calling authClient.getSession()...");
    const result = await authClient.getSession();
    console.log("[DEBUG Auth] getSession returned:", JSON.stringify(result));

    // Handle null/undefined result
    if (!result) {
      console.warn("[DEBUG Auth] Result is null/undefined");
      return null;
    }

    if (result.error) {
      console.log("[DEBUG Auth] Has error:", result.error);
      if (isAuthenticationError(result.error)) {
        clearStoredAuthState();
        clearAuthSessionCache();
        return null;
      }
      throw result.error;
    }

    const sessionData = (result.data ?? null) as AuthSessionData | null;
    console.log("[DEBUG Auth] Session data:", sessionData);
    setCachedAuthSession(sessionData);
    return sessionData;
  } catch (error) {
    console.error("[DEBUG Auth] Exception in fetchAuthSessionFromServer:", error);
    clearStoredAuthState();
    clearAuthSessionCache();
    return null;
  }
}

async function resolveSessionWithOfflineFallback(): Promise<AuthSessionData | null> {
  console.log("[DEBUG Auth] resolveSessionWithOfflineFallback START");
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  console.log("[DEBUG Auth] isOffline:", isOffline);

  if (isOffline) {
    console.log("[DEBUG Auth] Offline mode - returning cached session");
    return getCachedAuthSession();
  }

  try {
    console.log("[DEBUG Auth] Starting fetch with timeout...");
    // Add timeout to prevent hanging requests from blocking the login page
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => {
        console.log("[DEBUG Auth] TIMEOUT FIRED - 8 seconds elapsed");
        reject(new Error("Session check timeout"))
      }, 8000)
    );
    const fetchPromise = fetchAuthSessionFromServer();
    console.log("[DEBUG Auth] Waiting for race between fetch and timeout...");
    const result = await Promise.race([fetchPromise, timeoutPromise]);
    console.log("[DEBUG Auth] Race completed with result:", result);
    return result;
  } catch (error) {
    console.log("[DEBUG Auth] Catch block, error:", error instanceof Error ? error.message : error);
    if (isOfflineError(error) || error instanceof Error && error.message === "Session check timeout") {
      console.log("[DEBUG Auth] Timeout/offline - returning cached session");
      return getCachedAuthSession();
    }
    console.log("[DEBUG Auth] Unknown error - returning null");
    return null;
  }
}

export function useAuthSession() {
  console.log("[DEBUG Auth] useAuthSession called - creating query");
  return useQuery({
    queryKey: PERSISTED_REMOTE_QUERY_KEYS.authSession,
    queryFn: async () => {
      console.log("[DEBUG Auth] Query function START");
      const result = await resolveSessionWithOfflineFallback();
      console.log("[DEBUG Auth] Query function END, result:", JSON.stringify(result));
      // Return empty session object instead of null to prevent refetch loops
      return result ?? { user: null, session: null };
    },
    retry: false, // Disable retry - causes hanging on network issues
    staleTime: Infinity, // Never auto-refetch
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    networkMode: "offlineFirst",
  });
}

/**
 * Refresh the current session to extend its lifetime.
 * Call this periodically (e.g., every 30 minutes) to keep the session alive
 * while the user is active.
 */
export async function refreshSession() {
  return resolveSessionWithOfflineFallback();
}
