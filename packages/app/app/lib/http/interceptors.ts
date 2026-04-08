/**
 * HTTP Interceptor System
 *
 * Simple chain-of-responsibility for request/response transformation.
 * Only what's needed for the sync client.
 */

import type { HttpInterceptor, RequestContext, ResponseContext, ErrorContext } from "./types";

/**
 * Manages a chain of interceptors
 */
export class InterceptorChain {
  private interceptors: Map<string, HttpInterceptor> = new Map();

  /**
   * Add an interceptor to the chain
   * Returns a function to remove the interceptor
   */
  add(interceptor: HttpInterceptor): () => void {
    this.interceptors.set(interceptor.id, interceptor);
    return () => this.remove(interceptor.id);
  }

  /**
   * Remove an interceptor by ID
   */
  remove(id: string): void {
    this.interceptors.delete(id);
  }

  /**
   * Execute request interceptors in sequence
   */
  async executeRequest(context: RequestContext): Promise<RequestContext> {
    let current = context;
    for (const interceptor of this.interceptors.values()) {
      if (interceptor.onRequest) {
        current = await interceptor.onRequest(current);
      }
    }
    return current;
  }

  /**
   * Execute response interceptors in reverse sequence (LIFO)
   */
  async executeResponse<T>(context: ResponseContext<T>): Promise<ResponseContext<T>> {
    let current = context;
    const reversed = Array.from(this.interceptors.values()).reverse();
    for (const interceptor of reversed) {
      if (interceptor.onResponse) {
        current = await interceptor.onResponse(current);
      }
    }
    return current;
  }

  /**
   * Execute error interceptors in reverse sequence
   */
  async executeError(context: ErrorContext): Promise<ErrorContext> {
    let current = context;
    const reversed = Array.from(this.interceptors.values()).reverse();
    for (const interceptor of reversed) {
      if (interceptor.onError) {
        current = await interceptor.onError(current);
      }
    }
    return current;
  }
}

/**
 * Create an auth interceptor that adds Authorization header
 */
export function createAuthInterceptor(
  getToken: () => string | null,
  headerName = "Authorization",
  tokenPrefix = "Bearer"
): HttpInterceptor {
  return {
    id: "auth",
    onRequest: (context) => {
      const token = getToken();
      if (token) {
        context.headers[headerName] = `${tokenPrefix} ${token}`;
      }
      return context;
    },
  };
}

/**
 * Create a header injector interceptor
 */
export function createHeaderInterceptor(
  headers: Record<string, string | (() => string | null)>
): HttpInterceptor {
  return {
    id: "headers",
    onRequest: (context) => {
      for (const [key, value] of Object.entries(headers)) {
        const resolvedValue = typeof value === "function" ? value() : value;
        if (resolvedValue !== null && resolvedValue !== undefined) {
          context.headers[key] = resolvedValue;
        }
      }
      return context;
    },
  };
}

/**
 * Create a logging interceptor for debugging
 */
export function createLoggingInterceptor(
  options: {
    logRequests?: boolean;
    logResponses?: boolean;
    logErrors?: boolean;
    filter?: (url: string) => boolean;
  } = {}
): HttpInterceptor {
  const { logRequests = true, logResponses = true, logErrors = true, filter } = options;

  return {
    id: "logging",
    onRequest: (context) => {
      if (logRequests && (!filter || filter(context.url))) {
        console.log(`[HTTP] ${context.method} ${context.url}`);
      }
      return context;
    },
    onResponse: (context) => {
      if (logResponses && (!filter || filter(context.request.url))) {
        console.log(`[HTTP] Response ${context.response.status} ${context.request.url}`);
      }
      return context;
    },
    onError: (context) => {
      if (logErrors && (!filter || filter(context.request.url))) {
        console.error(`[HTTP] Error ${context.request.method} ${context.request.url}`, context.error);
      }
      return context;
    },
  };
}
