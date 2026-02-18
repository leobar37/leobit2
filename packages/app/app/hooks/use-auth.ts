import { useNavigate } from "react-router";
import { authClient, useSession, changePassword } from "../lib/auth-client";

export function useAuth() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();

  const login = async (email: string, password: string) => {
    const result = await authClient.signIn.email({
      email,
      password,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.data;
  };

  const register = async (data: {
    email: string;
    password: string;
    name: string;
  }) => {
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
    await authClient.signOut();
    navigate("/login");
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
