import { useNavigate } from "react-router";
import { authClient, useSession, changePassword } from "../lib/auth-client";
import { api } from "../lib/api-client";
import {
  clearStoredAuthState,
  clearStoredBusinessId,
  setStoredBusinessId,
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

export function useAuth() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();

  const login = async (email: string, password: string) => {
    clearStoredAuthState();

    const result = await authClient.signIn.email({
      email,
      password,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    await hydrateCurrentBusinessId();

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
