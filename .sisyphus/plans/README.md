# Avileo - Master Plan: 6 Development Phases

## Executive Summary

This directory contains **6 executable plans** to build Avileo (PollosPro) step by step.

### The 6 Plans

| # | Plan | Description | Duration | Status |
|---|------|-------------|----------|--------|
| **0** | `avileo-phase-0-setup.md` | **SETUP**: Bun monorepo + Turborepo + Elysia + React Router v7 + Neon + tsup | 2-3 days | ✅ Complete |
| **1** | `avileo-phase-1-auth.md` | **AUTH**: Better Auth, login/logout, admin/vendor roles | 2-3 days | ⏳ Pending |
| **2** | `avileo-phase-2-offline.md` | **CORE OFFLINE**: TanStack DB, IndexedDB, persistence | 3-4 days | ⏳ Pending |
| **3** | `avileo-phase-3-sales.md` | **SALES**: Cash/credit sales + Price calculator with tare | 3-4 days | ⏳ Pending |
| **4** | `avileo-phase-4-customers.md` | **CUSTOMERS + SYNC**: Customers, payments, sync engine | 4-5 days | ⏳ Pending |
| **5** | `avileo-phase-5-admin.md` | **ADMIN**: Inventory, reports, dashboard, config | 3-4 days | ⏳ Pending |

**Confirmed Stack:**
- ✅ Bun 1.1.38 + Turborepo
- ✅ ElysiaJS + Drizzle ORM + **Neon PostgreSQL**
- ✅ React Router v7 + React 19
- ✅ TanStack DB (offline) + TanStack Query
- ✅ Better Auth (authentication)
- ✅ tsup (build shared package)
- ⚠️ Tests: NO in Phase 0 (added in Phase 5)

**Total Estimate:** 17-23 days (3-4 weeks)

---

## Target Project Structure

```
avileo/
├── package.json              # Bun workspaces
├── turbo.json                # Turborepo
├── bun.lock
├── README.md                 # Setup guide for humans
├── AGENTS.md                 # AI agent conventions
│
├── packages/
│   ├── backend/              # ElysiaJS + Drizzle + Neon
│   ├── app/                  # React Router v7
│   └── shared/               # Types (built with tsup)
│
├── plan/                     # Development plans
└── docs/                     # Existing documentation
```

---

## How to Execute

### Start Phase 0 (SETUP)
```bash
cd /Users/leobar37/code/avileo
/start-work .sisyphus/plans/avileo-phase-0-setup.md
```

### After Phase 0
Will continue automatically or run manually:
```bash
/start-work .sisyphus/plans/avileo-phase-1-auth.md
```

---

## MVP Definition

MVP will be ready after **Phase 4** (Customers + Sync):
- ✅ Login with roles
- ✅ Offline sales
- ✅ Price calculator
- ✅ Customer management
- ✅ Automatic sync
- ✅ Offline indicators

---

*Plans generated following Elena structure with adaptations for Avileo*
