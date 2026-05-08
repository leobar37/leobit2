# AGENTS.md - @avileo/shared

> Shared contracts for Avileo (types, constants, schema helpers).

## Role

`@avileo/shared` is the single source of truth for:

- API-facing interfaces/types
- Domain constants/enums as `const` objects
- Drizzle table type exports (`schema.ts`)
- Cross-package utility helpers

## Public surface

Primary exports live in `index.ts`.

| File | Purpose |
|------|---------|
| `index.ts` | Public exports used by app and backend |
| `schema.ts` | Drizzle table definitions and inferred types |
| `state-machine.ts` | Lightweight shared state machine utility |
| `__tests__/` | Package-level sync/type regression tests |

## Current patterns

- Prefer `as const` object enums over TypeScript `enum`.
- Prefer inferred Drizzle types (`typeof table.$inferSelect` / `$inferInsert`) over duplicated interfaces when possible.
- Keep shared models narrow and transport-safe (string/number/boolean primitives preferred for API payloads).
- Use consistent naming across packages (`snake_case` in DB fields, `camelCase` in code).

## Contract checks

Before adding a new entity/field that is used in both app and backend:

1. Add/update `schema.ts` types.
2. Export/update the matching contract in `index.ts`.
3. Add/adjust tests in `__tests__` for compatibility.

## Common exports to understand

- `UserRole`, `BusinessUserRole`, `SaleType`, `PaymentMethod`, `ProductType`, `ProductUnit`, `DistribucionStatus`
- `ApiResponse<T>` and API DTO helpers
- Finance helpers such as `calculateBalanceDue()`
- Domain constraints such as `VARIANTS_CONSTRAINTS`
- Period utilities: `getCalendarMonthPeriod()`, `isDateInPeriod()`, `periodToISOStrings()`

## Anti-patterns

- ❌ Adding shared exports without adding migration/type impact analysis.
- ❌ Reintroducing TS `enum` in new code.
- ❌ Exporting backend-only internals directly to frontend contract.
- ❌ Modifying `schema.ts` without updating corresponding contract fields in `index.ts`.
- ❌ Hand-rolling `Date.UTC` / `startOfMonth` / `endOfMonth` calculations. Use the shared period utilities (`getCalendarMonthPeriod`, `isDateInPeriod`, `periodToISOStrings`) instead.

## Testing

Run package checks when touching shared contracts:

```bash
cd packages/shared
bun run test
```

---

*For application and backend implementation usage, use package AGENTS in `packages/app/AGENTS.md` and `packages/backend/AGENTS.md`.*