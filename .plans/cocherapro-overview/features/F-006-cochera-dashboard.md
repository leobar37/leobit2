# F-006 — Cochera Dashboard

## Objective

Provide a CocheraPro dashboard with operational KPIs: vehicles entered today, vehicles currently inside, today’s income, month-to-date income, recent entries, and a 7-day income chart.

## Status

planned

## Owner

unassigned

## Scope Boundaries

### In Scope

- Dashboard API/query for CocheraPro metrics.
- Today count, active inside count, daily income, monthly income.
- 7-day income bar data.
- Recent entries list.
- Mode-aware dashboard UI for `businessMode: "cochera"`.

### Out of Scope

- Full reports table/export.
- Advanced analytics.
- Occupancy forecasting.
- Multi-garage dashboards.

## Verified Context

- Existing dashboard route is `packages/app/app/routes/_protected.dashboard.tsx`.
- Existing report/dashboard backend services are sales-centric and should not be reused blindly for parking revenue labels.
- Completed checkout transactions from `F-005` are the reliable source for income.
- Active session count comes from `F-004`.

## Assumptions

- Revenue metrics count completed transactions, not active vehicles.
- Dates should follow Peru business-day expectations unless `/plan` finds an existing timezone helper.
- Chart can use existing UI/chart patterns if available.

## Likely Files or Directories Involved

- `packages/backend/src/api/cochera-dashboard.ts`
- `packages/backend/src/services/business/cochera-dashboard.service.ts`
- `packages/backend/src/services/repository/cochera*.repository.ts`
- `packages/backend/src/plugins/services.ts`
- `packages/app/app/routes/_protected.dashboard.tsx`
- `packages/app/app/hooks/use-cochera-dashboard.ts`
- `packages/app/app/components/cochera/dashboard-stats.tsx`
- `packages/app/app/components/dashboard/`

## Dependencies on Other Feature IDs

- Depends on `F-005`.

## Parallelization Notes

Can run in parallel with reports/export and onboarding after checkout data is available. It should avoid changing shared checkout/session contracts.

## Worktree Recommendation

Group with reports in an insights worktree if one team owns aggregate read models.

## Suggested Branch/Worktree Name

- Branch: `feature/cochera-insights`
- Worktree: `../avileo-cochera-insights`

## Suggested `/plan` Mode

`structured`

## Decision Notes

None yet.

## Manual Overrides

None.
