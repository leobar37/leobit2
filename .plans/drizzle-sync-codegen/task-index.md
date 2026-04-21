# Drizzle Sync Codegen (SDK + Hooks) Task Index

## Summary

- Mode: Structured
- Slug: `drizzle-sync-codegen`
- Requirements File: `requirements.md`
- Checklist File: `checklist.json`

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-001` | `tasks/02-wire-sdk-generation-into-main-pipeline.md`, `tasks/03-complete-sdk-generator-crud-read-surface.md` |
| `FR-002` | `tasks/03-complete-sdk-generator-crud-read-surface.md` |
| `FR-003` | `tasks/03-complete-sdk-generator-crud-read-surface.md` |
| `FR-004` | `tasks/05-generate-sdk-backed-tanstack-hooks.md` |
| `FR-005` | `tasks/04-add-generated-sdk-runtime-and-react-provider.md`, `tasks/06-adapt-app-provider-and-bootstrap-sdk-context.md` |
| `FR-006` | `tasks/05-generate-sdk-backed-tanstack-hooks.md` |
| `FR-007` | `tasks/05-generate-sdk-backed-tanstack-hooks.md`, `tasks/07-migrate-entity-hooks-from-manual-to-generated.md` |
| `FR-008` | `tasks/03-complete-sdk-generator-crud-read-surface.md`, `tasks/08-align-sales-sync-contracts-and-wrapper-hooks.md` |
| `FR-009` | `tasks/03-complete-sdk-generator-crud-read-surface.md`, `tasks/05-generate-sdk-backed-tanstack-hooks.md` |
| `FR-010` | `tasks/01-freeze-codegen-contract-and-migration-target.md`, `tasks/08-align-sales-sync-contracts-and-wrapper-hooks.md` |
| `NFR-001` | `tasks/09-validate-rollout-and-deprecate-remote-hooks.md` |
| `NFR-002` | `tasks/03-complete-sdk-generator-crud-read-surface.md`, `tasks/09-validate-rollout-and-deprecate-remote-hooks.md` |
| `NFR-003` | `tasks/07-migrate-entity-hooks-from-manual-to-generated.md`, `tasks/09-validate-rollout-and-deprecate-remote-hooks.md` |
| `NFR-004` | `tasks/04-add-generated-sdk-runtime-and-react-provider.md`, `tasks/06-adapt-app-provider-and-bootstrap-sdk-context.md` |
| `NFR-005` | `tasks/02-wire-sdk-generation-into-main-pipeline.md`, `tasks/09-validate-rollout-and-deprecate-remote-hooks.md` |

## Task List

| Task ID | File | Purpose | Dependencies |
| --- | --- | --- | --- |
| `T-001` | `tasks/01-freeze-codegen-contract-and-migration-target.md` | Lock final SDK+hooks contract and migration boundaries | none |
| `T-002` | `tasks/02-wire-sdk-generation-into-main-pipeline.md` | Make generator emit SDK artifacts in the main pipeline | `T-001` |
| `T-003` | `tasks/03-complete-sdk-generator-crud-read-surface.md` | Complete SDK generator CRUD/read surface for all supported entities | `T-001`, `T-002` |
| `T-004` | `tasks/04-add-generated-sdk-runtime-and-react-provider.md` | Add SDK runtime/context provider in drizzle-sync React layer | `T-002`, `T-003` |
| `T-005` | `tasks/05-generate-sdk-backed-tanstack-hooks.md` | Replace remote-first hook generation with SDK-backed hooks | `T-002`, `T-003`, `T-004` |
| `T-006` | `tasks/06-adapt-app-provider-and-bootstrap-sdk-context.md` | Integrate SDK runtime in app provider bootstrap | `T-004`, `T-005` |
| `T-007` | `tasks/07-migrate-entity-hooks-from-manual-to-generated.md` | Migrate non-complex domain hooks to generated hooks | `T-005`, `T-006` |
| `T-008` | `tasks/08-align-sales-sync-contracts-and-wrapper-hooks.md` | Align sales/sale_items contracts and keep complex wrappers explicit | `T-003`, `T-005`, `T-006` |
| `T-009` | `tasks/09-validate-rollout-and-deprecate-remote-hooks.md` | End-to-end validation, rollout gates, and remote-first cleanup | `T-007`, `T-008` |

## Suggested Execution Order

1. `T-001` - Prevent contract drift before implementation.
2. `T-002` - Ensure all future generation runs through the new path.
3. `T-003` - Complete SDK behavior so hooks can rely on it.
4. `T-004` - Add runtime/provider needed by SDK-backed hooks.
5. `T-005` - Switch generated hooks to SDK-backed local-first behavior.
6. `T-006` - Wire app bootstrap/provider to consume runtime cleanly.
7. `T-007` - Migrate high-volume simple domains first.
8. `T-008` - Handle sales-specific contract and wrapper complexity.
9. `T-009` - Validate rollout and remove old remote-first path safely.

## Notes

- `T-007` and `T-008` can partially progress in parallel after `T-006`, but `T-009` requires both complete.
- Keep generated APIs basic and composable; complex business transitions stay in explicit wrapper hooks/services.
- Use `node ./planner-checklist.js next drizzle-sync-codegen` to track executable tasks during implementation.
