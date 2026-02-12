# Code Conventions - Avileo

> **Code style guidelines, TypeScript configuration, and project conventions.**

---

## TypeScript Configuration

- **Target**: ES2022
- **Module**: ESM only (`"type": "module"`)
- **Strict mode**: Enabled in all packages
- **JSX**: `react-jsx` (frontend)

---

## Import Paths

### Backend
Use **relative imports** (NO path aliases):
```typescript
import { db } from "./lib/db";
import { users } from "../db/schema/users";
```

### Frontend
Use **~/*** or **@/*** for app/ imports:
```typescript
import { Component } from "~/components/Button";
import { Button } from "@/components/ui/button";
```

### Cross-package
Use **workspace protocol**:
```typescript
import type { ApiResponse } from "@avileo/shared";
```

---

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| **Files** | kebab-case.ts | `user-profile.ts` |
| **Components** | PascalCase.tsx | `UserCard.tsx` |
| **Functions** | camelCase | `getUserById` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| **Types/Interfaces** | PascalCase | `UserProfile`, `ApiResponse` |
| **Database tables** | snake_case | `user_profiles`, `business_users` |

---

## Error Handling

### Backend
Return structured error responses:
```typescript
return new Response(
  JSON.stringify({ success: false, error: "Message" }),
  { status: 400, headers: { "Content-Type": "application/json" } }
);
```

### Frontend
Use ErrorBoundary (see root.tsx pattern):
```typescript
// Handle route errors with isRouteErrorResponse
import { isRouteErrorResponse } from "react-router";
```

---

## API Response Pattern

Standard response shape:
```typescript
import type { ApiResponse } from "@avileo/shared";

const response: ApiResponse<User> = {
  success: true,
  data: user,
  error?: string
};
```

---

## Architecture Patterns

### Backend (ElysiaJS)
```typescript
// Create routes in packages/backend/src/
// Use Elysia plugin pattern for modularity
// Access db via: import { db } from "./lib/db"
// Use relative imports (no path aliases)
```

### Frontend (React Router v7)
```typescript
// Routes: packages/app/app/routes/
// Use file-based routing (_index.tsx, about.tsx)
// Types: import type { Route } from "./+types/filename"
// SSR: Disabled (SPA mode)
```

### Database (Drizzle + Neon)
```typescript
// Schema location: packages/backend/src/db/schema/
// Drizzle config: packages/backend/drizzle.config.ts
// Connection: packages/backend/src/lib/db.ts
// Always use sslmode=require for Neon
```

#### Schema Structure
```
packages/backend/src/db/schema/
├── enums.ts           # PostgreSQL enums
├── user-profiles.ts   # Extends Better Auth
├── businesses.ts      # Multi-tenancy
├── customers.ts       # Offline sync support
├── sales.ts           # Sales + items
├── payments.ts        # Abonos
├── inventory.ts       # Products + stock
├── config.ts          # System configuration
├── relations.ts       # Drizzle relations
└── index.ts           # Centralized exports
```

#### Key Patterns
- **Better Auth**: Tables `user`, `session`, `account` managed by Better Auth
- **User Profiles**: `user_profiles` extends Better Auth with personal data
- **Multi-tenancy**: `business_users` links users to businesses
- **Offline-first**: Tables have `sync_status` + `sync_attempts`
- **FK Pattern**: Operational FKs point to `business_users.id`

---

## Progress Tracking

Track completed features in `@progress.md`:

### When to Update
- **After completing a module** → Mark as completed with date
- **Before starting new work** → Add new section with status
- **When switching context** → Update "Currently Working On"

### Status Conventions
```markdown
Status: Completed  - Feature fully implemented and tested
Status: In Progress - Currently being worked on
Status: Blocked    - Waiting on dependencies/decisions
Status: Planned    - Next in queue
```

---

## Common Tasks

```bash
# Add API route
touch packages/backend/src/routes/users.ts

# Add frontend route
touch packages/app/app/routes/users.tsx

# Add shared type
# Edit packages/shared/src/index.ts → export type
# Then rebuild: cd packages/shared && bun run build

# Install dependency to single package
cd packages/app && bun add lodash

# Install dependency to all packages (root)
bun add -d typescript
```

---

## Environment Variables

```bash
# Required in .env
database_url="postgresql://user:pass@host.neon.tech/db?sslmode=require"
JWT_SECRET="min-32-characters-secret-key"
PORT=3000                    # Backend port
FRONTEND_URL="http://localhost:5173"  # CORS origin
```
