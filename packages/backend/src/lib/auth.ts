import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { db } from "./db";
import { getCorsConfig } from "./cors";

console.log("[AUTH INIT] Starting Better Auth initialization...");

const corsConfig = getCorsConfig();
console.log("[AUTH INIT] CORS config:", { allowedOrigins: corsConfig.allowedOrigins });

console.log("[AUTH INIT] Database URL present:", !!process.env.DATABASE_URL);
console.log("[AUTH INIT] Base URL:", process.env.BETTER_AUTH_BASE_URL);

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

console.log("[AUTH INIT] Better Auth initialized successfully");

export type Auth = typeof auth;
