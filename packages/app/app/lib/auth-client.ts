import { createAuthClient } from "better-auth/react";
import { clearStoredAuthState, getStoredAuthToken } from "./session-storage";

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

export const { signIn, signUp, signOut, useSession, changePassword } = authClient;

/**
 * Refresh the current session to extend its lifetime.
 * Call this periodically (e.g., every 30 minutes) to keep the session alive
 * while the user is active.
 */
export async function refreshSession() {
  const result = await authClient.getSession();
  if (result.error) {
    if (isAuthenticationError(result.error)) {
      clearStoredAuthState();
    }
    return null;
  }
  return result.data;
}
