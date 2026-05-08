# T-008 Water Dashboard And QA

## Objective

Add water-specific dashboard metrics and validate the complete agua workflow without regressing polleria.

## Requirements Covered

- `FR-012`
- `NFR-001`

## Dependencies

- `T-003`
- `T-005`
- `T-006`
- `T-007`

## Files or Areas Involved

- `packages/app/app/routes/_protected.dashboard.tsx` - Modify - Render water metrics for agua.
- `packages/app/app/hooks/` - Modify/Create - Add water dashboard summary hook.
- `packages/backend/src/services/business/report.service.ts` - Modify/Create - Add water summary data.
- `packages/app/e2e/` - Modify/Create - Add end-to-end water registration/customer/route tests.

## Actions

1. Add backend summary query for route progress, delivered bidons, pending stops, containers outside, active deposits, and receivables.
2. Render agua dashboard cards and avoid polleria kg/tara metrics for agua businesses.
3. Add empty states for new water businesses with clear next actions: create customers, generate route, complete delivery.
4. Add E2E coverage for agua registration, customer profile creation, route generation, delivery completion, and dashboard update.
5. Add regression QA for polleria registration, customer creation, and current sales flow.
6. Run mobile visual QA at 320px and 390x844, including dark mode.

## Completion Criteria

- Agua dashboard reflects route and container operations.
- Empty, loading, and error states are useful and mobile-friendly.
- Polleria dashboard and sales flow remain stable.
- QA evidence covers both API persistence and rendered UI state.

## Validation

- Run targeted backend tests for water summaries.
- Run app tests for dashboard/customer UI where available.
- Run E2E or browser QA against local backend/frontend services.
- Confirm no visible navbar/register regressions from earlier onboarding work.

## Risks or Notes

- Some repo-wide checks may already be noisy. If so, record blockers and run the narrowest checks that cover changed layers.
