---
name: expect
description: |
  Browser testing skill using Expect - tests your agent's code in a real browser with Playwright.
  Automatically reads git changes, generates test plans, and runs them with real user sessions.
  Use when: fixing UI bugs, testing forms, validating sales flows, checking mobile responsiveness.
triggers:
  - "test the"
  - "test my"
  - "browser test"
  - "run expect"
  - "test in browser"
  - "check the UI"
---

# Expect - Browser Testing for Avileo

Expect tests code changes in a real browser using Playwright. It simulates real logged-in users to find UI issues, regressions, and bugs.

## Usage

### Via Claude Code (recommended)
```
/expect
```
This spawns a subagent that reads your git changes, generates a test plan, and runs it in a real browser.

### Via CLI
```bash
# Run Expect on current changes
expect

# Test specific flows
expect -m "Test the login flow and sales form submission"

# Run in CI mode (headless, auto-approve)
expect --ci
```

## Project-Specific Test Flows

Expect can run pre-configured flows defined in `.agents/skills/expect/flows/`:

```bash
# Admin flow: login → products → sales
expect -f admin-full-flow

# Vendor flow: login → new sale → payment
expect -f vendor-sale-flow

# Mobile flow: login → ventas → customer search
expect -f mobile-purchase-flow
```

## Test Scenarios

### TC-EXPECT-001: Login Flow
```
expect -m "Test login with demo credentials, verify redirect to dashboard"
```

### TC-EXPECT-002: Sales Form
```
expect -m "Create a new sale, select customer 'Juan Perez', add product 'Pollo entero', verify total calculation"
```

### TC-EXPECT-003: Mobile Responsive
```
expect -m "Test the ventas page on mobile viewport (375px), verify bottom nav is visible"
```

### TC-EXPECT-004: Offline Indicator
```
expect -m "Toggle airplane mode, verify offline indicator appears, check sales still work"
```

## Project Context

Avileo is an offline-first chicken sales management system:

- **Frontend**: React Router v7, React 19, Tailwind CSS
- **Mobile-first**: 320px-428px viewport
- **Primary color**: Orange (#f97316)
- **Auth**: Better Auth with JWT sessions
- **Offline**: PGlite local database

### Key Routes
| Route | Purpose |
|-------|---------|
| `/login` | User login |
| `/dashboard` | Main dashboard |
| `/clientes` | Customer list |
| `/ventas/nueva` | New sale (POS) |
| `/productos` | Product management |

### Test Users
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@avileo.com | admin123 |
| Vendor | vendedor@avileo.com | vendor123 |

## Prerequisites

1. **Start dev servers**:
   ```bash
   bun run dev
   ```

2. **Ensure Playwright is installed**:
   ```bash
   cd packages/app && bunx playwright install chromium
   ```

## Troubleshooting

### "No server running"
```bash
bun run dev
```

### "Cookie extraction failed"
Use `--no-cookies` flag:
```bash
expect --ci --no-cookies
```

### "Browser not found"
```bash
cd packages/app && bunx playwright install chromium
```

## Additional Resources

- [Expect GitHub](https://github.com/millionco/expect)
- [Expect Documentation](https://www.expect.dev/)
- [Playwright API](https://playwright.dev/docs/api/class-page)
