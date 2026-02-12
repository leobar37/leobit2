# AGENTS.md

## Project Overview

Offline-first chicken sales management system. Monorepo with Bun + Turborepo.

**Stack**: Bun 1.1.38+, ElysiaJS, Drizzle ORM, Neon PostgreSQL, React Router v7, TanStack

## Package Structure

| Package | Path | Description |
|---------|------|-------------|
| `@avileo/app` | `packages/app/` | React Router v7 frontend |
| `@avileo/backend` | `packages/backend/` | ElysiaJS + Drizzle backend |
| `@avileo/shared` | `packages/shared/` | Shared types & utilities |

## Build Commands

```bash
# Root level (runs via turbo)
bun run dev          # Start all dev servers
bun run build        # Build all packages
bun run db:migrate   # Run database migrations
bun run db:generate  # Generate Drizzle migrations

# Individual packages
cd packages/app && bun run dev          # Frontend only (port 5173)
cd packages/app && bun run build        # Build for production
cd packages/app && bun run typecheck    # Type check with tsc
cd packages/backend && bun run dev      # Backend only (port 3000)
cd packages/backend && bun run build    # Build for production
cd packages/shared && bun run build     # Build shared package
```

## Database Commands

```bash
cd packages/backend
bun run db:generate  # Generate migration files
drizzle-kit generate # Alternative
bun run db:migrate   # Run pending migrations
drizzle-kit migrate  # Alternative
bun run db:push      # Push schema changes (dev only)
```

## Code Style Guidelines

### TypeScript Configuration
- **Target**: ES2022
- **Module**: ESM only (`"type": "module"`)
- **Strict mode**: Enabled in all packages
- **JSX**: `react-jsx` (frontend)

### Import Paths

```typescript
// Backend: use relative imports (NO path aliases)
import { db } from "./lib/db";
import { users } from "../db/schema/users";

// Frontend: use ~/* or @/* for app/ imports
import { Component } from "~/components/Button";

// Cross-package: use workspace protocol
import type { ApiResponse } from "@avileo/shared";
```

### Naming Conventions
- **Files**: kebab-case.ts, camelCase.tsx for components
- **Components**: PascalCase (e.g., `UserCard.tsx`)
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE or camelCase
- **Types/Interfaces**: PascalCase with descriptive names
- **Database tables**: snake_case in Drizzle schema

### Error Handling

```typescript
// Backend: Return structured error responses
return new Response(
  JSON.stringify({ success: false, error: "Message" }),
  { status: 400, headers: { "Content-Type": "application/json" } }
);

// Frontend: Use ErrorBoundary (see root.tsx pattern)
// Handle route errors with isRouteErrorResponse
```

### API Response Pattern

```typescript
import type { ApiResponse } from "@avileo/shared";

// Standard response shape
const response: ApiResponse<User> = {
  success: true,
  data: user,
  error?: string
};
```

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
├── enums.ts           # PostgreSQL enums (user_role, sync_status, etc.)
├── user-profiles.ts   # Extends Better Auth (personal data only)
├── businesses.ts      # Multi-tenancy: businesses + business_users
├── customers.ts       # Clients with offline sync support
├── sales.ts           # Sales + sale_items with sync_status
├── payments.ts        # Abonos (debt payments) with sync_status
├── inventory.ts       # Products + inventory + distribuciones
├── config.ts          # System configuration (single row)
├── relations.ts       # Drizzle relations definitions
└── index.ts           # Centralized exports
```

#### Key Patterns
- **Better Auth**: Tables `user`, `session`, `account` managed by Better Auth
- **User Profiles**: `user_profiles` extends Better Auth with personal data (dni, phone, etc.)
- **Multi-tenancy**: `business_users` links users to businesses with role/sales_point per business
- **Offline-first**: Tables `customers`, `sales`, `abonos` have `sync_status` + `sync_attempts`
- **FK Pattern**: All operational FKs point to `business_users.id` (not `user_profiles.id`)

#### Documentation
See `docs/technical/database.md` for full ER diagram and table specifications.

## UI/Screens Documentation

The project has comprehensive UI documentation in `docs/screens/`:

### Structure
| File | Description |
|------|-------------|
| `docs/screens/readme.md` | Overview of all screens |
| `docs/screens/mobile-vendedor.md` | 12 mobile screens for vendors |
| `docs/screens/desktop-admin.md` | 7 desktop screens for admin |
| `docs/screens/componentes-ui.md` | UI design system & components |
| `docs/screens/flujos-navegacion.md` | User flows & navigation |

### Interactive Prototypes
Located in `docs/app/src/`:
- `sections/Wireframes.tsx` - 19 interactive wireframes
- `sections/Screens.tsx` - Visual mockups
- `components/calculator/ChickenCalculator.tsx` - Working calculator demo
- `components/clients/ClientManagement.tsx` - Client management demo
- `components/catalog/ProductCatalog.tsx` - Product catalog demo

### Key UI Patterns
- **Mobile-first design** (320px-428px viewport)
- **Offline-first** - All vendor screens work 100% offline
- **Bottom navigation** on mobile (4 items)
- **Sidebar navigation** on desktop
- **Orange (#f97316)** as primary color
- **Sync status indicators** throughout the app

### Shared Package
```typescript
// Export from: packages/shared/src/index.ts
// Build: tsup generates dist/index.js + .d.ts
// Use for: types, utilities, constants shared between fe/be
```

## Environment Variables

```bash
# Required in .env
database_url="postgresql://user:pass@host.neon.tech/db?sslmode=require"
JWT_SECRET="min-32-characters-secret-key"
PORT=3000                    # Backend port (default: 3000)
FRONTEND_URL="http://localhost:5173"  # CORS origin
```

## Available Skills

When delegating tasks, load relevant skills:

- `skill(name="bun-elysia")` - Backend patterns with ElysiaJS
- `skill(name="frontend")` - React/TanStack patterns
- `skill(name="fullstack-infrastructure")` - Monorepo patterns
- `skill(name="fullstack-backend")` - Layered backend architecture
- `skill(name="fullstack-auth-better")` - Better Auth integration

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

## Progress Tracking (@progress.md)

The `@progress.md` file tracks completed features and current work.

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

### Workflow Integration
1. **Start of session** → Read `@progress.md` to understand current state
2. **During work** → Update "Currently Working On" section
3. **End of module** → Move to "Completed" with summary
4. **Planning next** → Add items to "Próximos Pasos"

### Example Update Pattern
```markdown
### Módulo X: Feature Name 
**Status:** In Progress
**Started:** Feb 11, 2026

#### Subtask A
- [x] Part 1
- [ ] Part 2 (working on this)
- [ ] Part 3
```
