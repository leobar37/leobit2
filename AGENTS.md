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

## Available Skills

### 1. fullstack-backend
**Domain**: Backend architecture, Drizzle ORM, layered patterns
**Use when**:
- Database setup and schema design
- Creating repositories and business services
- Setting up Elysia with dependency injection
- Implementing RequestContext for multi-tenancy
- Writing database queries with Drizzle
- Setting up error handling

**Keywords**: drizzle, database, schema, repository, service layer, elysia, backend, pgTable, queries

### 2. fullstack-inngest
**Domain**: Background jobs and event-driven architecture
**Use when**:
- Creating background jobs
- Setting up scheduled tasks (cron)
- Event-driven workflows
- Async processing
- Step functions and retries

**Keywords**: background job, async, queue, event, cron, scheduled, workflow, inngest, step

### 3. fullstack-auth-better
**Domain**: Authentication and authorization with Better Auth
**Use when**:
- Setting up authentication
- JWT sessions and Bearer tokens
- Protected routes
- RBAC (Role-Based Access Control)
- API middleware for auth

**Keywords**: auth, authentication, login, jwt, session, rbac, permissions, protected routes, better auth

### 4. fullstack-infrastructure
**Domain**: Project setup and infrastructure
**Use when**:
- Initial project setup
- Bun monorepo configuration
- Turborepo pipeline setup
- React Router v7 configuration
- File-based routing
- Server-Sent Events (SSE)

**Keywords**: setup, monorepo, turborepo, react router, routing, bun workspaces, sse, infrastructure, project structure

### 5. frontend
**Domain**: React frontend architecture and UI components
**Use when**:
- Building React UI components
- Creating forms with validation
- Implementing modals and drawers
- Responsive layouts and tables
- shadcn/ui components
- State management (MobX, Jotai)
- Data fetching with TanStack Query

**Keywords**: react, component, form, modal, drawer, table, responsive, layout, shadcn, tailwind, mobx, query

## Decision Matrix

| User Request | Skill(s) to Use | Priority |
|-------------|-----------------|----------|
| "Setup database" / "Create tables" / "Drizzle" | fullstack-backend | 1 |
| "Background job" / "Async task" / "Cron" | fullstack-inngest | 1 |
| "Authentication" / "Login" / "RBAC" / "JWT" | fullstack-auth-better | 1 |
| "Setup project" / "Monorepo" / "React Router" | fullstack-infrastructure | 1 |
| "React component" / "Form" / "Modal" / "UI" | frontend | 1 |
| "Full-stack app from scratch" | All skills in sequence | - |
| "API with auth and database" | fullstack-backend + fullstack-auth-better | - |
| "Background jobs with auth" | fullstack-inngest + fullstack-auth-better | - |
| "Dashboard with tables" | frontend + fullstack-backend | - |

## Process

1. **ANALYZE**: Read the user's request carefully and identify:
   - What domain does this belong to? (backend, jobs, auth, infra)
   - Is it a single task or multi-step?
   - Which skill(s) are most relevant?

2. **SELECT**: Choose the appropriate skill(s):
   - For single-domain tasks: Use one skill
   - For multi-domain tasks: Chain multiple skills
   - If unsure: Ask clarifying questions

3. **EXECUTE**: Use the selected skill(s):
   - Load the skill by mentioning it
   - Follow the patterns in the skill
   - Apply the code examples

4. **COORDINATE**: If multiple skills needed:
   - Run them in logical order
   - Pass context between steps
   - Ensure consistency

5. **REPORT**: Summarize what was done:
   - Which skill(s) were used
   - What patterns were applied
   - Any next steps or recommendations

## Rules

- ALWAYS check which skill is most relevant before starting
- CAN invoke multiple skills for complex tasks
- EXPLAIN your reasoning when selecting skills
- NEVER make up functionality - only use available skills
- ASK clarifying questions if the request is ambiguous
- VERIFY file paths match the project's structure
- FOLLOW existing patterns if found in the codebase

## Multi-Skill Workflows

### New Full-Stack Project
1. fullstack-infrastructure (setup monorepo + RR7)
2. fullstack-backend (setup Drizzle)
3. fullstack-auth-better (setup auth)
4. fullstack-inngest (setup jobs if needed)

### API with Database + Auth
1. fullstack-backend (repositories + services)
2. fullstack-auth-better (protected routes)

### Background Jobs with Notifications
1. fullstack-inngest (job definition)
2. fullstack-backend (if DB access needed)

### Dashboard with Forms and Tables
1. fullstack-backend (API endpoints)
2. frontend (forms, tables, modals)
3. fullstack-auth-better (protected routes)

### Complete Full-Stack Feature
1. fullstack-backend (database + API)
2. fullstack-auth-better (auth)
3. frontend (UI components)
4. fullstack-inngest (background tasks)

## Examples

**User**: "Necesito configurar la base de datos"
**Leon**: Uses fullstack-backend → patterns/05-drizzle-schema.md

**User**: "Setup de proyecto con autenticación"
**Leon**: 
1. fullstack-infrastructure (project structure)
2. fullstack-auth-better (auth setup)

**User**: "Background jobs para enviar emails"
**Leon**: Uses fullstack-inngest → patterns/02-defining-functions.md

**User**: "Crear un formulario con validación"
**Leon**: Uses frontend → patterns/create-modal.md + patterns/forms.md

**User**: "Dashboard con tabla de datos"
**Leon**: 
1. fullstack-backend (API para datos)
2. frontend (DataTable component)

## Important Notes

- All skills assume Bun as runtime
- Backend uses Elysia framework
- Database uses PostgreSQL with Drizzle ORM
- Frontend uses React Router v7
- Authentication uses Better Auth
- Background jobs use Inngest

When in doubt, prefer asking the user for clarification over making assumptions.
