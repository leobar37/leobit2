import { useNavigate } from "react-router";
import { authClient, useSession, changePassword, refreshSession } from "../lib/auth-client";
import { api } from "../lib/api-client";
import {
  clearStoredAuthState,
  clearStoredBusinessId,
  setStoredBusinessId,
} from "../lib/session-storage";

const isAuthDebugEnabled = import.meta.env.DEV;

function debugAuth(message: string, payload?: unknown) {
  if (!isAuthDebugEnabled) return;

  if (payload === undefined) {
    console.log(`[AuthFlow] ${message}`);
    return;
  }

  console.log(`[AuthFlow] ${message}`, payload);
}

async function hydrateCurrentBusinessId() {
  debugAuth("Hydrating current business");
  const { data, error } = await api.businesses.me.get();

  if (error || !data?.success || !data.data?.id) {
    debugAuth("Business hydration failed", { error, data });
    clearStoredBusinessId();
    return null;
  }

  setStoredBusinessId(data.data.id);
  debugAuth("Business hydration succeeded", { businessId: data.data.id });
  return data.data.id;
}

async function ensureSessionReady() {
  debugAuth("Refreshing session after auth mutation");
  const session = await refreshSession();
  debugAuth("Refresh session result", {
    hasUser: Boolean(session?.user),
    userId: session?.user?.id ?? null,
  });

  if (!session?.user) {
    throw new Error("No se pudo restaurar la sesión");
  }

  return session;
}

export function useAuth() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();

  debugAuth("useAuth state snapshot", {
    isPending,
    hasUser: Boolean(session?.user),
    userId: session?.user?.id ?? null,
  });

  const login = async (email: string, password: string) => {
    debugAuth("Login started", { email });
    clearStoredAuthState();

    const result = await authClient.signIn.email({
      email,
      password,
    });
    debugAuth("signIn.email completed", {
      hasError: Boolean(result.error),
      hasData: Boolean(result.data),
    });

    if (result.error) {
      debugAuth("Login failed", { message: result.error.message });
      throw new Error(result.error.message);
    }

    await ensureSessionReady();
    await hydrateCurrentBusinessId();
    debugAuth("Login flow completed successfully", {
      userId: result.data?.user?.id ?? null,
    });

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

    await ensureSessionReady();

    return result.data;
  };

  const logout = async () => {
    try {
      await authClient.signOut();
    } finally {
      clearStoredAuthState();
      navigate("/login");
    }
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
    login,
    register,
    logout,
    changePassword: changeUserPassword,
  };
}
