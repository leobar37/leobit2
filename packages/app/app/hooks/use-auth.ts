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

    const sessionState = await ensureSessionReady();
    const businessId = await hydrateCurrentBusinessId();

    if (businessId && sessionState.user?.id) {
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

    const sessionState = await ensureSessionReady();
    const businessId = await hydrateCurrentBusinessId();

    if (businessId && sessionState.user?.id) {
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
