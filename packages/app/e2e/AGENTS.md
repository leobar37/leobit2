# AGENTS.md - E2E Testing

> **Playwright E2E testing patterns for Avileo**

## Overview

This directory contains end-to-end tests using Playwright. Tests verify user flows work correctly across the full application stack.

## Directory Structure

```
e2e/
├── tests/              # Test specifications
│   ├── auth.spec.ts   # Authentication flows
│   ├── sales.spec.ts  # Sales/POS workflows
│   └── ...
├── page-objects/       # Page Object Models
│   ├── login.page.ts
│   ├── sales.page.ts
│   └── ...
├── fixtures/          # Test data and utilities
├── specs/             # Additional test specs
└── playwright.config.ts # Playwright configuration
```

## Testing Patterns

### Page Object Model

```typescript
// page-objects/login.page.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.page.fill('[name="email"]', email);
    await this.page.fill('[name="password"]', password);
    await this.page.click('button[type="submit"]');
  }
}
```

### Test Structure

```typescript
// tests/auth.spec.ts
import { test, expect } from "@playwright/test";
import { LoginPage } from "../page-objects/login.page";

test.describe("Authentication", () => {
  test("user can login", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("test@example.com", "password");
    
    await expect(page).toHaveURL("/dashboard");
  });
});
```

## Test Commands

```bash
# Run E2E tests
bun run test:e2e

# Run with headed browser
bun run test:e2e:headed

# Run with UI mode
bun run test:e2e:ui

# Debug mode
bun run test:e2e:debug

# With mock server (MSW)
bun run test:e2e:msw
```

## Configuration Files

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Main Playwright config |
| `playwright.msw.config.ts` | Config with MSW mocking |

## Critical Patterns

### 1. Use data-testid for selectors
```tsx
<button data-testid="submit-login">Login</button>
```

```typescript
await page.click('[data-testid="submit-login"]');
```

### 2. Handle offline scenarios
Tests should verify offline functionality works correctly.

### 3. Mobile viewport testing
Primary viewport: 390x844 (iPhone 14)

## Related Documentation

- [App AGENTS.md](../../AGENTS.md) - Frontend overview
- Root `package.json` - Test scripts
