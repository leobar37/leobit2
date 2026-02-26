# AGENTS.md - Avileo Project Knowledge Base

> **Hierarchical knowledge base for AI agents. For detailed package docs, see package-level AGENTS.md files.**

## Project Overview

**Avileo (PollosPro)**: Offline-first chicken sales management system for mobile vendors.

| Aspect | Technology |
|--------|------------|
| **Runtime** | Bun 1.1.38+ |
| **Backend** | ElysiaJS + Drizzle ORM + PostgreSQL |
| **Frontend** | React Router v7 + React 19 + Vite |
| **Auth** | Better Auth (JWT) |
| **Offline** | IndexedDB + Electric SQL sync |
| **Monorepo** | Bun workspaces + Turbo |

## Monorepo Structure

```
packages/
├── app/              # React Router v7 frontend
├── backend/          # ElysiaJS API server
└── shared/           # Shared types (tsup build)
```

## Package Documentation Map

| Package | AGENTS.md | Focus |
|---------|-----------|-------|
| Root | This file | Project-wide conventions |
| `@avileo/backend` | `packages/backend/AGENTS.md` | ElysiaJS, Drizzle, RequestContext |
| `@avileo/app` | `packages/app/AGENTS.md` | React Router v7, TanStack, offline-first |
| `app/components` | `packages/app/app/components/AGENTS.md` | UI primitives, forms, shadcn/ui |
| `app/lib/db` | `packages/app/app/lib/db/AGENTS.md` | Offline data layer, sync engine |
| `app/routes` | `packages/app/app/routes/AGENTS.md` | File-based routing conventions |
| `app/hooks` | `packages/app/app/hooks/AGENTS.md` | Custom React hooks patterns |
| `backend/services` | `packages/backend/src/services/AGENTS.md` | Repository/service layer |

## Quick Commands

```bash
# Development
bun run dev                    # Start all dev servers (turbo)

# Building
bun run build                  # Build all packages

# Database (from packages/backend)
bun run db:generate            # Generate migrations
bun run db:migrate             # Run migrations
bun run db:push                # Push schema changes (dev)

# Testing
cd packages/app && bun test    # Run Vitest tests
```

## Import Patterns

```typescript
// Backend: relative imports only
import { db } from "./lib/db";
import { CustomerRepository } from "./services/repository/customer.repository";

// Frontend: path aliases
import { Button } from "@/components/ui/button";
import { useCustomers } from "~/hooks/use-customers";
import { cn } from "~/lib/utils";

// Cross-package: workspace protocol
import type { ApiResponse } from "@avileo/shared";
```

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Files | `kebab-case.ts` | `customer-card.tsx`, `use-auth.ts` |
| Components | `PascalCase` | `CustomerCard`, `Button` |
| Hooks | `camelCase` with `use-` prefix | `useAuth`, `useCustomers` |
| Database tables | `snake_case` | `business_users`, `sync_operations` |
| Zod schemas | `camelCase` + `Schema` suffix | `customerSchema`, `loginSchema` |

## Critical Architecture Patterns

### Backend (ElysiaJS)

1. **RequestContext Pattern**: All repository/service methods receive `ctx` as FIRST parameter
2. **Multi-tenancy**: All queries MUST filter by `ctx.businessId`
3. **Single Decorate**: Use ONE `decorate()` call to avoid Elysia hangs
4. **Error Hierarchy**: Services throw `NotFoundError`, `ValidationError`, `ConflictError`

### Frontend (React Router v7)

1. **File-based Routing**: Routes auto-generated from `app/routes/` filenames
2. **Protected Routes**: `_protected.*` prefix wraps auth + sync providers
3. **Index Convention**: Use `._index.tsx` suffix for routes with children
4. **Offline-first**: All writes check `isOnline()`, queue if offline

### Database (Drizzle)

1. **Better Auth Tables**: `user`, `session` managed by Better Auth
2. **FK Pattern**: Operational FKs point to `business_users.id`
3. **Sync Status**: Tables `customers`, `sales`, `abonos` have `sync_status` + `sync_attempts`

## Key Entry Points

| Purpose | Path |
|---------|------|
| Backend server | `packages/backend/src/index.ts` |
| Frontend routes | `packages/app/app/routes.ts` |
| Root layout | `packages/app/app/root.tsx` |
| Protected layout | `packages/app/app/routes/_protected.tsx` |
| DB schema index | `packages/backend/src/db/schema/index.ts` |
| API client | `packages/app/app/lib/api-client.ts` |

## Documentation Map

| Topic | Location |
|-------|----------|
| Architecture overview | `docs/ARCHITECTURE.md` |
| Database schema | `docs/technical/database.md` |
| Offline sync plan | `docs/technical/offline-plan.md` |
| Development phases | `docs/development/readme.md` |
| UI mockups | `docs/screens/readme.md` |

## Skills for AI Agents

Use these skills when delegating tasks:

| Skill | Use For |
|-------|---------|
| `fullstack-backend` | Database, Drizzle, repositories |
| `fullstack-auth-better` | Authentication, JWT, RBAC |
| `fullstack-infrastructure` | Monorepo, Turbo, setup |
| `frontend` | React components, forms, UI |
| `bun-elysia` | ElysiaJS backend patterns |
| `avileo` | Project-specific context |

## Language Rules

- **All code comments must be in English only** — Never add comments in Spanish or other languages
- User-facing text: Spanish (Peru locale: "es-PE")

---

*For package-specific patterns, see the AGENTS.md in each package directory.*

> **Concise project reference for AI agents. For detailed docs, see `/docs/`.**

## Project Overview

**Avileo (PollosPro)**: Offline-first chicken sales management system.
- **Stack**: Bun + ElysiaJS + Drizzle + PostgreSQL + React Router v7 + TanStack
- **Architecture**: Mobile-first, offline-first with IndexedDB persistence
- **Multi-tenancy**: Users can belong to multiple businesses

## Package Structure

| Package | Path | Purpose |
|---------|------|---------|
| `@avileo/app` | `packages/app/` | React Router v7 frontend |
| `@avileo/backend` | `packages/backend/` | ElysiaJS + Drizzle backend |
| `@avileo/shared` | `packages/shared/` | Shared types & utilities |

## Quick Commands

```bash
# Development
bun run dev          # Start all dev servers
bun run build        # Build all packages

# Database
cd packages/backend
bun run db:generate  # Generate migrations
bun run db:migrate   # Run migrations
bun run db:push      # Push schema changes (dev)
```

## Key Conventions

### Imports
```typescript
// Backend: relative imports only
import { db } from "./lib/db";

// Frontend: path aliases
import { Button } from "@/components/ui/button";
import { Component } from "~/components/Component";

// Cross-package: workspace protocol
import type { ApiResponse } from "@avileo/shared";
```

### Naming
- Files: `kebab-case.ts`, components: `PascalCase.tsx`
- Components: PascalCase, functions: camelCase
- Database tables: snake_case

### Critical Patterns
- **Offline-first**: All vendor screens work 100% offline
- **Better Auth**: Tables `user`, `session` managed by Better Auth
- **FK Pattern**: Operational FKs point to `business_users.id`
- **Sync Status**: Tables `customers`, `sales`, `abonos` have `sync_status` + `sync_attempts`

## React Router v7 Routing

File-based routing in `packages/app/app/routes/` using flatRoutes convention:

| Filename Pattern | URL Path | Layout |
|------------------|----------|--------|
| `_index.tsx` | `/` | root |
| `login.tsx` | `/login` | root |
| `_protected.tsx` | (layout) | - |
| `_protected.dashboard.tsx` | `/dashboard` | protected |
| `_protected.clientes._index.tsx` | `/clientes` | protected |
| `_protected.clientes.$id._index.tsx` | `/clientes/:id` | protected |

**Critical Rules:**
- Use `._index.tsx` suffix for routes with children (e.g., `clientes._index.tsx` when you have `clientes.$id.tsx`)
- `_protected.*` routes are wrapped with auth guard + AppLayout
- Public routes have no underscore prefix (login, register)

## Documentation Map

| Topic | Location |
|-------|----------|
| **Architecture** | `docs/ARCHITECTURE.md` |
| **Technical Plan** | `docs/technical/readme.md` |
| **Database Schema** | `docs/technical/database.md` |
| **Development Phases** | `docs/development/readme.md` |
| **UI Mockups** | `docs/screens/readme.md` |
| **UI Components** | `docs/screens/componentes-ui.md` |
| **Code Conventions** | `docs/CONVENTIONS.md` |

## Skills Reference

Use these skills when delegating:

| Skill | Use For |
|-------|---------|
| `fullstack-backend` | Database, Drizzle, repositories |
| `fullstack-auth-better` | Authentication, JWT, RBAC |
| `fullstack-infrastructure` | Monorepo, routing, setup |
| `frontend` | React components, forms, UI |
| `bun-elysia` | ElysiaJS backend patterns |
| `avileo` | Project-specific context (skill in `.claude/skills/`) |

## Decision Matrix

| Request | Primary Skill | Secondary |
|---------|--------------|-----------|
| Database setup | fullstack-backend | - |
| Authentication | fullstack-auth-better | - |
| React components | frontend | - |
| API + DB | fullstack-backend | fullstack-auth-better |
| Full feature | All 4 skills | - |

## UI Development Rules

1. **Mobile-first**: Design for 320px-428px viewport
2. **Offline-first**: All vendor screens must work offline
3. **Use mockups**: Reference `docs/screens/` and `docs/app/src/` prototypes
4. **Orange primary**: `#f97316` for buttons, accents
5. **Bottom nav**: Mobile uses 4-item bottom navigation

## Important Notes

- Login requires internet (first time), JWT cached 24-48h
- IndexedDB capacity: ~50-100 MB per origin
- Sync every 30s when online, or manual
- Admin sees synced data only (with pending indicator)
- All skills assume Bun runtime

## Language Rules

- **All code comments must be in English only** — Never add comments in Spanish or any other language

---

*For detailed information, see linked documentation files.*
