import pino from "pino";

export const isDev = process.env.NODE_ENV !== "production";

const SENSITIVE_KEY_PATTERN =
  /authorization|cookie|password|token|secret|api[-_]?key|session|credential/i;
const MAX_LOG_DEPTH = 5;
const MAX_ARRAY_ITEMS = 20;
const MAX_STRING_LENGTH = 2_000;

const redactPaths = [
  "*.authorization",
  "*.cookie",
  "*.password",
  "*.token",
  "*.secret",
  "*.apiKey",
  "*.api_key",
  "*.session",
  "*.credential",
  "authorization",
  "cookie",
  "password",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "session",
  "credential",
];

export const logger = pino({
  level: isDev ? "debug" : "info",
  redact: {
    paths: redactPaths,
    censor: "[REDACTED]",
  },
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

export const createLogger = (name: string) => {
  return logger.child({ module: name });
};

export function isDevIoLoggingEnabled(): boolean {
  return isDev && process.env.AVILEO_DEV_IO_LOGS !== "false";
}

export function sanitizeForLog(value: unknown): unknown {
  return sanitizeValue(value, 0, new WeakSet<object>());
}

function sanitizeValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>
): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}...[truncated]`
      : value;
  }

  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "symbol" || typeof value === "function") {
    return `[${typeof value}]`;
  }

  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: isDev ? value.stack : undefined,
    };
  }
  if (value instanceof URLSearchParams) {
    return sanitizeValue(Object.fromEntries(value.entries()), depth + 1, seen);
  }
  if (value instanceof Headers) {
    return sanitizeValue(Object.fromEntries(value.entries()), depth + 1, seen);
  }
  if (value instanceof Request) {
    return {
      method: value.method,
      url: value.url,
      headers: sanitizeValue(value.headers, depth + 1, seen),
    };
  }
  if (value instanceof Response) {
    return {
      status: value.status,
      statusText: value.statusText,
      headers: sanitizeValue(value.headers, depth + 1, seen),
    };
  }

  if (typeof File !== "undefined" && value instanceof File) {
    return { name: value.name, size: value.size, type: value.type };
  }
  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return { size: value.size, type: value.type };
  }

  if (Array.isArray(value)) {
    if (depth >= MAX_LOG_DEPTH) return "[MaxDepth]";
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeValue(item, depth + 1, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    if (depth >= MAX_LOG_DEPTH) return "[MaxDepth]";
    seen.add(value);

    const output: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(value)) {
      output[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? "[REDACTED]"
        : sanitizeValue(entryValue, depth + 1, seen);
    }

    seen.delete(value);
    return output;
  }

  return String(value);
}
