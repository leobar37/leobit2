import { useState } from "react";
import { useNavigate } from "react-router";
import { authClient, useAuthSession, changePassword, refreshSession, clearAuthSessionCache } from "../lib/auth-client";
import { api } from "../lib/api-client";
import {
  clearStoredAuthState,
  clearStoredBusinessId,
  setStoredBusinessId,
  setStoredBusinessUserId,
  getStoredAuthToken,
  getStoredBusinessId,
} from "../lib/session-storage";

async function hydrateCurrentBusinessId() {
  try {
    const { data, error } = await api.businesses.me.get();

    if (error || !data?.success || !data.data?.id) {
      console.warn("[useAuth] Failed to fetch current business from API, preserving stored ID");
      const storedId = getStoredBusinessId();
      if (storedId) {
        return storedId;
      }
      return null;
    }

    setStoredBusinessId(data.data.id);
    if (data.data.businessUserId) {
      setStoredBusinessUserId(data.data.businessUserId);
    }
    return data.data.id;
  } catch (err) {
    console.warn("[useAuth] Exception fetching business ID, preserving stored ID:", err);
    const storedId = getStoredBusinessId();
    return storedId;
  }
}

async function ensureSessionReady() {
  const session = await refreshSession();

  if (!session?.user) {
    throw new Error("No se pudo restaurar la sesión");
  }

  return session;
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

export type LoginResult = { needsRedirect: false } | { needsRedirect: true; redirectTo: "/business/create" };
export type RegisterResult = { needsRedirect: false } | { needsRedirect: true; redirectTo: "/business/create" };

export function useAuth() {
  const navigate = useNavigate();
  const { data: session, isPending } = useAuthSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const login = async (email: string, password: string): Promise<LoginResult> => {
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
      return { needsRedirect: true, redirectTo: "/business/create" };
    }

    return { needsRedirect: false };
  };

  const register = async (data: {
    email: string;
    password: string;
    name: string;
  }): Promise<RegisterResult> => {
    clearStoredAuthState();

    const result = await authClient.signUp.email({
      email: data.email,
      password: data.password,
      name: data.name,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    const token = await waitForToken();
    if (!token) {
      console.error("[useAuth] Token not stored after sign-up");
      throw new Error("Error al procesar la sesión. Por favor, intenta nuevamente.");
    }

    const sessionState = await ensureSessionReady();
    const businessId = await hydrateCurrentBusinessId();

    if (!businessId) {
      return { needsRedirect: true, redirectTo: "/business/create" };
    }

    return { needsRedirect: false };
  };

  const logout = async () => {
    setIsLoggingOut(true);

    clearStoredAuthState();
    clearAuthSessionCache();
    clearStoredBusinessId();

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
    isLoading: !!getStoredAuthToken() && isPending,
    isLoggingOut,
    login,
    register,
    logout,
    changePassword: changeUserPassword,
  };
}
