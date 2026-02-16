import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { getCorsConfig } from "./cors";

const corsConfig = getCorsConfig();

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_BASE_URL || "http://localhost:5201",
  trustedOrigins: corsConfig.allowedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  socialProviders: {},
  plugins: [],
  advanced: {
    defaultCookieAttributes: {
      sameSite: corsConfig.isProduction ? "none" : "lax",
      secure: corsConfig.isProduction,
    },
  },
});

export type Auth = typeof auth;
