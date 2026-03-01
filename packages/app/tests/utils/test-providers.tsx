/**
 * Test Providers Wrapper
 * 
 * Common provider setup for integration tests.
 * Wraps components with required context providers.
 */

import React, { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";

/**
 * Default QueryClient config for tests
 */
export function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 0,
			},
			mutations: {
				retry: false,
			},
		},
	});
}

/**
 * TestProviders Props
 */
interface TestProvidersProps {
	children: ReactNode;
	queryClient?: QueryClient;
	initialEntries?: string[];
}

/**
 * Common provider wrapper for integration tests
 * 
 * Usage:
 * ```tsx
 * import { render, screen } from "@testing-library/react";
 * import { TestProviders } from "./tests/utils/test-providers";
 * 
 * render(
 *   <TestProviders>
 *     <MyComponent />
 *   </TestProviders>
 * );
 * ```
 */
export function TestProviders({
	children,
	queryClient = createTestQueryClient(),
	initialEntries = ["/"],
}: TestProvidersProps) {
	return (
		<MemoryRouter initialEntries={initialEntries}>
			<QueryClientProvider client={queryClient}>
				{children}
			</QueryClientProvider>
		</MemoryRouter>
	);
}

/**
 * Custom render function that includes providers
 * 
 * Usage:
 * ```tsx
 * import { renderWithProviders, screen } from "./tests/utils/test-providers";
 * 
 * renderWithProviders(<MyComponent />);
 * ```
 */
import { render } from "@testing-library/react";

export function renderWithProviders(
	ui: React.ReactElement,
	options?: {
		queryClient?: QueryClient;
		initialEntries?: string[];
	}
) {
	const { queryClient = createTestQueryClient(), initialEntries = ["/"] } = options || {};
	
	return {
		...render(ui, {
			wrapper: ({ children }) => (
				<TestProviders queryClient={queryClient} initialEntries={initialEntries}>
					{children}
				</TestProviders>
			),
		}),
		queryClient,
	};
}

/**
 * Wait for component to finish loading
 * 
 * Usage:
 * ```tsx
 * await waitForLoading();
 * ```
 */
export async function waitForLoading() {
	// Small delay to allow queries to resolve
	await new Promise((resolve) => setTimeout(resolve, 100));
}
