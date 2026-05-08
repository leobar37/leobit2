# Water Vertical Customer Profiles Task Index

## Summary

- Mode: Structured
- Slug: `water-vertical-customer-profiles`
- Requirements File: `requirements.md`
- Checklist File: `checklist.json`

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-001` | `tasks/01-vertical-data-model.md` |
| `FR-002` | `tasks/01-vertical-data-model.md`, `tasks/03-customer-profile-ui.md` |
| `FR-003` | `tasks/02-water-api-contracts.md`, `tasks/03-customer-profile-ui.md` |
| `FR-004` | `tasks/03-customer-profile-ui.md` |
| `FR-005` | `tasks/04-water-route-generation.md` |
| `FR-006` | `tasks/05-water-delivery-execution.md` |
| `FR-007` | `tasks/05-water-delivery-execution.md` |
| `FR-008` | `tasks/01-vertical-data-model.md`, `tasks/05-water-delivery-execution.md` |
| `FR-009` | `tasks/01-vertical-data-model.md`, `tasks/06-deposits-and-container-views.md` |
| `FR-010` | `tasks/07-water-onboarding-and-labels.md` |
| `FR-011` | `tasks/07-water-onboarding-and-labels.md` |
| `FR-012` | `tasks/06-deposits-and-container-views.md`, `tasks/08-water-dashboard-and-qa.md` |
| `FR-013` | `tasks/02-water-api-contracts.md` |
| `FR-014` | `tasks/01-vertical-data-model.md`, `tasks/02-water-api-contracts.md` |
| `NFR-001` | `tasks/03-customer-profile-ui.md`, `tasks/05-water-delivery-execution.md`, `tasks/08-water-dashboard-and-qa.md` |
| `NFR-002` | `tasks/03-customer-profile-ui.md`, `tasks/07-water-onboarding-and-labels.md` |
| `NFR-003` | `tasks/03-customer-profile-ui.md` |
| `NFR-004` | `tasks/02-water-api-contracts.md` |
| `NFR-005` | `tasks/01-vertical-data-model.md`, `tasks/02-water-api-contracts.md` |
| `NFR-006` | `tasks/01-vertical-data-model.md` |

## Task List

| Task ID | File | Purpose | Dependencies |
| --- | --- | --- | --- |
| `T-001` | `tasks/01-vertical-data-model.md` | Add typed water profile, container ledger, and deposit ledger data model | none |
| `T-002` | `tasks/02-water-api-contracts.md` | Add backend/shared contracts and service APIs for water profiles and ledgers | `T-001` |
| `T-003` | `tasks/03-customer-profile-ui.md` | Add water fields to customer create/edit/list/detail screens | `T-002` |
| `T-004` | `tasks/04-water-route-generation.md` | Generate water routes from customer schedules | `T-002` |
| `T-005` | `tasks/05-water-delivery-execution.md` | Record water delivery outcomes and update ledgers | `T-004` |
| `T-006` | `tasks/06-deposits-and-container-views.md` | Add operational views for containers and deposits | `T-005` |
| `T-007` | `tasks/07-water-onboarding-and-labels.md` | Replace polleria defaults/copy with water-aware seed data and labels | `T-002` |
| `T-008` | `tasks/08-water-dashboard-and-qa.md` | Add water dashboard metrics and run full QA | `T-003`, `T-005`, `T-006`, `T-007` |

## Suggested Execution Order

1. `T-001` - Establish the data model before UI or API work.
2. `T-002` - Expose typed, tenant-safe contracts for the frontend.
3. `T-003` - Make customer profile data capturable and visible.
4. `T-004` - Use profile schedules to generate route stops.
5. `T-005` - Let repartidores operate the route and produce ledger movements.
6. `T-006` - Add views for the operational balances created by deliveries.
7. `T-007` - Polish onboarding, seed data, and labels across existing surfaces.
8. `T-008` - Validate dashboard behavior and end-to-end water and polleria flows.

## Notes

- The plan intentionally separates customer profile fields from delivery execution data. Profile fields answer "what is normal for this customer"; route/visit records answer "what happened today".
- If `preferredRouteId` cannot cleanly map to an existing route/group concept, introduce a small dedicated water route model rather than overloading puntos de venta.
