# Devtools Consolidation — Task Index

## Summary

- Mode: Structured
- Slug: `devtools-consolidation`
- Requirements File: `requirements.md`
- Checklist File: `checklist.json`

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-001` (no collision) | T-003 (merge), T-005 (addServiceDebugHelpers) |
| `FR-002` (single home) | T-001 (folder), T-002 (extract), T-004 (provider cleanup) |
| `FR-003` (all helpers work) | T-002 (engine), T-003 (service merge), T-005 (addServiceDebugHelpers) |
| `FR-004` (copyDiagnosticReport) | T-002 (engine helpers), T-005 (merge) |
| `FR-005` (DebugActions) | T-001 (move components), T-003 (merge) |
| `FR-006` (DebugWidget) | T-001 (move components) |
| `FR-007` (no broken imports) | T-006 (update imports), T-007 (cleanup) |
| `NFR-001` (DEV gating) | T-003 (import.meta.env.DEV in initDevTools) |
| `NFR-002` (provider cleanup) | T-004 (remove debug code from provider.tsx) |

## Task List

| Task ID | File | Purpose | Dependencies |
| --- | --- | --- | --- |
| `T-001` | `tasks/01-create-devtools-folder.md` | Create `app/devtools/` folder structure and move UI components | none |
| `T-002` | `tasks/02-extract-engine-helpers.md` | Extract engine-level helpers from `provider.tsx` into `devtools/console/engine-helpers.ts` | T-001 |
| `T-003` | `tasks/03-create-merged-init.md` | Create merged `initDevTools()` in `devtools/console/index.ts` | T-002 |
| `T-004` | `tasks/04-update-provider.md` | Update `provider.tsx` to remove inline debug code and call `initDevTools` | T-003 |
| `T-005` | `tasks/05-update-service-provider.md` | Remove `registerDebugServices`, replace with `addServiceDebugHelpers` (merge not overwrite) | T-003 |
| `T-006` | `tasks/06-update-imports.md` | Update all import paths from old locations to `~/devtools/*` | T-001, T-003, T-005 |
| `T-007` | `tasks/07-cleanup-old-files.md` | Delete old empty folders and run final typecheck verification | T-006 |

## Suggested Execution Order

1. `T-001` — Foundation: creates the folder and moves UI components. No dependencies.
2. `T-002` — Extract engine helpers from provider.tsx. Depends on T-001.
3. `T-003` — Create merged init. Depends on T-002.
4. `T-004` — Update provider.tsx. Depends on T-003.
5. `T-005` — Update service-provider.tsx. Depends on T-003 (same step, can run in parallel with T-004).
6. `T-006` — Update imports. Depends on T-001, T-003, T-005. Can start after T-001 is done but needs T-003 to be complete for full verification.
7. `T-007` — Cleanup. Depends on T-006.

## Notes

- T-004 and T-005 are independent and can be executed in parallel after T-003
- T-001 can be verified independently (folder created, files moved) before T-002–T-007 begin
- The `DiagnosticReport` interface in engine helpers is large — keep it as-is during extraction to minimize risk
- The duplicate re-export at `app/components/sync/sync-devtools-drawer.tsx` is deleted in T-007
