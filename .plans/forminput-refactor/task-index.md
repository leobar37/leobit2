# FormInput Refactor Task Index

## Summary

- Mode: Structured
- Slug: `forminput-refactor`
- Requirements File: `requirements.md`
- Checklist File: `checklist.json`

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-001` | `tasks/01-core-forminput-flexibility.md` |
| `FR-002` | `tasks/01-core-forminput-flexibility.md` |
| `FR-003` | `tasks/01-core-forminput-flexibility.md` |
| `FR-004` | `tasks/02-align-form-select-date.md` |
| `FR-005` | `tasks/01-core-forminput-flexibility.md`, `tasks/02-align-form-select-date.md` |
| `FR-006` | `tasks/03-refactor-tag-form.md` |
| `FR-007` | `tasks/04-refactor-quick-tag-modal.md` |
| `FR-008` | `tasks/05-refactor-invitations.md` |
| `FR-009` | `tasks/06-refactor-team.md` |
| `FR-010` | `tasks/07-refactor-compras-page.md` |
| `NFR-001` | All tasks |
| `NFR-002` | `tasks/01-core-forminput-flexibility.md` |
| `NFR-003` | All tasks |
| `NFR-004` | All tasks |
| `NFR-005` | `tasks/08-create-documentation.md` |

## Task List

| Task ID | File | Purpose | Dependencies |
| --- | --- | --- | --- |
| `T-001` | `tasks/01-core-forminput-flexibility.md` | Make FormInput defensive and flexible | none |
| `T-002` | `tasks/02-align-form-select-date.md` | Apply same pattern to FormSelect and FormDate | T-001 |
| `T-003` | `tasks/03-refactor-tag-form.md` | Refactor tag-form.tsx to use FormProvider | T-001 |
| `T-004` | `tasks/04-refactor-quick-tag-modal.md` | Refactor quick-tag-modal.tsx to use FormProvider | T-001 |
| `T-005` | `tasks/05-refactor-invitations.md` | Refactor invitations.tsx drawer form to use FormProvider | T-001 |
| `T-006` | `tasks/06-refactor-team.md` | Refactor team.tsx drawer form to use FormProvider | T-001 |
| `T-007` | `tasks/07-refactor-compras-page.md` | Refactor compras page to use FormProvider | T-001 |
| `T-008` | `tasks/08-create-documentation.md` | Create AGENTS.md documentation for forms | T-001, T-002 |

## Suggested Execution Order

1. `T-001` - Foundation: Make FormInput flexible (blocks all others)
2. `T-002` - Align other form components with same pattern
3. `T-003` through `T-007` - Refactor affected files (can be done in parallel)
4. `T-008` - Documentation (after all refactors complete)

## Notes

- Tasks T-003 through T-007 can be executed in parallel after T-001 is complete
- Each refactor task follows the same pattern: wrap form with FormProvider, update FormInput usage
- The `punto-venta-form.tsx` uses both FormProvider AND spread register - it can be simplified after T-001
