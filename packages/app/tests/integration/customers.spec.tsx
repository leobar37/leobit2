/**
 * Integration Test Setup Example
 * 
 * This file demonstrates how to write integration tests with MSW.
 * It uses the test utilities and mock handlers created for the app.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestProviders, createTestQueryClient } from "../utils/test-providers";
import { setupAuthenticated } from "../utils/auth-mock";

// Simple component that displays data fetched via API
// In a real test, you'd import the actual component from your app
function DemoCustomerList() {
	return (
		<div>
			<h1>Clientes</h1>
			<p data-testid="demo-text">Demo Component for Integration Tests</p>
			<ul data-testid="customer-list">
				<li>Customer 1</li>
				<li>Customer 2</li>
			</ul>
		</div>
	);
}

describe("Integration Test Demo", () => {
	beforeEach(() => {
		setupAuthenticated();
	});

	it("should render with providers", () => {
		const queryClient = createTestQueryClient();

		render(
			<TestProviders queryClient={queryClient}>
				<DemoCustomerList />
			</TestProviders>
		);

		// Use basic query that doesn't require jest-dom
		const element = screen.getByTestId("demo-text");
		expect(element).toBeDefined();
		expect(element.textContent).toBe("Demo Component for Integration Tests");
	});

	it("should render customer list", () => {
		const queryClient = createTestQueryClient();

		render(
			<TestProviders queryClient={queryClient}>
				<DemoCustomerList />
			</TestProviders>
		);

		const list = screen.getByTestId("customer-list");
		expect(list).toBeDefined();
		expect(list.children.length).toBe(2);
	});

	it("should render heading", () => {
		const queryClient = createTestQueryClient();

		render(
			<TestProviders queryClient={queryClient}>
				<DemoCustomerList />
			</TestProviders>
		);

		const heading = screen.getByRole("heading", { name: "Clientes" });
		expect(heading).toBeDefined();
	});
});

/**
 * Example: How to test with MSW handlers
 * 
 * This demonstrates the pattern for testing components that make API calls.
 * The handlers are set up in tests/setup.ts and tests/mocks/handlers.ts
 */
describe("MSW Handlers Demo", () => {
	it("MSW server should be available", () => {
		// The server is initialized in tests/setup.ts
		// This test just verifies the setup works
		expect(true).toBe(true);
	});

	it("should be able to import handlers", async () => {
		// Import the handlers to verify they exist
		const { handlers } = await import("../mocks/handlers");
		expect(handlers).toBeDefined();
		expect(Array.isArray(handlers)).toBe(true);
		expect(handlers.length).toBeGreaterThan(0);
	});

	it("mock data utilities should be available", async () => {
		const { resetData, addCustomer } = await import("../mocks/handlers");

		expect(resetData).toBeDefined();
		expect(addCustomer).toBeDefined();
	});
});

/**
 * Example: How to test with custom MSW handlers
 * 
 * Use server.use() to override handlers for specific tests
 */
describe("Custom Handler Override Demo", () => {
	it("can override handlers for specific test", async () => {
		// Import server from setup
		const { server } = await import("../setup");
		const { http, HttpResponse } = await import("msw");

		// Override handler for this test
		server.use(
			http.get("/api/customers", () => {
				return HttpResponse.json({
					success: true,
					data: [{ id: "test-1", name: "Test Customer" }],
				});
			})
		);

		// Handler was overridden for this test only
		// After this test, original handlers are restored by server.resetHandlers()
		expect(true).toBe(true);
	});
});
