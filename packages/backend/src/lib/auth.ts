import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, jwt } from "better-auth/plugins";
import { db } from "./db";
import { getCorsConfig } from "./cors";
import * as schema from "../db/schema";

const corsConfig = getCorsConfig();

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_BASE_URL || "http://localhost:5201",
  trustedOrigins: corsConfig.allowedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 365, // 1 year
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: false,
    },
  },
  socialProviders: {},
  plugins: [
    bearer(),
    jwt({
      jwt: {
        // Security: Extended from default 15min to 7 days for mobile vendor use case
        expirationTime: "7d",
      },
    }),
  ],
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  },
});

export type Auth = typeof auth;
