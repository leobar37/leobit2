# T-001 Create Decimal Arithmetic Helpers

## Objective

Create a `decimal.ts` utility module that performs precision-safe arithmetic on string-encoded decimal numbers, eliminating the need for `Number()` conversions in sync handlers.

## Requirements Covered

- `FR-001`
- `NFR-001`

## Dependencies

- none

## Files or Areas Involved

- `packages/backend/src/lib/decimal.ts` — Create — new utility module
- `packages/backend/src/lib/` — Review — existing utilities for import patterns

## Actions

1. Create `packages/backend/src/lib/decimal.ts` with the following functions:
   - `subtract(a: string, b: string): string` — Subtract b from a. Returns `"0"` if result is negative. Handles arbitrary precision.
   - `max(a: string, b: string): string` — Return the larger of two decimal strings.
   - `isPositive(a: string): boolean` — Return true if the value is greater than `"0"`.
   - `toFixed(a: string, decimals: number): string` — Normalize a decimal string to exactly N decimal places (e.g., `"5"` → `"5.00"`).
2. Implementation approach: split strings into integer/fraction parts, pad, compare/subtract character-by-character. No `Number()` or `parseFloat()` — pure string manipulation.
3. Export all functions as named exports.

## Completion Criteria

- All four functions exist and handle edge cases: `"0"`, `"0.001"`, `"999999999.99"`, `"100"`, `"0.10"`
- `subtract("0.1", "0.05")` returns `"0.05"` (not `"0.05000000000000001"`)
- `subtract("5", "10")` returns `"0"` (floor at zero)
- `isPositive("0.001")` returns `true`
- `isPositive("0")` returns `false`
- `toFixed("5", 2)` returns `"5.00"`

## Validation

- `cd packages/backend && bun test` passes
- TypeScript compiles without errors

## Risks or Notes

- Keep the implementation simple — no need for a full arbitrary-precision library. These are bounded by DB column precision (12,2 and 10,3).
- If the string manipulation approach proves too complex, consider using BigInt internally (multiply by 10^scale, do integer math, divide back). This is simpler and safer.
