# AGENTS.md - Avileo Quick Reference

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
