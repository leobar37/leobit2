# Worker and Debug Boundary

Status: active (April 2026)

This note documents the current ownership boundary for worker bootstrapping and browser debug globals after the sync framework migration.

## Worker generation ownership

- Worker source is owned by `@avileo/drizzle-sync` in `packages/drizzle-sync/src/client/pglite.worker.ts`.
- Worker build output is produced by package build (`tsup`) to `dist/client/pglite.worker.js` via `packages/drizzle-sync/tsup.config.ts`.
- Runtime loading is handled inside the library at `packages/drizzle-sync/src/client/database-init.ts` using:
  - `new URL("./pglite.worker.js", import.meta.url)`
- `drizzle-sync generate` and `drizzle-sync build-schema` do not generate worker files. They only handle sync schema/codegen artifacts.

Consumer expectations:

- Use the package build output (`dist/**`) from `@avileo/drizzle-sync`.
- Keep worker mode enabled by default.
- Optionally disable worker mode with `VITE_DISABLE_PGLITE_WORKER=true` to force direct PGlite mode for debugging/fallback.

## Debug API ownership

- Browser debug globals are app-owned (not framework-owned), implemented in:
  - `packages/app/app/lib/debug/console/index.ts`
  - `packages/app/app/lib/debug/console/service-helpers.ts`
  - `packages/app/app/routes/_protected.tsx`
- Compatibility global remains `window.avileoDebug`.
- Metadata surface is `window.avileoDebugApi` with:
  - `version`
  - `initializedAt`
  - `helpers`
- Service helper registration keeps both surfaces in sync (`avileoDebug` and `avileoDebugApi.helpers`).

Compatibility contract:

- Existing console usage `window.avileoDebug.*` remains valid.
- New tooling should prefer `window.avileoDebugApi` for versioned introspection.
- This debug surface is explicitly app-specific and outside `@avileo/drizzle-sync` public API guarantees.

## Migration boundary

- Legacy `app/engine` and `app/devtools` runtime paths are no longer part of runtime initialization.
- Current runtime init path is engine-first (`SyncClientEngine`) plus app debug adapters in protected routes.
