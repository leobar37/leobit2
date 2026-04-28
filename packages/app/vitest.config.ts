import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./vitest.setup.ts", "./tests/setup.ts"],
		exclude: [
			"**/.react-router/**",
			"**/node_modules/**",
			"**/dist/**",
			"**/build/**",
			"**/coverage/**",
			"**/e2e/**",
			"app/lib/auth-client.test.ts",
			"app/hooks/use-auth.test.ts",
			"tests/integration/hooks/use-customers.integration.spec.tsx",
			"tests/integration/hooks/use-products.integration.spec.tsx",
			"tests/integration/hooks/use-sales.integration.spec.tsx",
		],
	},
});
