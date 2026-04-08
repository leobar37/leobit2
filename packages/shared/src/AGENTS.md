# AGENTS.md - @avileo/shared

**Cross-package source of truth for types, enums, and sync configuration.**
Built with `tsup` to `dist/` (ESM + .d.ts).

## STRUCTURE

| File | Purpose |
|------|---------|
| `index.ts` | Public API exports |
| `schema.ts` | Drizzle ORM table definitions (used by both PGlite + PostgreSQL) |
| `sync-config.ts` | Canonical entity list, priorities, self-heal rules |
| `sync-stages.ts` | 3-stage sync strategy (CRITICAL → RECENT_SALES → HISTORICAL) |
| `__tests__/sync-config.test.ts` | Sync config validation tests |

## WHERE TO LOOK

**Drizzle Types**: `schema.ts` exports `Type` and `New` variants (e.g., `Customer`, `NewCustomer`)

**Enums**: `index.ts` exports `const` objects (NOT TypeScript enums):
- `UserRole`, `BusinessUserRole`, `SaleType`, `PaymentMethod`
- `SyncStatus`, `ProductType`, `ProductUnit`, `DistribucionStatus`
- `ModoOperacion`, `InvitationStatus`, `OrderStatus`

**Sync Entities**: `SYNC_ENTITIES` has 14 entities. Priority ordering in `ENTITY_PRIORITIES` (parents before children).

**Sync Stages**: `SYNC_STAGES` defines lookback windows:
- `CRITICAL`: customers, products, variants — 30 days, blocking
- `RECENT_SALES`: sales, items — 7 days, blocking
- `HISTORICAL`: everything else — full history, background

**Utilities**: `calculateBalanceDue()`, `VARIANTS_CONSTRAINTS`

## CONVENTIONS

- **Enums as const objects** — enables tree-shaking, avoids TS enum pitfalls
- **Shared Drizzle schema** — single schema works for PGlite (frontend) and PostgreSQL (backend)
- **New entities** — must be added to BOTH `schema.ts` AND `sync-config.ts`
- **Sync status** — entities use `sync_status` + `sync_attempts` columns
- **Type inference** — prefer `typeof table.$inferSelect` over manual types

## ANTI-PATTERNS

- ❌ TypeScript `enum` — use `as const` objects instead
- ❌ Adding table to `schema.ts` without adding to `SYNC_ENTITIES`
- ❌ Using `pgEnum()` — PGlite compatibility requires `text()` with const values
- ❌ Forgetting to set `businessId` index on new tables
