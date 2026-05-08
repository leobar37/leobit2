---
name: avileo
description: Avileo - Online-first chicken sales management system. Use when working on the Avileo project, implementing sales features, database schema, multi-business support, or code related to this sales management app. Covers monorepo structure, Bun/ElysiaJS backend, React Router v7 frontend, Drizzle ORM, PostgreSQL, TanStack Query, and online-first architecture.
---

# Avileo Project Reference

Avileo is an online-first, mobile-first sales management system for chicken businesses and related verticals. Keep this file as the lightweight entry point; load linked references only when needed.

## When To Use

- Working in `packages/app`, `packages/backend`, or `packages/shared`.
- Implementing sales, customers, purchases, distribution, closing, public catalog, payments, WhatsApp, reports, or staff workflows.
- Changing database schema, shared contracts, sync-sensitive entities, or business mode behavior.
- Reviewing Avileo-specific architecture, commands, conventions, or product terminology.

## Project Shape

| Package | Purpose |
|---------|---------|
| `packages/app` | React Router v7 frontend, mobile shell, TanStack Query, Eden Treaty |
| `packages/backend` | Bun + ElysiaJS API, Drizzle ORM, services, repositories |
| `packages/shared` | Shared schemas, types, standards, transformers |

Core architecture: online-first PWA, PostgreSQL, Better Auth, multi-tenancy, mobile vendor flows, unified `sales` table for instant sales and pre-orders.

## Critical Rules

- Read the relevant package `AGENTS.md` before changing code in that package.
- Backend repository/service methods take `ctx` first.
- Every tenant-scoped query must filter by `businessId`.
- Domain services throw errors; route layers convert them to HTTP responses.
- Frontend writes belong in TanStack Query mutation hooks and existing app mutation wrappers.
- Protected frontend routes must follow `flatRoutes()` and `_protected.*` conventions.
- User-facing text is Spanish (`es-PE`); code comments are English.
- Preserve mobile-first layouts at 320px-428px.
- For business vertical behavior, prefer `businessMode` flags over hardcoded vertical-specific branches.

## Quick Commands

```bash
bun run dev
bun run build

cd packages/app && bun test
cd packages/app && bun run test:e2e

cd packages/backend && bun test
cd packages/backend && bun run test:e2e
cd packages/backend && bun run db:generate
cd packages/backend && bun run db:migrate
cd packages/backend && bun run db:seed:demo
```

## Business Modes

Avileo supports multiple business verticals through a config-driven framework. Current core modes:

| Vertical | Slug | Status | Notes |
|----------|------|--------|-------|
| Polleria | `polleria` | Active | Tara, net weight, kg sales, daily distribution |
| Distribucion de Agua | `agua` | Planned | Containers, deposits, subscriptions, unit sales |

Use `RequestContext.businessMode` and `RequestContext.modeFlags` in backend services. Use `useBusinessMode()`, `BusinessMode`, and `BusinessModeField` in frontend code.

For APIs, examples, feature flags, and key files, see [referencias/business-modes.md](referencias/business-modes.md).

## Reference Map

- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical architecture and patterns.
- [DATABASE.md](DATABASE.md) - Database schema, relations, and enums.
- [MODULES.md](MODULES.md) - Business modules, workflows, and use cases.
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development phases, commands, and guidelines.
- [referencias/business-modes.md](referencias/business-modes.md) - Multi-vertical business modes framework.
- [referencias/toolbar-actions.md](referencias/toolbar-actions.md) - ToolbarActions component pattern.
- [referencias/file-upload-pattern.md](referencias/file-upload-pattern.md) - File upload with mobile camera support.
- [referencias/public-catalog-pattern.md](referencias/public-catalog-pattern.md) - Public catalog pattern.
- [referencias/cierre-pattern.md](referencias/cierre-pattern.md) - Cierre del dia pattern.
- `AGENTS.md` - Root conventions and command map.
- `packages/app/AGENTS.md` - Frontend conventions.
- `packages/backend/AGENTS.md` - Backend conventions.
- `packages/shared/src/AGENTS.md` - Shared package conventions.

## Key Code Paths

- `packages/backend/src/db/schema/` - Drizzle schema files.
- `packages/backend/src/services/` - Backend domain services and repositories.
- `packages/app/app/routes/` - Frontend routes.
- `packages/app/app/lib/api-client.ts` - Eden Treaty API client.
- `packages/shared/src/index.ts` - Shared public exports.
- `packages/shared/src/transformers/` - Decimal and entity transformers.

## Glossary

| Term | Definition |
|------|------------|
| Tara | Container weight subtracted from gross weight |
| Distribucion del Dia | Daily inventory assignment to vendors |
| Abono | Debt payment independent of sales |
| Modo Libre | Sales recording without stock control |
| Punto de Venta | Sales location or branch |
| Venta al Credito | Credit sale / accounts receivable |
| Venta al Contado | Cash sale |
| Pre-orden / Pedido | Pre-order for future delivery |
| Cierre | Daily closing report by vendor |
| Visita | Customer visit tracking during distribution |
| Variante | Product variant |

---

Last updated: May 2026
