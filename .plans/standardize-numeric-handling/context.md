# Standardize Numeric Handling - Context

## Overview

The sync handlers have inconsistent numeric type handling. Decimal values (amounts, quantities, prices) are repeatedly converted between `string` and `number` across layers: database (Drizzle returns strings for `decimal`), validation schemas (Zod transforms to strings), and handlers (cast back to `Number()` for arithmetic). This "type ping-pong" causes precision loss, redundant defensive code, and subtle bugs.

The fix: establish **strings as the standard type** for all decimal values, with a helper library for precision-safe string arithmetic.

## Background

### Current Type Flow (Broken)

```
Frontend sends number|string
  → Zod schema: numericStringTransform → string
    → Handler: Number() → number (for arithmetic)
      → Service: .toString() → string (for DB)
        → Drizzle: decimal → string (from DB reads)
```

### Problems Verified by Code Inspection

| File | Line | Problem |
|------|------|---------|
| `SaleSyncHandler.ts` | 61 | `String(Math.max(Number(parsed.totalAmount) - Number(parsed.amountPaid \|\| 0), 0))` — triple conversion |
| `SaleSyncHandler.ts` | 76 | `Number(parsed.amountPaid \|\| 0) > 0` — unnecessary Number() for comparison |
| `SaleSyncHandler.ts` | 82 | `Number(parsed.amountPaid \|\| 0).toFixed(2)` — toFixed adds trailing zeros; repo expects string |
| `DistribucionSyncHandler.ts` | 57 | `Number(item.cantidadAsignada)` — schema outputs string, service interface expects number |
| `distribucion.service.ts` | 177,564,700,763 | `.toString()` — converts back to string for DB insert |
| `distribucion.service.ts` | 28 | `cantidadAsignada: number` — interface forces number type |
| `distribucion.service.ts` | 438 | `parseFloat(item.cantidadAsignada)` — parses DB string to number for comparison |

### Key Interface Types

- `PaymentRepository.createInitialPayment` expects `amount: string` — so SaleSyncHandler line 82's `.toFixed(2)` is doubly unnecessary
- `DistribucionService.CreateDistribucionItemInput` expects `cantidadAsignada: number` — root cause of handler's Number() cast
- All Drizzle `decimal()` columns return strings — the DB layer is already string-native

## Goal

- Zero `Number()` calls on decimal fields in sync handlers
- Zero `.toString()` conversions in services that accept numeric inputs
- A `decimal.ts` helper module for string-based arithmetic (subtract, max, isPositive)
- Precision regression tests covering edge cases

## Key Decisions

- **Standard type**: `string` for all decimal numeric values throughout backend
- **Arithmetic**: Dedicated string-based helpers, no native `Number()` for monetary/quantity math
- **Comparison**: String comparison helpers (`isPositive`, `isGreaterThan`) to avoid Number()
- **No DB changes**: Drizzle schema stays as-is (already returns strings)

## Scope Boundaries

### In Scope
- `packages/backend/src/lib/decimal.ts` — new helper module
- `packages/backend/src/services/sync/handlers/SaleSyncHandler.ts`
- `packages/backend/src/services/sync/handlers/DistribucionSyncHandler.ts`
- `packages/backend/src/services/business/distribucion.service.ts`
- `packages/backend/src/services/sync/schemas/index.ts` (documentation only)
- Precision regression tests

### Out of Scope
- Frontend numeric handling (separate codebase concern)
- Non-sync API endpoints
- Database schema changes (no migrations)
- Currency formatting / display logic
- Rounding policy changes (business rule)
- `PurchaseSyncHandler` (already uses strings consistently)
- `registry.ts` generic handlers (already pass strings correctly)
