import { createAuthClient } from "better-auth/react";

/**
 * Better Auth Client - JWT Mode with Bearer Token
 *
 * Uses Bearer tokens stored in localStorage instead of cookies
 * This avoids SameSite/Secure cookie issues in development
 *
 * How it works:
 * - Backend sends token in 'set-auth-token' header after authentication
 * - onSuccess callback captures and stores token in localStorage as 'bearer_token'
 * - auth.token function provides token to Authorization header for subsequent requests
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5201",

  fetchOptions: {
    credentials: "omit",

    onSuccess: (ctx) => {
      const authToken = ctx.response.headers.get("set-auth-token");
      if (authToken) {
        localStorage.setItem("bearer_token", authToken);
      }
    },

    auth: {
      type: "Bearer",
      token: () => {
        return localStorage.getItem("bearer_token") || "";
      },
    },
  },
});

export const { signIn, signUp, signOut, useSession, changePassword } = authClient;
