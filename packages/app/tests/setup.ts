/**
 * MSW Server Setup for Integration Tests
 * 
 * This file sets up the Mock Service Worker for API mocking in tests.
 * MSW intercepts requests at the network level, allowing realistic API testing.
 */

import { beforeAll, afterEach, afterAll, vi } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

/**
 * Default API response wrapper for Eden Treaty
 * Eden Treaty expects: { success: true, data: T }
 */
export function createApiResponse<T>(data: T, success = true) {
	return HttpResponse.json({ success, data });
}

/**
 * Default API error response
 */
export function createApiError(message: string) {
	return HttpResponse.json({ success: false, error: message }, { status: 400 });
}

// Import handlers - will be populated as we add more API mocks
import { handlers } from "./mocks/handlers";

// Create MSW server instance
export const server = setupServer(...handlers);

beforeAll(() => {
	// Start MSW server
	server.listen({ onUnhandledRequest: "bypass" });
});

afterEach(() => {
	// Reset handlers between tests to avoid pollution
	server.resetHandlers();
});

afterAll(() => {
	// Close server after all tests
	server.close();
});

/**
 * Utility to wait for a condition with timeout
 */
export async function waitFor(
	condition: () => boolean,
	timeout = 1000
): Promise<void> {
	return new Promise((resolve, reject) => {
		const start = Date.now();
		const check = () => {
			if (condition()) {
				resolve();
			} else if (Date.now() - start > timeout) {
				reject(new Error(`Timeout waiting for condition`));
			} else {
				setTimeout(check, 10);
			}
		};
		check();
	});
}

/**
 * Utility to delay execution (useful for testing loading states)
 */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
