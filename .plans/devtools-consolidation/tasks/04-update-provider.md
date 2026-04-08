# T-004 — Update provider.tsx to remove debug code and call initDevTools

## Objective

Remove the inline `window.avileoDebug` block from `provider.tsx` and replace it with a call to `initDevTools({ pg, services })`. The provider should only handle engine initialization — devtools registration moves out.

## Requirements Covered

- `FR-001`
- `FR-002`
- `FR-003`

## Dependencies

T-003 (merged `initDevTools` must exist)

## Files or Areas Involved

- `packages/app/app/engine/provider.tsx` — Modify — remove inline debug code, add `initDevTools` call

## Actions

1. In `provider.tsx`, locate and remove:
   - The `window.avileoDebug = { ... }` block (lines 61–193) — but keep the `if (typeof window !== "undefined")` guard structure, just empty it or remove it entirely
   - The `console.log("[ENGINE-PROVIDER] Debug helper available...")` line
2. After `initDatabase()` succeeds (after line 218), add:
   ```ts
   // Initialize devtools (only in dev mode)
   if (import.meta.env.DEV) {
     import("~/devtools/console").then(({ initDevTools }) => {
       initDevTools({ pg, services: null }); // services registered separately by ServicesProvider
     });
   }
   ```
   Note: Since `initDevTools` is gated behind `import.meta.env.DEV`, the dynamic import is safe for production. Services are passed as `null` here because they aren't initialized yet — the services will register their helpers when `ServicesProvider` calls `registerDebugServices`. The engine helpers need `pg` which is now available.
3. Remove the `if (typeof window !== "undefined")` block entirely since `initDevTools` handles the window check internally
4. Update imports at the top of `provider.tsx` if needed

## Completion Criteria

- `provider.tsx` has no `window.avileoDebug` assignment code
- `provider.tsx` calls `initDevTools({ pg })` after `initDatabase()` resolves
- The debug helpers are available in browser console via `window.avileoDebug`
- `provider.tsx` still compiles and functions normally

## Validation

- `bun run typecheck` in `packages/app`

## Risks or Notes

- The `initDevTools` call uses dynamic import to avoid shipping devtools code in production bundles
- `services: null` is passed because service-level helpers will be added separately by `ServicesProvider` (handled in T-005)
- The timing: `initDatabase()` resolves → `initDevTools({ pg })` is called → engine helpers are registered → later `ServicesProvider` adds service helpers. This means `window.avileoDebug` is first set with engine helpers, then service helpers are added. Need to ensure the merge handles this correctly in T-003. If `ServicesProvider` is also calling something, we need to ensure it appends rather than overwrites. This is handled in T-005.
