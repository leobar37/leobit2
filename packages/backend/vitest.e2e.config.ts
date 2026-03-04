import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "e2e",
    environment: "node",
    globals: true,
    setupFiles: ["./tests/e2e/setup.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.react-router/**",
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
  },
});
