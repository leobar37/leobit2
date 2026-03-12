import { createAuthClient } from "better-auth/react";
import { clearStoredAuthState, getStoredAuthToken } from "./session-storage";

const isAuthDebugEnabled = import.meta.env.DEV;

function debugAuthClient(message: string, payload?: unknown) {
  if (!isAuthDebugEnabled) return;

  if (payload === undefined) {
    console.log(`[AuthClient] ${message}`);
    return;
  }

  console.log(`[AuthClient] ${message}`, payload);
}

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5201",

  fetchOptions: {
    credentials: "omit",
    auth: {
      type: "Bearer",
      token: () => getStoredAuthToken() || "",
    },
    onRequest: (ctx) => {
      debugAuthClient("Request started", {
        url: ctx.url?.toString?.() ?? String(ctx.url),
        method: ctx.method,
        hasStoredToken: Boolean(getStoredAuthToken()),
        authHeader: ctx.headers instanceof Headers
          ? ctx.headers.get("authorization")
          : new Headers(ctx.headers).get("authorization"),
      });
    },

    onSuccess: (ctx) => {
      const authToken = ctx.response.headers.get("set-auth-token");
      debugAuthClient("Request succeeded", {
        url: ctx.request.url?.toString?.() ?? String(ctx.request.url),
        method: ctx.request.method,
        status: ctx.response.status,
        hasSetAuthToken: Boolean(authToken),
        responseData: ctx.data,
      });
      if (authToken) {
        debugAuthClient("Persisting bearer token", {
          tokenLength: authToken.length,
        });
        localStorage.setItem("bearer_token", authToken);
      }
    },
    onError: (ctx) => {
      debugAuthClient("Request failed", {
        url: ctx.request.url?.toString?.() ?? String(ctx.request.url),
        method: ctx.request.method,
        status: ctx.response?.status ?? null,
        error: ctx.error,
      });
    },
  },
});

export const { signIn, signUp, signOut, useSession, changePassword } = authClient;

/**
 * Refresh the current session to extend its lifetime.
 * Call this periodically (e.g., every 30 minutes) to keep the session alive
 * while the user is active.
 */
export async function refreshSession() {
  const result = await authClient.getSession();
  if (result.error) {
    clearStoredAuthState();
    return null;
  }
  return result.data;
}
