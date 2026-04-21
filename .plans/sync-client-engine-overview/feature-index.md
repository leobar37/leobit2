# SyncClientEngine Feature Index

## Summary

- Mode: Initiative Overview
- Slug: `sync-client-engine-overview`
- Feature Briefs Directory: `features/`
- Dependency Graph: `dependency-graph.md`
- Worktree Strategy: `worktrees.md`

## Feature List

| Feature ID | Brief File | Goal | Suggested Plan Mode | Dependencies | Parallelizable | Status | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-001 | `features/F-001-sync-client-engine-core.md` | Create SyncClientEngine class in drizzle-sync library | `structured` | none | no | planned | backend |
| F-002 | `features/F-002-entity-api-generation.md` | Generate typed entity APIs and React hooks | `structured` | F-001 | no | planned | backend |
| F-003 | `features/F-003-react-integration.md` | Create SyncEngineProvider and React hooks integration | `structured` | F-001 | yes | planned | frontend |
| F-004 | `features/F-004-frontend-migration.md` | Migrate existing providers and manual hooks to engine | `structured` | F-002, F-003 | no | planned | frontend |
| F-005 | `features/F-005-cache-invalidation-config.md` | Configurable per-entity cache invalidation strategies | `simple` | F-001 | yes | planned | backend |

## Suggested Execution Waves

1. **Wave 1 - Foundation**: `F-001` (engine core class)
2. **Wave 2 - Generation & React**: `F-002` (entity APIs), `F-003` (React integration) — parallel after F-001
3. **Wave 3 - Migration**: `F-004` (frontend migration) after F-002 and F-003
4. **Wave 4 - Polish**: `F-005` (invalidation config) can run alongside F-004

## Change Log (for refreshes)

- Added: F-001, F-002, F-003, F-004, F-005
- Removed: none
- Split: none
- Merged: none

## Follow-up Commands

- `/plan .plans/sync-client-engine-overview/features/F-001-sync-client-engine-core.md`
- `/plan .plans/sync-client-engine-overview/features/F-002-entity-api-generation.md`
- `/plan .plans/sync-client-engine-overview/features/F-003-react-integration.md`
- `/plan .plans/sync-client-engine-overview/features/F-004-frontend-migration.md`
- `/plan .plans/sync-client-engine-overview/features/F-005-cache-invalidation-config.md`
