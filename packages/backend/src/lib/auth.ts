import { betterAuth, APIError } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, jwt } from "better-auth/plugins";
import { db } from "./db";
import { getCorsConfig } from "./cors";
import * as schema from "../db/schema";

const corsConfig = getCorsConfig();

/**
 * Traducciones de mensajes de error de Better Auth a español (es-PE).
 * Mapea los BASE_ERROR_CODES a mensajes en español.
 */
const AUTH_ERROR_TRANSLATIONS: Record<string, string> = {
  // Email/Password Sign-In
  INVALID_EMAIL_OR_PASSWORD: "Correo o contraseña inválidos",
  INVALID_EMAIL: "Correo electrónico inválido",
  INVALID_PASSWORD: "Contraseña inválida",
  USER_NOT_FOUND: "Usuario no encontrado",
  EMAIL_NOT_VERIFIED: "Correo electrónico no verificado. Revisa tu bandeja de entrada.",
  FAILED_TO_CREATE_SESSION: "Error al crear la sesión. Intenta nuevamente.",
  FAILED_TO_CREATE_USER: "Error al crear el usuario. Intenta nuevamente.",
  // Sign-Up
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Este correo ya está registrado. Usa otro correo o inicia sesión.",
  USER_ALREADY_EXISTS: "El usuario ya existe",
  PASSWORD_TOO_SHORT: "La contraseña es demasiado corta. Mínimo 8 caracteres.",
  PASSWORD_TOO_LONG: "La contraseña es demasiado larga. Máximo 128 caracteres.",
  // Password change
  CREDENTIAL_ACCOUNT_NOT_FOUND: "No se encontró la cuenta de credenciales.",
  FAILED_TO_GET_SESSION: "Error al obtener la sesión.",
  SESSION_EXPIRED: "La sesión ha expirado. Inicia sesión nuevamente.",
  // General
  FAILED_TO_GET_USER_INFO: "Error al obtener la información del usuario.",
  INVALID_TOKEN: "Token inválido o expirado.",
  USER_EMAIL_NOT_FOUND: "No se encontró el correo del usuario.",
  PROVIDER_NOT_FOUND: "Proveedor de autenticación no encontrado.",
  ID_TOKEN_NOT_SUPPORTED: "El proveedor no soporta verificación de token.",
  EMAIL_CAN_NOT_BE_UPDATED: "El correo electrónico no se puede actualizar por esta vía.",
};

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
  // Translate Better Auth error messages to Spanish (es-PE)
  // Uses the after hook to intercept APIError responses before they're sent
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const returned = ctx.context.returned;
      if (returned instanceof APIError) {
        const code = returned.body?.code as string | undefined;
        const translatedMessage = code
          ? AUTH_ERROR_TRANSLATIONS[code] || returned.message
          : returned.message;

        throw new APIError(returned.status, {
          ...returned.body,
          message: translatedMessage,
        });
      }
    }),
  },
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
