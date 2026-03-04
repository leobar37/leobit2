import { config } from "dotenv";
import { beforeAll, afterAll } from "vitest";

// Load test environment variables
config({ path: ".env.test" });

// Validate required environment variables
const requiredEnvVars = ["DATABASE_URL", "BETTER_AUTH_SECRET"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(
      `Missing required environment variable: ${envVar}. ` +
        `Make sure .env.test file exists and is properly configured.`
    );
  }
}

// Verify we're using test database
const databaseUrl = process.env.DATABASE_URL!;
if (
  !databaseUrl.includes("test") &&
  !databaseUrl.includes("_test_") &&
  !process.env.FORCE_TEST_DB
) {
  throw new Error(
    "DATABASE_URL does not appear to be a test database. " +
      "Test databases should include 'test' in the name. " +
      "Set FORCE_TEST_DB=1 to override this check."
  );
}

beforeAll(async () => {
  // Global setup before all tests
  console.log("🧪 Starting E2E tests with test database");
});

afterAll(async () => {
  // Global teardown after all tests
  console.log("✅ E2E tests completed");
});
