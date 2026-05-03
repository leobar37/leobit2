# AGENTS.md - Avileo Project Knowledge Base

> **Hierarchical knowledge base for AI agents. For detailed package docs, see package-level AGENTS.md files.**

**Generated:** 2026-04-08
**Commit:** 8c917d6
**Branch:** main
**Mode:** Update

## Project Overview

**Avileo**: Offline-first chicken sales management system for mobile vendors.
- **Stack**: Bun + ElysiaJS + Drizzle + PostgreSQL + React Router v7 + TanStack
- **Architecture**: Mobile-first, online with PostgreSQL (PostgreSQL in WASM) + custom REST sync
- **Multi-tenancy**: Users can belong to multiple businesses

| Aspect | Technology |
|--------|------------|
| **Runtime** | Bun 1.1.38+ |
| **Backend** | ElysiaJS + Drizzle ORM + PostgreSQL (Neon) |
| **Frontend** | React Router v7 + React 19 + Vite |
| **Auth** | Better Auth (JWT) |
| **Offline** | PostgreSQL + custom REST sync (push/pull) |
| **Monorepo** | Bun workspaces + Turbo |
| **Deployment** | Docker + Dokploy (self-hosted PaaS) |

## Monorepo Structure

```
packages/
├── app/              # React Router v7 frontend (SPA)
├── backend/          # ElysiaJS API server
└── shared/           # Shared types, enums, sync config (tsup build)
```

## Package Documentation Map

| Package | AGENTS.md | Focus |
|---------|-----------|-------|
| Root | This file | Project-wide conventions |
| `@avileo/backend` | `packages/backend/AGENTS.md` | ElysiaJS, Drizzle, RequestContext |
| `@avileo/app` | `packages/app/AGENTS.md` | React Router v7, TanStack, online |
| `@avileo/shared` | `packages/shared/src/AGENTS.md` | Shared schema, enums, sync config |
| `app/components` | `packages/app/app/components/AGENTS.md` | UI primitives, forms, shadcn/ui |
| `app/routes` | `packages/app/app/routes/AGENTS.md` | File-based routing conventions |
| `app/hooks` | `packages/app/app/hooks/AGENTS.md` | Custom React hooks patterns |
| `app/lib/db` | `packages/app/app/lib/db/AGENTS.md` | Zod entity schemas |
| `app/lib/services` | `packages/app/app/lib/services/AGENTS.md` | BaseService + PostgreSQL local-first services |
| `app/lib/sales` | `packages/app/app/lib/sales/AGENTS.md` | POS business logic |
| `app/lib/sync` | `packages/app/app/lib/sync/AGENTS.md` | PostgreSQL sync engine |
| `app/e2e` | `packages/app/e2e/AGENTS.md` | E2E testing patterns |
| `backend/services` | `packages/backend/src/services/AGENTS.md` | Repository/service layer |
| `backend/services/sync` | `packages/backend/src/services/sync/AGENTS.md` | Sync handlers + framework |
| `backend/services/transitions` | `packages/backend/src/services/transitions/AGENTS.md` | State machine transitions |
| `backend/api` | `packages/backend/src/api/AGENTS.md` | Elysia route modules |
| `backend/db/schema` | `packages/backend/src/db/schema/AGENTS.md` | Drizzle table definitions |

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
bun run db:reset               # Reset database (keeps demo user)
bun run db:seed:demo           # Seed demo account data
bun run db:backfill-sync       # Backfill sync operations from local data

# Testing
cd packages/app && bun test    # Run Vitest tests
cd packages/app && bun run test:e2e  # Run Playwright E2E tests
cd packages/backend && bun test    # Backend unit tests
cd packages/backend && bun run test:e2e  # Backend E2E tests
```

## Import Patterns

```typescript
// Backend: relative imports only
import { db } from "./lib/db";
import { CustomerRepository } from "./services/repository/customer.repository";

// Frontend: path aliases (~ for lib/hooks, @ for components)
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

| Pattern | Rule | Violation Impact |
|---------|------|------------------|
| **RequestContext** | `ctx` MUST be FIRST parameter in ALL repo/service methods | Data inconsistency |
| **Multi-tenancy** | ALL queries MUST filter by `ctx.businessId` | Security breach |
| **Single Decorate** | Use ONE `decorate()` call only | Elysia server hang |
| **Error Handling** | Services throw domain errors, not HTTP responses | Inconsistent API |

```typescript
// ✅ CORRECT - ctx first
async findById(ctx: RequestContext, id: string)

// ❌ INCORRECT - ctx last
async findById(id: string, ctx: RequestContext)

// ✅ CORRECT - single decorate
.decorate(() => ({
  repo: new Repository(),
  service: new Service(),
}))

// ❌ INCORRECT - multiple decorate
.decorate("repo", new Repository())
.decorate("service", new Service()) // NEVER
```

### Frontend (React Router v7)

| Pattern | Rule | Violation Impact |
|---------|------|------------------|
| **File-based Routing** | Routes auto-generated from filenames via `flatRoutes()` | 404 errors |
| **Protected Routes** | `_protected.*` prefix for auth pages | Missing auth guard |
| **Index Convention** | Use `._index.tsx` suffix for parent routes with children | Nested route conflicts |
| **Offline-first** | ALL writes go through local PostgreSQL + sync queue | Data loss |

### Database (Drizzle)

1. **Better Auth Tables**: `user`, `session` managed by Better Auth - don't modify directly
2. **FK Pattern**: Operational FKs point to `business_users.id` (not `users.id`)
3. **Sync Status**: Offline-capable tables MUST have `sync_status` + `sync_attempts`
4. **Primary Keys**: CUID2 via `@paralleldrive/cuid2`

### Sync Architecture

- **Local DB**: PostgreSQL (PostgreSQL in WASM) on device
- **Push**: Client enqueues operations → batch POST to `/sync/batch`
- **Pull**: 3-stage strategy (CRITICAL → RECENT_SALES → HISTORICAL)
- **Handlers**: 14 entity handlers on backend extend `BaseSyncHandler`
- **Conflict Resolution**: Server-side `ConflictResolver` + client `ConflictResolver` UI

## Key Entry Points

| Purpose | Path |
|---------|------|
| Backend server | `packages/backend/src/index.ts` |
| Backend app config | `packages/backend/src/app.ts` |
| Frontend routes | `packages/app/app/routes.ts` |
| Root layout | `packages/app/app/root.tsx` |
| Protected layout | `packages/app/app/routes/_protected.tsx` |
| DB schema index | `packages/backend/src/db/schema/index.ts` |
| API client | `packages/app/app/lib/api-client.ts` |
| Shared schema | `packages/shared/src/schema.ts` |
| Sync config | `packages/shared/src/sync-config.ts` |

## Documentation Map

| Topic | Location |
|-------|----------|
| Architecture overview | `docs/ARCHITECTURE.md` |
| Database schema | `docs/technical/database.md` |
| Custom sync plan | `docs/technical/custom-sync-plan.md` |
| Development phases | `docs/development/readme.md` |
| UI mockups | `docs/screens/readme.md` |
| Code conventions | `docs/CONVENTIONS.md` |
| Mobile list pattern | `docs/screens/mobile-list-pattern.md` |

## Skills for AI Agents

| Skill | Use For |
|-------|---------|
| `avileo` | Project-specific context |
| `avileo-sync` | Sync engine, conflict resolution |
| `fullstack-backend` | Database, Drizzle, repositories |
| `fullstack-auth-better` | Authentication, JWT, RBAC |
| `fullstack-infrastructure` | Monorepo, Turbo, setup |
| `frontend` | React components, forms, UI |
| `bun-elysia` | ElysiaJS backend patterns |
| `e2e-testing` | Playwright E2E tests |
| `pglite-electric-hybrid` | PostgreSQL + ElectricSQL hybrid sync |

## Decision Matrix

| Request | Primary Skill | Secondary |
|---------|--------------|-----------|
| Database setup | fullstack-backend | - |
| Authentication | fullstack-auth-better | - |
| React components | frontend | - |
| API + DB | fullstack-backend | fullstack-auth-better |
| Sync issues | avileo-sync | fullstack-backend |
| Full feature | All 4 skills | - |

## UI Development Rules

1. **Mobile-first**: Design for 320px-428px viewport
2. **Offline-first**: All vendor screens work 100% offline via PostgreSQL
3. **Orange primary**: `#f97316` for buttons, accents
4. **Shell tokens**: `app-shell`, `shell-surface`, `shell-card-flat`, `shell-card-soft`, `shell-block-muted`, `shell-field`
5. **Bottom nav**: Mobile uses 4-item bottom navigation
6. **Mobile list pattern**: Summary → Search → List → FAB

## Language Rules

- **All code comments must be in English only** — Never add comments in Spanish or other languages
- User-facing text: Spanish (Peru locale: "es-PE")

---

*For package-specific patterns, see the AGENTS.md in each package directory.*
