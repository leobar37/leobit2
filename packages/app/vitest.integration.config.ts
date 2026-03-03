import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Vitest Configuration for Integration Tests
 *
 * Runs tests in tests/integration/ directory with MSW mocking.
 */

export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	test: {
		name: "integration",
		environment: "jsdom",
		globals: true,
		setupFiles: ["./vitest.setup.ts", "./tests/setup.ts"],
		include: ["tests/integration/**/*.spec.ts(x)"],
		exclude: [
			"**/.react-router/**",
			"**/node_modules/**",
			"**/dist/**",
			"**/build/**",
			"**/coverage/**",
			"tests/e2e/**",
		],
		// Longer timeout for integration tests
		testTimeout: 10000,
		// Retry flaky tests once
		retry: 1,
	},
});
