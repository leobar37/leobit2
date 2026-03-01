/**
 * Auth Mock Utilities for Better Auth
 * 
 * Mock utilities for testing authenticated components.
 * Provides mock session and user data for protected routes.
 */

import { vi } from "vitest";

/**
 * Mock user data for tests
 */
export const mockUser = {
	id: "user-1",
	name: "Test User",
	email: "test@example.com",
	emailVerified: true,
	image: "https://example.com/avatar.jpg",
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
};

/**
 * Mock session data for tests
 */
export const mockSession = {
	id: "session-1",
	userId: "user-1",
	expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
	token: "mock-jwt-token",
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
};

/**
 * Mock active organization for multi-tenant tests
 */
export const mockActiveOrganization = {
	id: "org-1",
	name: "Test Business",
	slug: "test-business",
	ownerId: "user-1",
	createdAt: new Date().toISOString(),
};

/**
 * Creates a mock session response (as returned by Better Auth)
 */
export function createMockSession() {
	return {
		user: mockUser,
		session: mockSession,
		expiresAt: mockSession.expiresAt,
	};
}

/**
 * Mock hook return values for useSession
 */
export const mockUseSessionLoading = {
	data: null,
	isLoading: true,
	error: null,
};

/**
 * Authenticated session state
 */
export const mockUseSessionAuthenticated = {
	data: createMockSession(),
	isLoading: false,
	error: null,
};

/**
 * No session state
 */
export const mockUseSessionUnauthenticated = {
	data: null,
	isLoading: false,
	error: null,
};

/**
 * Setup all auth mocks for a test
 * 
 * Usage:
 * ```tsx
 * import { setupAuthMocks } from "./tests/utils/auth-mock";
 * 
 * describe("MyComponent", () => {
 *   setupAuthMocks();
 *   // Now useSession returns authenticated state
 * });
 * ```
 */
export function setupAuthMocks(
	type: "authenticated" | "unauthenticated" | "loading" = "authenticated"
) {
	const sessionState =
		type === "authenticated"
			? mockUseSessionAuthenticated
			: type === "loading"
			? mockUseSessionLoading
			: mockUseSessionUnauthenticated;

	vi.mock("better-auth/react", () => ({
		useSession: () => sessionState,
		useAuth: () => ({
			signOut: vi.fn().mockResolvedValue(undefined),
		}),
	}));

	vi.mock("~/lib/auth-client", () => ({
		authClient: {
			getSession: vi.fn().mockResolvedValue(
				type === "authenticated" ? createMockSession() : null
			),
			signOut: vi.fn().mockResolvedValue(undefined),
		},
	}));
}

/**
 * Setup authenticated state for a test
 */
export function setupAuthenticated() {
	setupAuthMocks("authenticated");
}

/**
 * Setup unauthenticated state for a test
 */
export function setupUnauthenticated() {
	setupAuthMocks("unauthenticated");
}

/**
 * Setup loading state for a test
 */
export function setupAuthLoading() {
	setupAuthMocks("loading");
}
