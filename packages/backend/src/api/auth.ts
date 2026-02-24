import { auth } from "../lib/auth";
import { getCorsConfig, getCorsOrigin } from "../lib/cors";

const corsConfig = getCorsConfig();

// Wrap auth.handler to add CORS headers to responses.
// .mount() bypasses Elysia's lifecycle, so onAfterHandle CORS won't apply.
  export const authHandler = async (request: Request): Promise<Response> => {
  const requestOrigin = request.headers.get("origin");
  const corsOrigin = getCorsOrigin(requestOrigin);

  // Handle OPTIONS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": corsOrigin,
        "access-control-allow-credentials": corsConfig.credentials,
        "access-control-allow-methods": corsConfig.methods,
        "access-control-allow-headers": corsConfig.headers,
        "access-control-max-age": corsConfig.maxAge,
      },
    });
  }

  try {
    const response = await auth.handler(request);

    // Clone headers and add CORS
    const headers = new Headers(response.headers);
    headers.set("access-control-allow-origin", corsOrigin);
    headers.set("access-control-allow-credentials", corsConfig.credentials);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error("[Auth Handler Error]", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "AUTH_HANDLER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      }),
      {
        status: 500,
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": corsOrigin,
          "access-control-allow-credentials": corsConfig.credentials,
        },
      }
    );
  }
  };
