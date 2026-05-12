import { Elysia } from "elysia";
import {
  createLogger,
  isDevIoLoggingEnabled,
  sanitizeForLog,
} from "../lib/logger";

const logger = createLogger("http-io");
const requestStarts = new WeakMap<Request, number>();
const skippedPathPrefixes = ["/health", "/api/inngest"];
const sensitiveBodyPathPrefixes = ["/api/auth"];
const sensitivePathPatterns = [
  /^\/invitations\/[^/]+$/,
];

function shouldLog(request: Request): boolean {
  if (!isDevIoLoggingEnabled()) return false;
  if (request.method === "OPTIONS") return false;

  const pathname = new URL(request.url).pathname;
  return !skippedPathPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function getRequestInfo(request: Request) {
  const url = new URL(request.url);

  return {
    method: request.method,
    path: redactSensitivePath(url.pathname),
    query: sanitizeForLog(Object.fromEntries(url.searchParams.entries())),
  };
}

function redactSensitivePath(pathname: string): string {
  if (sensitivePathPatterns.some((pattern) => pattern.test(pathname))) {
    return pathname.split("/").slice(0, -1).concat("[REDACTED]").join("/");
  }

  return pathname;
}

function shouldLogBody(request: Request): boolean {
  const pathname = new URL(request.url).pathname;
  return !sensitiveBodyPathPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function getDurationMs(request: Request): number | undefined {
  const start = requestStarts.get(request);
  if (!start) return undefined;
  return Math.round(performance.now() - start);
}

function getStatus(setStatus: unknown, response: unknown): unknown {
  if (setStatus) return setStatus;
  if (response instanceof Response) return response.status;
  return 200;
}

export const devRequestLoggerPlugin = new Elysia({ name: "dev-request-logger" })
  .onBeforeHandle(({ request, body }) => {
    if (!shouldLog(request)) return;

    requestStarts.set(request, performance.now());
    logger.debug(
      {
        request: {
          ...getRequestInfo(request),
          headers: sanitizeForLog(request.headers),
          body: shouldLogBody(request) ? sanitizeForLog(body) : "[NotLogged]",
        },
      },
      "Incoming request"
    );
  })
  .onAfterHandle(({ request, set, response }) => {
    if (!shouldLog(request)) return;

    logger.debug(
      {
        request: getRequestInfo(request),
        response: {
          status: getStatus(set.status, response),
          durationMs: getDurationMs(request),
          body: shouldLogBody(request)
            ? sanitizeForLog(response)
            : "[NotLogged]",
        },
      },
      "Outgoing response"
    );
    requestStarts.delete(request);
  })
  .onError({ as: "global" }, ({ request, set, code, error }) => {
    if (!shouldLog(request)) return;

    logger.error(
      {
        request: getRequestInfo(request),
        error: {
          code,
          status: set.status,
          durationMs: getDurationMs(request),
          details: sanitizeForLog(error),
        },
      },
      "Request failed"
    );
    requestStarts.delete(request);
  });
