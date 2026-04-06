import type { Route } from "@playwright/test";

// ============================================================================
// Response Types (match backend schema)
// ============================================================================

export interface MockUser {
  id: string;
  email: string;
  name: string;
  emailVerified?: boolean;
  image?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MockSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
}

export interface MockSignUpResponse {
  user: MockUser;
  session: MockSession;
}

export interface MockInvitationData {
  name: string;
  email: string;
  salesPoint?: string;
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: "user-new",
    email: "newuser@avileo.com",
    name: "New User",
    emailVerified: false,
    ...overrides,
  };
}

export function createMockSession(overrides: Partial<MockSession> = {}): MockSession {
  return {
    id: "session-new",
    userId: "user-new",
    token: "mock-jwt-signup",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    ...overrides,
  };
}

export function createMockSignUpResponse(
  userOverrides: Partial<MockUser> = {},
): MockSignUpResponse {
  const user = createMockUser(userOverrides);
  return {
    user,
    session: createMockSession({ userId: user.id }),
  };
}

export function createMockInvitationData(
  overrides: Partial<MockInvitationData> = {},
): MockInvitationData {
  return {
    name: "Negocio Mock",
    email: "admin@mock.com",
    salesPoint: "Punto 1",
    ...overrides,
  };
}

// ============================================================================
// JSON Response Helpers
// ============================================================================

export async function fulfillJSON(
  route: Route,
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
    headers,
  });
}
