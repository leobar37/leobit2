import { useState } from "react";
import { useNavigate } from "react-router";
import { authClient, useSession, changePassword, refreshSession } from "../lib/auth-client";
import { api } from "../lib/api-client";
import {
  clearStoredAuthState,
  clearStoredBusinessId,
  clearLocalDatabaseNamespace,
  setStoredBusinessId,
  setLocalDatabaseNamespace,
  clearSyncKeys,
  getStoredAuthToken,
} from "../lib/session-storage";

async function hydrateCurrentBusinessId() {
  const { data, error } = await api.businesses.me.get();

  if (error || !data?.success || !data.data?.id) {
    clearStoredBusinessId();
    return null;
  }

  setStoredBusinessId(data.data.id);
  return data.data.id;
}

async function ensureSessionReady() {
  const session = await refreshSession();

  if (!session?.user) {
    throw new Error("No se pudo restaurar la sesión");
  }

  return session;
}

function buildDatabaseNamespace(userId: string, businessId: string, sessionId?: string) {
  return [userId, businessId, sessionId ?? "session"].join("__");
}

async function waitForToken(maxRetries = 10, delayMs = 200): Promise<string | null> {
  for (let i = 0; i < maxRetries; i++) {
    const token = getStoredAuthToken();
    if (token) {
      return token;
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return null;
}

export function useAuth() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const login = async (email: string, password: string) => {
    clearStoredAuthState();

    const result = await authClient.signIn.email({
      email,
      password,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    // Wait for the token to be stored by the onSuccess callback in auth-client.ts
    // This handles potential race conditions where navigation happens before storage is updated
    const token = await waitForToken();
    if (!token) {
      console.error("[useAuth] Token not stored after sign-in");
      throw new Error("Error al procesar la sesión. Por favor, intenta nuevamente.");
    }

    const sessionState = await ensureSessionReady();
    const businessId = await hydrateCurrentBusinessId();

    if (!businessId) {
      console.error("[useAuth] Business ID not found after login");
      throw new Error("No se encontró el negocio asociado a tu cuenta.");
    }

    if (sessionState.user?.id) {
      setLocalDatabaseNamespace(
        buildDatabaseNamespace(
          sessionState.user.id,
          businessId,
          sessionState.session?.id,
        ),
      );
    }

    return result.data;
  };

  const register = async (data: {
    email: string;
    password: string;
    name: string;
  }) => {
    clearStoredAuthState();

    const result = await authClient.signUp.email({
      email: data.email,
      password: data.password,
      name: data.name,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    // Wait for the token to be stored by the onSuccess callback in auth-client.ts
    const token = await waitForToken();
    if (!token) {
      console.error("[useAuth] Token not stored after sign-up");
      throw new Error("Error al procesar la sesión. Por favor, intenta nuevamente.");
    }

    const sessionState = await ensureSessionReady();
    const businessId = await hydrateCurrentBusinessId();

    if (!businessId) {
      console.error("[useAuth] Business ID not found after registration");
      throw new Error("No se encontró el negocio asociado a tu cuenta.");
    }

    if (sessionState.user?.id) {
      setLocalDatabaseNamespace(
        buildDatabaseNamespace(
          sessionState.user.id,
          businessId,
          sessionState.session?.id,
        ),
      );
    }

    return result.data;
  };

  const logout = async () => {
    setIsLoggingOut(true);

    clearStoredAuthState();
    clearStoredBusinessId();
    clearLocalDatabaseNamespace();
    clearSyncKeys();

    // Notify server in background (fire and forget - ignore errors)
    // The local cleanup is already done, so the user is effectively logged out
    authClient.signOut().catch((error) => {
      console.warn("Logout server call failed (can be ignored):", error);
    });

    navigate("/login", { replace: true });
    window.location.href = "/login";
  };

  const changeUserPassword = async (data: {
    currentPassword: string;
    newPassword: string;
  }) => {
    const result = await changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
      revokeOtherSessions: true,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.data;
  };

  return {
    user: session?.user ?? null,
    isAuthenticated: !!session?.user,
    isLoading: isPending,
    isLoggingOut,
    login,
    register,
    logout,
    changePassword: changeUserPassword,
  };
}
