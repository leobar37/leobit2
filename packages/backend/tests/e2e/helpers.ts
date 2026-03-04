/**
 * Make a request to the Elysia app in test mode
 */
export async function makeRequest(
  appInstance: { handle: (request: Request) => Promise<Response> },
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    headers?: Record<string, string>;
    body?: unknown;
  } = {}
): Promise<Response> {
  const { method = "GET", headers = {}, body } = options;

  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && method !== "GET") {
    requestInit.body = JSON.stringify(body);
  }

  const request = new Request(`http://localhost${path}`, requestInit);
  return appInstance.handle(request);
}

/**
 * Parse JSON response with error handling
 */
export async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Failed to parse JSON response: ${text}`);
  }
}

/**
 * Create authorization header with Bearer token
 */
export function authHeader(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Create headers with business ID for multi-tenant requests
 */
export function withBusinessId(
  headers: Record<string, string>,
  businessId: string
): Record<string, string> {
  return {
    ...headers,
    "x-business-id": businessId,
  };
}

/**
 * Test user credentials structure
 */
export interface TestUser {
  email: string;
  password: string;
  name: string;
}

/**
 * Default test users for E2E tests
 */
export const testUsers: Record<string, TestUser> = {
  admin: {
    email: "test-admin@avileo.com",
    password: "TestPassword123!",
    name: "Test Admin",
  },
  vendor: {
    email: "test-vendor@avileo.com",
    password: "TestPassword123!",
    name: "Test Vendor",
  },
};

/**
 * Type for API response structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
