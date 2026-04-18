# Standardize Numeric Handling - Requirements

## Objective

Eliminate all unnecessary numeric type conversions in the sync pipeline by standardizing on `string` for decimal values and providing precision-safe arithmetic utilities.

## Scope

- In scope: Sync handler numeric casts, service interface types for decimal fields, string-based decimal arithmetic helpers, precision tests
- Out of scope: Frontend, non-sync APIs, DB schema changes, rounding policies

## Functional Requirements

- `FR-001` — A `decimal.ts` utility module must exist at `packages/backend/src/lib/decimal.ts` providing: `subtract(a, b)`, `max(a, b)`, `isPositive(a)`, `toFixed(a, decimals)`. All functions accept and return strings.
- `FR-002` — `SaleSyncHandler` must not use `Number()` on any decimal field. The `balanceDue` calculation (line 61), the payment check (line 76), and the payment amount (line 82) must use the decimal helpers or direct string comparison.
- `FR-003` — `DistribucionService.CreateDistribucionItemInput` must accept `cantidadAsignada` as `string` instead of `number`. The service must not call `.toString()` on this field before DB insert.
- `FR-004` — `DistribucionSyncHandler` must not use `Number()` on `cantidadAsignada` (line 57). The value from the schema (string) must pass through to the service unchanged.
- `FR-005` — Precision regression tests must verify that values like `"999999999.99"`, `"0.001"`, `"0.1"` survive the full schema → handler → service pipeline without loss.

## Non-Functional Requirements

- `NFR-001` — No precision loss for values up to 12 digits before decimal point and 3 digits after (matching DB schema precision).
- `NFR-002` — All existing sync handler tests must continue passing without modification to test data.

## Acceptance Criteria

- `grep -r "Number(" packages/backend/src/services/sync/handlers/ --include="*.ts"` returns zero matches (except for integer `version` fields if any)
- `grep -r "parseFloat\|parseInt" packages/backend/src/services/sync/handlers/ --include="*.ts"` returns zero matches
- `grep -r "\.toFixed\|\.toString()" packages/backend/src/services/sync/handlers/ --include="*.ts"` returns zero matches
- All existing tests pass
- New precision tests pass

## Constraints

- No breaking changes to repository interfaces that are used by non-sync code paths
- The `distribucion.service.ts` change must update the exported interface type, which may affect other callers (API routes, other services)

## Open Questions

- None — the analysis confirmed all type flows end-to-end
