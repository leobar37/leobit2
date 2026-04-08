# T-005 — Remove registerDebugServices from service-provider.tsx

## Objective

Remove the `registerDebugServices()` call from `service-provider.tsx` and replace it with a call to `addServiceDebugHelpers()` that **merges** service helpers onto the existing `window.avileoDebug` (rather than overwriting it). This completes the collision fix — engine helpers are set first, service helpers are merged in.

## Requirements Covered

- `FR-001`
- `FR-003`

## Dependencies

T-003 (merged `initDevTools` must exist with merge semantics)

## Files or Areas Involved

- `packages/app/app/lib/sync/service-provider.tsx` — Modify — remove `registerDebugServices` call, replace with `addServiceDebugHelpers`
- `packages/app/app/lib/debug.ts` — Modify — rename `registerDebugServices` to `addServiceDebugHelpers` and change it to merge onto existing `window.avileoDebug`

## Actions

1. In `app/lib/debug.ts`:
   - Rename `registerDebugServices` to `addServiceDebugHelpers`
   - Change it to merge onto existing `window.avileoDebug` instead of replacing it entirely:
     ```ts
     export function addServiceDebugHelpers(services: { purchaseService, supplierService, syncService, productService?, customerService?, saleService? }) {
       if (typeof window === "undefined" || !window.avileoDebug) return;
       const serviceHelpers = createServiceDebugHelpers(services);
       window.avileoDebug = { ...window.avileoDebug, ...serviceHelpers };
     }
     ```
   - Keep `createServiceDebugHelpers` (from T-003) as the pure function

2. In `service-provider.tsx`:
   - Remove `import { registerDebugServices } from "~/lib/debug"`
   - Replace `registerDebugServices({ ... })` call with `addServiceDebugHelpers({ ... })`
   - The call site (around line 197) remains the same, only the function name changes and the behavior changes from overwrite to merge

## Completion Criteria

- `service-provider.tsx` calls `addServiceDebugHelpers` instead of `registerDebugServices`
- `window.avileoDebug` contains all engine helpers (from provider.tsx) PLUS all service helpers (from ServicesProvider)
- No overwriting occurs; both sets of helpers coexist on the same object

## Validation

- `bun run typecheck` in `packages/app`

## Risks or Notes

- `addServiceDebugHelpers` must be called AFTER `provider.tsx` has initialized engine helpers — this is guaranteed because `EngineProvider` runs before `ServicesProvider` in the React tree (ServicesProvider is inside the EngineProvider's subtree in `_protected.tsx`)
- The merge order: engine helpers first (provider.tsx), service helpers second (ServicesProvider). If there are naming conflicts (there shouldn't be), service helpers take precedence due to spread order — this is acceptable since service helpers are more "complete" than raw PGlite queries
