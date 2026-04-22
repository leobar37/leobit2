# Engine-First Hooks Generation Task Index

## Summary

- Mode: Structured
- Slug: `engine-first-hooks-generation`
- Requirements File: `requirements.md`
- Checklist File: `checklist.json`

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-001` | `tasks/02-redesign-hooks-generator.md` |
| `FR-002` | `tasks/02-redesign-hooks-generator.md` |
| `FR-003` | `tasks/02-redesign-hooks-generator.md` |
| `FR-004` | `tasks/02-redesign-hooks-generator.md` |
| `FR-005` | `tasks/03-fix-output-directory.md` |
| `FR-006` | `tasks/03-fix-output-directory.md` |
| `FR-007` | `tasks/02-redesign-hooks-generator.md` |
| `NFR-001` | `tasks/04-e2e-validation.md`, `tasks/05-document-extension-pattern.md` |
| `NFR-002` | `tasks/01-fix-tenant-business-naming.md` |
| `NFR-003` | `tasks/04-e2e-validation.md` |

## Task List

| Task ID | File | Purpose | Dependencies |
| --- | --- | --- | --- |
| `T-001` | `tasks/01-fix-tenant-business-naming.md` | Align `service-generator.ts` naming with `BaseService` (`businessId` vs `tenantId`) | none |
| `T-002` | `tasks/02-redesign-hooks-generator.md` | Rewrite `hooks-generator.ts` to produce engine-first hooks using `useEngineService`, TanStack Query, and basic filters | `T-001` |
| `T-003` | `tasks/03-fix-output-directory.md` | Ensure all generated files go to `packages/app/app/lib/sync/generated/` and remove dead backend hooks | `T-002` |
| `T-004` | `tasks/04-e2e-validation.md` | Run generator end-to-end, verify TypeScript compilation, confirm custom hooks still work | `T-003` |
| `T-005` | `tasks/05-document-extension-pattern.md` | Document how developers extend generated hooks with domain-specific filters and logic | `T-004` |

## Suggested Execution Order

1. `T-001` — Fix the naming mismatch first; otherwise generated services will have constructor/runtime mismatches.
2. `T-002` — Redesign the core hooks generator; this is the largest piece of work.
3. `T-003` — Fix output paths and clean up dead backend artifacts; depends on T-002 because we need the new generator to know where to write.
4. `T-004` — Validate the entire pipeline compiles and existing custom hooks are unaffected.
5. `T-005` — Document the extension pattern for future developers.

## Notes

- `T-001` must be done before `T-002` because the hooks generator imports and references service types/methods that must be consistent.
- `T-003` and `T-002` could be done in a single branch but are separated for clarity.
- The existing `engine-hooks.ts` POC in `packages/app/app/hooks/engine-hooks.ts` can be deleted once T-002 is validated.
