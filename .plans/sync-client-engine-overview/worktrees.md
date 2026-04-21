# SyncClientEngine Worktree Recommendations

## Strategy

This initiative spans both `@avileo/drizzle-sync` (library) and `packages/app` (frontend). The foundation features (F-001, F-002) primarily touch the library, while integration features (F-003, F-004, F-005) touch the app.

Because the library changes must be built before the app can consume them, and because the app has complex provider nesting that needs careful migration, **Wave 1 should stay in the main tree** for rapid iteration. **Wave 2 features can branch** for parallel work, but should merge back before Wave 3 integration begins.

## Recommended Worktree Matrix

| Feature ID | Recommended | Branch Name | Worktree Path | Rationale |
| --- | --- | --- | --- | --- |
| `F-001` | no | `feature/sync-engine-core` | n/a | Foundation class; requires running build/tests across library boundary |
| `F-002` | yes | `feature/sync-entity-api-generation` | `../wt-sync-entity-api` | Code generation is isolated; safe to parallelize |
| `F-003` | yes | `feature/sync-react-integration` | `../wt-sync-react-integration` | React layer is independent of generator output |
| `F-004` | no | `feature/sync-frontend-migration` | n/a | Integration requires both F-002 and F-003 merged; do in main tree |
| `F-005` | yes | `feature/sync-invalidation-config` | `../wt-sync-invalidation` | Configuration extension; low risk to parallelize |

## Parallel Waves

1. **Wave 1 (single tree)**: `F-001` — Build engine core in main tree, run full test suite
2. **Wave 2 (parallel worktrees)**: `F-002`, `F-003`, `F-005` — Branch out, work in parallel
3. **Wave 3 (single tree integration)**: Merge F-002, F-003, F-005 back to main, then `F-004`

## Operational Notes

- Recommendations only. Do not create branches/worktrees automatically.
- Keep branch naming predictable and feature-scoped.
- F-001 must be merged to `main` (or `develop`) before Wave 2 branches can install the updated library.
- Re-evaluate recommendations when dependencies change.
