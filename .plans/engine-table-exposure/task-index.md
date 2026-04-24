# Engine Table Exposure - Task Index

## Summary

- Mode: Structured
- Slug: `engine-table-exposure`
- Requirements File: `requirements.md`
- Checklist File: `checklist.json`

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-001` | `tasks/01-generate-drizzle-schema.md`, `tasks/02-extend-engine-tables.md` |
| `FR-002` | `tasks/03-update-base-service.md` |
| `FR-003` | `tasks/04-refactor-custom-services.md` |
| `FR-004` | `tasks/01-generate-drizzle-schema.md` |
| `FR-005` | `tasks/05-update-code-generator.md` |
| `FR-006` | `tasks/02-extend-engine-tables.md` |
| `NFR-001` | `tasks/02-extend-engine-tables.md` |
| `NFR-002` | `tasks/02-extend-engine-tables.md` |
| `NFR-003` | `tasks/03-update-base-service.md` |
| `NFR-004` | `tasks/01-generate-drizzle-schema.md` |

## Task List

| Task ID | File | Purpose | Dependencies |
| --- | --- | --- | --- |
| `T-001` | `tasks/01-generate-drizzle-schema.md` | Create drizzle-schema.ts with all table re-exports | none |
| `T-002` | `tasks/02-extend-engine-tables.md` | Add typed `tables` property to SyncClientEngine | `T-001` |
| `T-003` | `tasks/03-update-base-service.md` | Expose `this.tables` in BaseService for all subclasses | `T-002` |
| `T-004` | `tasks/04-refactor-custom-services.md` | Refactor all custom services to use `this.tables` | `T-003` |
| `T-005` | `tasks/05-update-code-generator.md` | Update code generator to produce drizzle-schema.ts | `T-001` |
| `T-006` | `tasks/06-validation-testing.md` | Type check, verify imports, ensure no regressions | `T-004`, `T-005` |

## Suggested Execution Order

1. `T-001` - Generate the schema file first (foundation)
2. `T-002` - Extend engine with `tables` property (depends on T-001 for imports)
3. `T-003` - Update BaseService (depends on T-002 for engine interface)
4. `T-004` - Refactor custom services (depends on T-003 for `this.tables`)
5. `T-005` - Update generator (can run in parallel with T-004 since it only affects future generation)
6. `T-006` - Validation (depends on all implementation tasks)

## Notes

- `T-004` is the largest task (6+ service files). Consider splitting by service if needed.
- `T-005` (generator update) is independent of `T-002`, `T-003`, `T-004` but should follow `T-001` for consistency.
- The generated `drizzle-schema.ts` should be checked into git alongside other generated files.
