# T-003 — Create merged initDevTools() in app/devtools/console/index.ts

## Objective

Create `app/devtools/console/index.ts` that exports a single `initDevTools({ pg, services })` function merging both engine-level helpers (from T-002) and service-level helpers (from `app/lib/debug.ts`) into one `window.avileoDebug` object. This fixes the collision bug permanently.

## Requirements Covered

- `FR-001`
- `FR-003`
- `FR-004`
- `FR-005`
- `NFR-001`

## Dependencies

T-002 (engine helpers must be extracted first)

## Files or Areas Involved

- `packages/app/app/devtools/console/index.ts` — Create — merged initialization function
- `packages/app/app/devtools/console/service-helpers.ts` — Create — service-level helpers extracted from `app/lib/debug.ts`
- `packages/app/app/lib/debug.ts` — Modify — remove direct `window.avileoDebug` assignment; keep service helpers as exportable functions

## Actions

1. Create `app/devtools/console/service-helpers.ts`:
   - Copy the service-level helpers from `app/lib/debug.ts` (`purchases`, `drafts`, `suppliers`, `syncQueue`, `products`, `customers`, `sales`, `checkDuplicates`, `cleanupDuplicateProducts`, `clearIndexedDB`, `help`)
   - Refactor so they are not closure-based on module-level service vars but instead accept services as a parameter object
   - Export as `createServiceDebugHelpers(services)` returning the helper object

2. Create `app/devtools/console/index.ts`:
   - Import `initEngineDebug` from `./engine-helpers`
   - Import `createServiceDebugHelpers` from `./service-helpers`
   - Export `initDevTools({ pg, services })` that:
     a. Calls `initEngineDebug({ pg })` to get engine helpers
     b. Calls `createServiceDebugHelpers(services)` to get service helpers
     c. Merges both into one object: `{ ...engineHelpers, ...serviceHelpers }`
     d. Assigns merged object to `window.avileoDebug`
     e. Logs `"🔧 Avileo Debug ready! Run avileoDebug.help() for commands"`
   - Gate the entire module with `if (import.meta.env.DEV) { ... }` so it is a no-op in production builds

3. Update `app/lib/debug.ts`:
   - Remove the `if (typeof window !== "undefined") { window.avileoDebug = { ... } }` block
   - Keep the service helper functions and `registerDebugServices` export but make it a pure function returning the helpers (no side effect on `window`)
   - This allows `createServiceDebugHelpers` to reuse the logic without side effects

## Completion Criteria

- `app/devtools/console/index.ts` exports a single `initDevTools({ pg, services })` function
- Calling `initDevTools({ pg, services })` sets `window.avileoDebug` with all helpers from both engine and service layers
- The function is gated behind `import.meta.env.DEV`
- `app/lib/debug.ts` no longer directly assigns to `window.avileoDebug`; it exports pure helper functions

## Validation

- `bun run typecheck` in `packages/app`

## Risks or Notes

- The `DiagnosticReport` interface in `engine-helpers.ts` is quite large (lines 128–153 of provider.tsx). Keep it as part of the engine helpers module.
- `registerDebugServices` in `app/lib/debug.ts` currently uses module-level closures to hold service references. Refactor to pass services as a parameter to avoid stale closures.
- The merged `window.avileoDebug` object will have all methods from both sources — if there are naming conflicts (there shouldn't be), service helpers take precedence.
