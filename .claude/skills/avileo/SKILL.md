---
name: avileo
description: Avileo (PollosPro) - Offline-first chicken sales management system. Use when working on the Avileo project, implementing sales features, offline sync, database schema, or any code related to this chicken business management app. Covers monorepo structure, Bun/ElysiaJS backend, React Router v7 frontend, Drizzle ORM, TanStack DB, and offline-first architecture.
---

# Avileo Project Reference

> **PollosPro** - Offline-first chicken sales management system for businesses selling chicken (live, dressed, cuts) and related products.

## Project Overview

Avileo is a comprehensive sales management system designed for chicken businesses that operates **offline-first**. It enables vendors to work in areas without internet coverage while keeping data synchronized when connectivity is available.

### Key Characteristics

- **Offline-First Architecture**: Works without internet, syncs when available
- **Multi-Tenancy**: Single user can belong to multiple businesses
- **Flexible Operation Modes**: Supports various business models
- **Mobile-First**: Designed for vendors using mobile devices
- **Real-time Dashboard**: Admin panel with sync status indicators

### Business Problem Solved

Traditional chicken businesses operate manually:
- Price calculations by hand or calculator
- Accounts receivable in paper notebooks
- No tracking of who sells what
- Difficult to know daily sales totals
- **Vendors work in areas without internet coverage**

### Solution

- Sell without internet - data stored locally (IndexedDB)
- Automatic sync when connection returns
- Automatic price calculations (with tare subtraction)
- Digital accounts receivable management
- Inventory assignment to vendors (optional)
- Real-time collection tracking

## Project Structure

```
avileo/
├── packages/
│   ├── app/              # React Router v7 frontend (@avileo/app)
│   ├── backend/          # ElysiaJS + Drizzle backend (@avileo/backend)
│   └── shared/           # Shared types & utilities (@avileo/shared)
├── docs/
│   ├── technical/        # Architecture & database docs
│   └── development/      # Development phases (01-10)
├── .claude/
│   └── skills/avileo/    # This skill
└── package.json          # Turborepo root
```

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Runtime** | Bun | 1.1.38+ |
| **Frontend** | React Router v7 | latest |
| **Backend** | ElysiaJS | latest |
| **Database** | PostgreSQL (Neon) | 16.x |
| **ORM** | Drizzle ORM | latest |
| **Auth** | Better Auth | latest |
| **State** | TanStack DB | latest |
| **Cache** | TanStack Query | 5.x |
| **Persistence** | IndexedDB | - |

## Quick Reference

### Build Commands
```bash
# Root level (runs via turbo)
bun run dev          # Start all dev servers
bun run build        # Build all packages
bun run db:migrate   # Run database migrations
bun run db:generate  # Generate Drizzle migrations

# Individual packages
cd packages/app && bun run dev       # Frontend only (port 5173)
cd packages/backend && bun run dev   # Backend only (port 3000)
cd packages/shared && bun run build  # Build shared package
```

### Database Commands
```bash
cd packages/backend
bun run db:generate  # Generate migration files
drizzle-kit generate # Alternative
bun run db:migrate   # Run pending migrations
bun run db:push      # Push schema changes (dev only)
```

## Operation Modes

The system supports 4 modes configurable per business:

1. **Inventario Propio** (Traditional): Buy chicken, process, distribute to vendors
2. **Sin Inventario** (Commission): Vendors sell third-party chicken, no stock control
3. **Pedidos Primero** (Pre-sale): Orders first, then buy chicken to fulfill
4. **Mixto** (Hybrid): Combination based on day/season

### Mode Configuration
```typescript
interface ConfiguracionSistema {
  modo_operacion: 'inventario_propio' | 'sin_inventario' | 'pedidos' | 'mixto';
  control_kilos: boolean;        // Track stock
  usar_distribucion: boolean;    // Use daily distribution
  permitir_venta_sin_stock: boolean; // Allow sales without assigned stock
}
```

## Core Modules

| Module | Description | Offline Support |
|--------|-------------|-----------------|
| **Authentication** | Login/logout with JWT | ⚠️ First login needs internet |
| **Users & Roles** | Admin and vendor management | ❌ Admin only |
| **Calculator** | Price calculations with tare | ✅ 100% offline |
| **Sales** | Cash and credit sales | ✅ 100% offline |
| **Customers** | Accounts receivable | ✅ 100% offline |
| **Abonos** | Debt payments | ✅ 100% offline |
| **Distribution** | Daily inventory assignment | ✅ 100% offline |
| **Sync Engine** | Offline/online sync | ✅ Background sync |

## Documentation Structure

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture, patterns, and offline-first design
- **[DATABASE.md](DATABASE.md)** - Database schema, relations, and sync patterns
- **[MODULES.md](MODULES.md)** - Business modules, workflows, and use cases
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Development phases, commands, and guidelines

## Important Constraints

### Limitations (Documented)
1. Login requires internet (first time) - JWT cached 24-48h
2. Admin data not instant - sees synced data only
3. Simultaneous edit conflicts - "last wins" strategy
4. IndexedDB capacity ~50-100 MB per origin
5. No real-time sync - 30s interval when online
6. Lost device = lost unsynced data

### Business Contradictions Resolved
| Contradiction | Resolution |
|---------------|------------|
| "Real-time dashboard" vs "No internet" | Dashboard shows last synced state + pending count |
| "Instant cash closing" vs "Sync delay" | Closing calculated from local vendor data |
| "Never lose sales" vs "Device failure" | Auto-sync every 30s + manual backup button |

## Key Files to Reference

### Documentation
- `docs/technical/readme.md` - Main technical plan
- `docs/technical/database.md` - Complete ER diagram
- `docs/development/readme.md` - Development roadmap
- `AGENTS.md` - Project conventions and commands

### Code
- `packages/backend/src/db/schema/` - Drizzle schema files
- `packages/app/app/routes/` - Frontend routes
- `packages/shared/src/index.ts` - Shared types

## Glossary

| Term | Definition |
|------|------------|
| **Offline-first** | App works without internet, syncs when possible |
| **Sync** | Synchronize local data with server |
| **IndexedDB** | Browser's local database |
| **Tara** | Container weight subtracted from gross weight |
| **Distribución del Día** | Daily inventory assignment to vendors (optional) |
| **Abono** | Debt payment independent of sales |
| **Modo Libre** | Sales recording without stock control |

---

*Last updated: February 2026*
*For detailed information, see linked documentation files.*
