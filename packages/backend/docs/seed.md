# Seed & Demo Data Guide

> How to populate the database with demo accounts and vertical-specific data.

## Overview

The backend provides several seed scripts to create demo users and businesses for development and testing. Each script is idempotent -- running it multiple times will reuse existing users and only add missing data.

## Demo Accounts

| Account | Email | Password | Business | Mode |
|---------|-------|----------|----------|------|
| Demo (Pollos) | `demo@avileo.com` | `demo123456` | Pollos Demo | `polleria` |
| Client 1 | `cliente1@gmail.com` | `Prueba@123` | Pollería y Bodega Cliente 1 | `polleria` |
| Water | `agua@avileo.com` | `agua123456` | Agua Pura Demo | `agua` |

## Available Seed Scripts

### 1. Pollos Demo (`demo-user.ts`)

Creates the classic chicken-sales demo account with products, customers, inventory, and suppliers.

```bash
cd packages/backend
bun run db:seed:demo
```

**What it seeds:**
- User: `demo@avileo.com`
- Business: "Pollos Demo" (`businessMode: polleria`)
- Categories: Pollo, Huevo, Otro
- Products: Pollo Entero, Huevos, Menudencias + variants
- Inventory: 100 units per variant
- 4 customers + 2 suppliers

### 2. Water Demo (`demo-water-user.ts`)

Creates a water delivery business account with routes, customer profiles, and container tracking.

```bash
cd packages/backend
bun run db:seed:water
```

**What it seeds:**
- User: `agua@avileo.com`
- Business: "Agua Pura Demo" (`businessMode: agua`)
- Categories: Bidón, Accesorios
- Products: Bidón 20L, Bidón 10L, Dispensador + variants (con/sin retorno)
- Inventory: 100 units per variant
- 3 customers with water profiles
- 2 routes: "Ruta Norte" (Los Olivos), "Ruta Sur" (Surco)
- Customer profiles with delivery frequency, container deposits, and route assignments

### 3. Client 2 / JUAVIK (`seed-client2.ts`)

Imports canonical notebook data with historical sales and payments. Requires validation.

```bash
cd packages/backend
bun run db:seed:client2
# Or force skip validation:
bun run db:seed:client2 -- --force
```

**What it seeds:**
- User: `juavik@gmail.com`
- Business with full canonical dataset from notebook extractions
- Historical sales, abonos, customers, and products

### 4. Full Reset + All Seeds

Resets the database (preserves demo accounts), then re-seeds all demo data.

```bash
cd packages/backend
bun run db:reset
```

This runs `reset-db-dual.ts` which:
1. Preserves `demo@avileo.com`, `cliente1@gmail.com`, `agua@avileo.com`
2. Deletes all operational data (sales, customers, inventory, water data, etc.)
3. Runs `demo-user.ts` (pollos)
4. Runs `demo-water-user.ts` (agua)

## Script Reference

| Script | Path | Purpose |
|--------|------|---------|
| `db:seed:demo` | `src/seed/demo-user.ts` | Pollos demo account |
| `db:seed:water` | `src/seed/demo-water-user.ts` | Agua demo account |
| `db:seed:client2` | `src/seed/seed-client2.ts` | JUAVIK canonical data |
| `db:reset` | `scripts/reset-db-dual.ts` | Full reset + all seeds |

## Adding a New Seed

To create a seed for a new vertical or account:

1. Create a new file in `src/seed/` (e.g., `demo-<vertical>-user.ts`)
2. Follow the pattern from `demo-user.ts` or `demo-water-user.ts`:
   - Define `USER`, `BUSINESS`, and data constants
   - Check for existing user with `db.query.user.findFirst`
   - Create business with appropriate `businessMode`
   - Use `RequestContext.forWorker(businessId, businessUserId)` for seeding
   - Call service methods through `services.*` or repositories
3. Add a script alias in `package.json`
4. Update `reset-db-dual.ts` to preserve the new account if it should survive resets
5. Document the new seed in this file

## Reset Scripts

| Script | Path | Preserves |
|--------|------|-----------|
| `reset-db.ts` | `scripts/reset-db.ts` | Only `demo@avileo.com` |
| `reset-db-dual.ts` | `scripts/reset-db-dual.ts` | Demo + Client1 + Water |

Use `reset-db-dual.ts` for daily development. Use `reset-db.ts` only if you need a minimal reset with just the pollos demo.
