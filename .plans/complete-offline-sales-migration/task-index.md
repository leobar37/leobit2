# Complete Offline Sales Migration Task Index

## Summary

- Mode: Structured
- Slug: `complete-offline-sales-migration`
- Requirements File: `requirements.md`
- Checklist File: `checklist.json`

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-001` | `tasks/01-canonical-contracts-and-schema-parity.md`, `tasks/04-frontend-service-identity-and-hooks.md` |
| `FR-002` | `tasks/01-canonical-contracts-and-schema-parity.md` |
| `FR-003` | `tasks/02-backend-sync-conflict-integrity.md` |
| `FR-004` | `tasks/02-backend-sync-conflict-integrity.md`, `tasks/03-operation-grouping-and-ordering.md` |
| `FR-005` | `tasks/05-atomic-sales-and-payment-services.md` |
| `FR-006` | `tasks/03-operation-grouping-and-ordering.md`, `tasks/05-atomic-sales-and-payment-services.md` |
| `FR-007` | `tasks/04-frontend-service-identity-and-hooks.md`, `tasks/06-cobros-ui-and-balance-flow.md` |
| `FR-008` | `tasks/05-atomic-sales-and-payment-services.md`, `tasks/06-cobros-ui-and-balance-flow.md` |
| `FR-009` | `tasks/07-validation-and-offline-gold-path.md` |
| `NFR-001` | `tasks/02-backend-sync-conflict-integrity.md` |
| `NFR-002` | `tasks/04-frontend-service-identity-and-hooks.md`, `tasks/05-atomic-sales-and-payment-services.md`, `tasks/06-cobros-ui-and-balance-flow.md` |
| `NFR-003` | `tasks/01-canonical-contracts-and-schema-parity.md` |
| `NFR-004` | all tasks |
| `NFR-005` | `tasks/07-validation-and-offline-gold-path.md` |
| `NFR-006` | `tasks/06-cobros-ui-and-balance-flow.md` |

## Task List

| Task ID | File | Purpose | Dependencies |
| --- | --- | --- | --- |
| `T-001` | `tasks/01-canonical-contracts-and-schema-parity.md` | Establish one contract for entities, schemas, enums, versions, and generated artifacts. | none |
| `T-002` | `tasks/02-backend-sync-conflict-integrity.md` | Make backend sync handlers, repositories, and conflict resolvers reliable for the target flow. | `T-001` |
| `T-003` | `tasks/03-operation-grouping-and-ordering.md` | Add explicit grouping/correlation semantics for compound offline operations. | `T-001`, `T-002` |
| `T-004` | `tasks/04-frontend-service-identity-and-hooks.md` | Migrate frontend hooks and service typing to canonical local services. | `T-001` |
| `T-005` | `tasks/05-atomic-sales-and-payment-services.md` | Make sale/item/payment local writes atomic, grouped, and balance-consistent. | `T-003`, `T-004` |
| `T-006` | `tasks/06-cobros-ui-and-balance-flow.md` | Complete UI flow needed to exercise cobros and sale/customer balances offline. | `T-004`, `T-005` |
| `T-007` | `tasks/07-validation-and-offline-gold-path.md` | Add/repair tests and run validation for the full offline sync path. | `T-001`, `T-002`, `T-003`, `T-004`, `T-005`, `T-006` |

## Suggested Execution Order

1. `T-001` - Contract alignment must happen before generated services and payload validation are trusted.
2. `T-002` - Backend sync must enforce versions, tenant safety, and explicit failures before frontend flows depend on it.
3. `T-003` - Grouping semantics should be added after backend behavior is understood and before local compound writes rely on them.
4. `T-004` - Frontend service identity can proceed once canonical entity naming is fixed.
5. `T-005` - Atomic sales/payment services depend on both service identity and grouping metadata.
6. `T-006` - UI flow should be completed after service behavior is stable enough to expose.
7. `T-007` - Final validation depends on all implementation tasks.

## Notes

- Generated files should only be changed by the generator workflow. If a task needs generated output, update the source schema/config/generator first, then run `bun run sync:generate`.
- If `T-001` determines aliases are required for existing persisted sync queue rows, document that as an explicit compatibility decision before implementing alias behavior.
- The existing project-local `planner-checklist.js` should be used to track task status during execution.
