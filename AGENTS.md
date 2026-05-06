# AGENTS.md - Avileo Project Knowledge Base

> **Hierarchical guidance for AI agents in this monorepo.**
> Package-level AGENTS now contain the consolidated conventions.

## Scope

This repository uses four active AGENTS files:

1. `AGENTS.md` (this file)
2. `packages/app/AGENTS.md`
3. `packages/backend/AGENTS.md`
4. `packages/shared/src/AGENTS.md`

All other `AGENTS.md` files under this repo were intentionally removed to avoid duplicated guidance.

## Project Overview

Avileo is a **mobile-vendor chicken sales management system** with:

- Bun + ElysiaJS backend
- React Router v7 + React 19 frontend
- PostgreSQL + Drizzle ORM
- TanStack Query + local-first patterns for data access
- React Router v7 app shell/layout conventions
- Better Auth for identity and Better Auth-compatible JWT/session flow

## Monorepo Structure

```text
packages/
├── app/      # React Router v7 frontend
├── backend/  # ElysiaJS API server
└── shared/   # Shared types/contracts/schemas utilities
```

## Package Documentation Map

| Package | AGENTS.md | Focus |
|---------|-----------|-------|
| Root | This file | Project-wide conventions |
| `@avileo/app` | `packages/app/AGENTS.md` | Frontend conventions (routes, UI, hooks, forms, mobile shell, tests) |
| `@avileo/backend` | `packages/backend/AGENTS.md` | Backend conventions (services, repositories, transactions, API, routes) |
| `@avileo/shared` | `packages/shared/src/AGENTS.md` | Shared types, schema contracts, helper utilities |

## Shared cross-cutting conventions

- **Code comments**: English only.
- **User-facing text**: Spanish (Peru locale: `es-PE`).
- **No silent duplicates**: Use one AGENTS source per package.
- **Mobile-first baseline**: prioritize 320px–428px layouts.
- **Offline-first mindset**: avoid breaking persistence paths; prefer existing sync-aware flows for writes/reads.

## Import patterns

```ts
// Frontend
import { useCustomers } from "~/hooks/use-customers";
import { Button } from "@/components/ui/button";
import { Button as B2 } from "~/components/ui/button";
import type { ApiResponse } from "@avileo/shared";

// Backend (relative only)
import { db } from "./lib/db";
import { CustomerRepository } from "./services/repository/customer.repository";
```

## Critical architecture rules

### Backend

- `ctx` is first in repository/service methods.
- Every tenant-scoped query must filter by `businessId`.
- Use one Elysia `decorate()` block in plugin setup.
- Throw domain errors in services; do not return HTTP responses directly from domain layers.

### Frontend

- Routes and auth must honor `flatRoutes()` and `_protected.*` conventions.
- Keep user writes in query/mutation hooks (TanStack Query + app mutation wrappers).
- Use `MobileSlotProvider` + `AppLayout` in protected pages for shell consistency.

## Quick commands

```bash
bun run dev                    # Start monorepo dev
bun run build                  # Build all packages

# Backend database
cd packages/backend
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:seed:demo
bun run db:backfill-sync

# Tests
cd packages/app && bun test
cd packages/app && bun run test:e2e
cd packages/backend && bun test
cd packages/backend && bun run test:e2e
```

## Sync & data model orientation

Use shared schema/types in `packages/shared/src/schema.ts` and backend Drizzle tables in `packages/backend/src/db/schema/*`.
Cross-check all sync-sensitive entity changes against existing migration history before merge.

## Reference map

- Architecture: `docs/ARCHITECTURE.md`
- Database notes: `docs/technical/database.md`
- Avileo mobile UI guidelines: `docs/screens/avileo-mobile-ui-guidelines.md`
- Mobile list pattern: `docs/screens/mobile-list-pattern.md`
- Coding conventions: `docs/CONVENTIONS.md`

---

*For package-level specifics, use the corresponding AGENTS file in `packages/*`.*
