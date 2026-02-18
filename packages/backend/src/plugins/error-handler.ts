import { Elysia } from "elysia";
import { AppError } from "../errors";
import { getCorsConfig, getCorsOrigin } from "../lib/cors";

const corsConfig = getCorsConfig();

function setCorsHeaders(set: { headers: Record<string, string | number> }, requestOrigin: string | null) {
  set.headers["access-control-allow-origin"] = getCorsOrigin(requestOrigin);
  set.headers["access-control-allow-credentials"] = corsConfig.credentials;
}

export const errorPlugin = new Elysia({ name: "error-handler" })
  .onError({ as: "global" }, ({ code, error, set, request }) => {
    const requestOrigin = request.headers.get("origin");

    if (error instanceof AppError) {
      set.status = error.statusCode;
      setCorsHeaders(set, requestOrigin);
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      };
    }

    if (code === "VALIDATION") {
      set.status = 400;
      setCorsHeaders(set, requestOrigin);
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: error.message,
        },
      };
    }

    if (code === "NOT_FOUND") {
      set.status = 404;
      setCorsHeaders(set, requestOrigin);
      return {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Resource not found",
        },
      };
    }

    console.error("Unexpected error:", error);
    if (error instanceof Error) {
      console.error("Stack trace:", error.stack);
    }

    set.status = 500;
    setCorsHeaders(set, requestOrigin);
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };
  });
