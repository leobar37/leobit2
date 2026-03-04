# Backend E2E Tests

This directory contains end-to-end tests for the Avileo backend API using Vitest.

## Setup

### 1. Install Dependencies

```bash
cd packages/backend
bun install
```

### 2. Configure Test Environment

Create a `.env.test` file (already provided) with your Neon test database:

```bash
# .env.test
DATABASE_URL=postgresql://user:password@host.neon.tech/database_test?sslmode=require
BETTER_AUTH_SECRET=your-test-secret
PORT=3001
NODE_ENV=test
```

**Important**: Use a separate test database, NOT production!

### 3. Run Migrations on Test Database

```bash
# Set environment to test and run migrations
export DATABASE_URL=$(grep DATABASE_URL .env.test | cut -d '=' -f2)
bun run db:migrate
```

## Running Tests

### Run All E2E Tests

```bash
bun run test:e2e
```

### Run E2E Tests in Watch Mode

```bash
bun run test:e2e:watch
```

### Run All Tests (Unit + E2E)

```bash
bun run test:run
```

### Run with UI

```bash
bun run test:ui
```

## Test Structure

```
tests/
├── e2e/
│   ├── setup.ts          # Global test setup, loads .env.test
│   ├── health.test.ts    # Example: Health check tests
│   └── ...               # Add more test files here
├── helpers.ts            # Test utilities and helpers
```

## Writing E2E Tests

### Basic Test Pattern

```typescript
import { describe, it, expect } from "vitest";
import { app } from "../../src/index";
import { makeRequest, parseJson } from "../helpers";
import type { ApiResponse } from "../helpers";

describe("My API", () => {
  it("should do something", async () => {
    const response = await makeRequest(app, "/my-endpoint");
    expect(response.status).toBe(200);

    const body = await parseJson<ApiResponse<MyData>>(response);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });
});
```

### Testing Protected Routes

```typescript
import { authHeader, withBusinessId } from "../helpers";

const response = await makeRequest(app, "/customers", {
  headers: withBusinessId(
    authHeader("your-jwt-token"),
    "business-id-123"
  ),
});
```

### Testing POST Requests

```typescript
const response = await makeRequest(app, "/customers", {
  method: "POST",
  headers: authHeader("your-jwt-token"),
  body: {
    name: "John Doe",
    phone: "+1234567890",
  },
});
```

## Test Helpers

### `makeRequest(app, path, options)`

Makes a request to the Elysia app in test mode.

### `parseJson<T>(response)`

Parses the JSON response with proper typing.

### `authHeader(token)`

Creates an Authorization header with Bearer token.

### `withBusinessId(headers, businessId)`

Adds the `x-business-id` header for multi-tenant requests.

## Environment Variables

The test setup automatically:

1. Loads `.env.test` file
2. Validates required environment variables
3. Verifies the database URL contains "test" (safety check)
4. Sets up global before/after hooks

## Database Safety

The test setup includes a safety check that ensures:

- The `DATABASE_URL` contains "test" in the database name
- This prevents accidentally running tests against production

To override this check (not recommended):

```bash
FORCE_TEST_DB=1 bun run test:e2e
```

## CI/CD Integration

For CI environments, ensure you set:

```bash
DATABASE_URL=your-ci-test-database-url
BETTER_AUTH_SECRET=your-ci-secret
NODE_ENV=test
```

## Troubleshooting

### "Cannot find module 'vitest'"

Run `bun install` to install the new dependencies.

### "Missing required environment variable"

Ensure `.env.test` exists and contains all required variables.

### "DATABASE_URL does not appear to be a test database"

Your database URL should include "test" in the database name, e.g., `mydb_test` or `test_mydb`.
