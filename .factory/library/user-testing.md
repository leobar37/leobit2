# User Testing

Testing surface, resource cost classification per surface.

---

## Validation Surface

This mission uses **automated validation only** (no browser/manual testing):
- `bun run typecheck` (packages/app)
- `bun run test --run` (packages/app — Vitest)
- `bun run test --run` (packages/backend — Vitest, tests that don't need DB)
- `bun run build` (root — turbo build)

No dev server, no database, no browser testing needed.

## Validation Concurrency

- Machine: 24 GB RAM, 12 cores
- All validation is CLI-based (typecheck, test, build)
- Max concurrent validators: **5** (CLI validators are lightweight, ~200MB each)

## Existing Test Files
- `packages/app/app/lib/sync/create-sync-hook.test.ts`
- `packages/app/app/lib/sync/shape-config.test.ts`
- `packages/app/app/lib/sync/pull-service.test.ts`
