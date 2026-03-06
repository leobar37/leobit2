import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
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
    expiresIn: 60 * 60 * 24 * 365, // 1 year - essentially no expiration for offline-first app
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: false,
    },
  },
  socialProviders: {},
  plugins: [
    bearer(),
  ],
  advanced: {
    defaultCookieAttributes: {
      secure: false,
      httpOnly: false,
      sameSite: "none",
    },
  },
});

export type Auth = typeof auth;
