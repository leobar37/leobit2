# SyncClientEngine Core — Task Index

## Summary

- Mode: Structured
- Slug: `sync-client-engine-core`
- Requirements File: `requirements.md`
- Checklist File: `checklist.json`

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-001` | `tasks/01-config-types.md` |
| `FR-002` | `tasks/02-engine-class.md` |
| `FR-003` | `tasks/02-engine-class.md` |
| `FR-004` | `tasks/02-engine-class.md` |
| `FR-005` | `tasks/02-engine-class.md` |
| `FR-006` | `tasks/03-service-registry.md` |
| `FR-007` | `tasks/02-engine-class.md` |
| `FR-008` | `tasks/04-factory-entry-point.md` |
| `FR-009` | `tasks/02-engine-class.md` |
| `FR-010` | `tasks/02-engine-class.md` |
| `FR-011` | `tasks/04-factory-entry-point.md` |
| `FR-012` | `tasks/03-service-registry.md` |
| `NFR-001` | `tasks/04-factory-entry-point.md`, `tasks/05-integration-validation.md` |
| `NFR-002` | `tasks/02-engine-class.md` |
| `NFR-003` | `tasks/01-config-types.md` |
| `NFR-004` | `tasks/02-engine-class.md` |
| `NFR-005` | `tasks/03-service-registry.md` |

## Task List

| Task ID | File | Purpose | Dependencies |
| --- | --- | --- | --- |
| `T-001` | `tasks/01-config-types.md` | Define all config and type interfaces for the engine | none |
| `T-002` | `tasks/02-engine-class.md` | Implement SyncClientEngine class with lifecycle and event bridge | `T-001` |
| `T-003` | `tasks/03-service-registry.md` | Add service registry to engine for domain service management | `T-001`, `T-002` |
| `T-004` | `tasks/04-factory-entry-point.md` | Create factory function and wire client entry point in package | `T-001`, `T-002`, `T-003` |
| `T-005` | `tasks/05-integration-validation.md` | Integration validation proving the engine contract works end-to-end | `T-001`, `T-002`, `T-003`, `T-004` |

## Suggested Execution Order

1. `T-001` — Foundation: config types must exist before anything else can compile
2. `T-002` — Core engine: the main class that composes all runtime components
3. `T-003` — Service registry: extends the engine class with entity service management
4. `T-004` — Factory + entry point: wires everything for external consumption
5. `T-005` — Integration validation: proves the full contract before downstream features begin

## Notes

- T-001 through T-004 can be executed by a single `/build-plan` run since they form a linear dependency chain.
- T-005 is validation-only and does not add production code.
- This plan is the foundation for F-002 (code generation), F-003 (React integration), F-004 (provider migration), and F-005 (cache invalidation rules). The engine's public API must be stable before those features begin.
