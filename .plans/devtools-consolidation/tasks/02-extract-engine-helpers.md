# T-002 — Extract engine-level helpers from provider.tsx

## Objective

Extract the `window.avileoDebug` engine-level helpers currently inline in `provider.tsx` (lines 63–191) into a dedicated module `app/devtools/console/engine-helpers.ts`. These are low-level PGlite raw-query helpers (`getProducts`, `checkAllTables`, `copyDiagnosticReport`, `forceResync`, `checkLocalStorage`, `query`, `getProductsForBusiness`).

## Requirements Covered

- `FR-001`
- `FR-002`
- `FR-003`
- `FR-004`

## Dependencies

T-001 (devtools folder structure must exist)

## Files or Areas Involved

- `packages/app/app/devtools/console/engine-helpers.ts` — Create — extracted helpers
- `packages/app/app/engine/provider.tsx` — Modify — remove lines 61–193 (the `window.avileoDebug` block)

## Actions

1. Read `provider.tsx` lines 61–193 to identify all helpers
2. Create `app/devtools/console/engine-helpers.ts`
3. Export a function `initEngineDebug({ pg })` that:
   - Takes a `pgRef` (or `pg` instance) as parameter
   - Returns an object with all engine-level helpers bound to that pg instance
   - The returned helpers are: `getProducts`, `getProductCount`, `checkAllTables`, `getProductsForBusiness`, `query`, `forceResync`, `checkLocalStorage`, `copyDiagnosticReport`
4. The helper objects and interfaces (e.g. `DiagnosticReport` interface) are also moved
5. In `provider.tsx`, replace the inline `window.avileoDebug` block with a call to `initEngineDebug({ pg: pgRef.current })` — but do NOT register yet, just keep the shape for now (full registration happens in T-003)

## Completion Criteria

- `app/devtools/console/engine-helpers.ts` exports `initEngineDebug({ pg })`
- All helpers from lines 63–191 are extracted with identical logic
- `provider.tsx` no longer contains the `window.avileoDebug = { ... }` block, but still calls `initEngineDebug` (will be fully integrated in T-003)
- `provider.tsx` still compiles and runs (types: `pg: PGlite | null`)

## Validation

- `bun run typecheck` in `packages/app`

## Risks or Notes

- `copyDiagnosticReport` calls `pg.query()` directly — ensure the pg reference is stable
- `forceResync` calls `indexedDB.deleteDatabase("avileo-pg")` and `location.reload()` — this is correct and preserved
- `checkLocalStorage` reads `localStorage` keys: `bearer_token`, `current_business_id`, `avileo_schema_version`, `avileo_pull_cursor` — all preserved
