# AGENTS.md - @avileo/shared

**Cross-package source of truth for types, enums, and sync configuration.**
Built with `tsup` to `dist/` (ESM + .d.ts).

## STRUCTURE

| File | Purpose |
|------|---------|
| `index.ts` | Public API exports |
| `schema.ts` | Drizzle ORM table definitions (used by both PostgreSQL + PostgreSQL) |
| `sync-config.ts` | Canonical entity list, priorities, self-heal rules |
| `__tests__/sync-config.test.ts` | Sync config validation tests |

## WHERE TO LOOK

**Drizzle Types**: `schema.ts` exports `Type` and `New` variants (e.g., `Customer`, `NewCustomer`)

**Enums**: `index.ts` exports `const` objects (NOT TypeScript enums):
- `UserRole`, `BusinessUserRole`, `SaleType`, `PaymentMethod`
- `ModoOperacion`, `InvitationStatus`, `OrderStatus`

**Sync Entities**: `SYNC_ENTITIES` has 14 entities. Priority ordering in `ENTITY_PRIORITIES` (parents before children).

- `CRITICAL`: customers, products, variants — 30 days, blocking
- `RECENT_SALES`: sales, items — 7 days, blocking
- `HISTORICAL`: everything else — full history, background

**Utilities**: `calculateBalanceDue()`, `VARIANTS_CONSTRAINTS`

## CONVENTIONS

- **Enums as const objects** — enables tree-shaking, avoids TS enum pitfalls
- **Shared Drizzle schema** — single schema works for PostgreSQL (frontend) and PostgreSQL (backend)
- **New entities** — must be added to BOTH `schema.ts` AND `sync-config.ts`
- **Type inference** — prefer `typeof table.$inferSelect` over manual types

## ANTI-PATTERNS

- ❌ TypeScript `enum` — use `as const` objects instead
- ❌ Adding table to `schema.ts` without adding to `SYNC_ENTITIES`
- ❌ Using `pgEnum()` — PostgreSQL compatibility requires `text()` with const values
- ❌ Forgetting to set `businessId` index on new tables
