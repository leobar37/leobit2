# Online-First Sync Removal — Learnings

## Conventions
- Backend: relative imports, `ctx` first parameter in repo/service methods.
- Frontend: path aliases `~` for lib/hooks, `@` for components.
- Drizzle schema index at `packages/backend/src/db/schema/index.ts` aggregates all table exports.
- `bun run build` is the root build command.

## Decisions
- Clean cut migration: no compatibility bridge, no drain/export.
- Session/business cache: remove persistence entirely, not replace with another cache.
- Public sale updates: API refetch/polling only, no SSE/WebSocket.
- Test strategy: manual agent QA + build/typecheck, no broad new unit/integration tests.

## Known Patterns
- Sales already online-first via Eden Treaty in `use-sales.ts`/`use-sales-db.ts`.
- Sync router from drizzle-sync is NOT mounted in backend `app.ts`.
- `useSaleSyncStatus` is a stub always returning synced.

## Gotchas
- `packages/app/app/lib/db/`, `packages/app/app/lib/services/`, `packages/app/app/lib/sync/` directories do NOT exist (AGENTS.md is outdated).
- `packages/shared/src/sync-config.ts` must be deleted completely, not renamed.
- Backend E2E only has `health.test.ts` — no business-flow E2E coverage yet.
- Many Playwright E2E tests are skipped due to PGlite init time.

## Dependencies
- Planning research completed; baseline inventory available in plan Context section.
