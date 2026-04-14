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
  const result = await authClient.getSession();
  if (result.error) {
    if (isAuthenticationError(result.error)) {
      clearStoredAuthState();
      clearAuthSessionCache();
      return null;
    }
    throw result.error;
  }

  const sessionData = (result.data ?? null) as AuthSessionData | null;
  setCachedAuthSession(sessionData);
  return sessionData;
}

async function resolveSessionWithOfflineFallback(): Promise<AuthSessionData | null> {
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  if (isOffline) {
    return getCachedAuthSession();
  }

  try {
    return await fetchAuthSessionFromServer();
  } catch (error) {
    if (isOfflineError(error)) {
      return getCachedAuthSession();
    }
    return null;
  }
}

export function useAuthSession() {
  return useQuery({
    queryKey: PERSISTED_REMOTE_QUERY_KEYS.authSession,
    queryFn: resolveSessionWithOfflineFallback,
    retry: (failureCount, error) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return false;
      }
      if (isOfflineError(error)) {
        return false;
      }
      return failureCount < 1;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
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
