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

Avileo is a **pocket-sized business app** that replaces the notebook for small businesses -- chicken vendors, distributors, garage shops, and anyone moving from pen and paper to their first digital tool. Simple enough to use day one, powerful enough to grow with you, and fully offline-capable.

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
├── cli/      # CLI unificada (avileo) — logs, dashboard, dev
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
# CLI unificada (recomendada)
bun run avileo dev              # Start monorepo dev (backend + app + dashboard)
bun run avileo dev --only backend  # Solo backend
bun run avileo logs --level error  # Ver errores en logs
bun run avileo logs -f             # Tail logs en vivo
bun run avileo logs --stats        # Resumen de logs
bun run avileo status              # Estado de servicios
bun run avileo dashboard           # Dashboard web de logs
bun run avileo --help              # Ayuda de la CLI
bun run build                      # Build all packages

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

## CLI (`avileo`)

La CLI unificada (`packages/cli/`) gestiona el ciclo de desarrollo. Escribe logs en `logs/` (JSONL por servicio), sirve un dashboard web React con SSE en `http://localhost:5174`, y expone una API de logs (`GET /api/logs`, `GET /api/logs/stream`).

- **Comandos**: `dev`, `logs`, `status`, `dashboard`
- **Config**: `config.json` (auto-generado, contiene puertos/URLs/estado)
- **Logs**: `logs/backend.jsonl`, `logs/app.jsonl`
- **Dashboard**: construido desde `packages/cli/dashboard/` con Vite

Para troubleshooting: `avileo logs --level error` o el dashboard web.

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
