# F-006 — Cochera Dashboard

## Objective

Adapt the existing `/dashboard` core route for `businessMode: "cochera"` with parking KPIs: vehicles entered today, vehicles currently inside, today's income, month-to-date income, recent entries, and a 7-day income chart.

## Status

planned

## Owner

unassigned

## Scope Boundaries

### In Scope

- Backend aggregate queries for Avileo Cocheras metrics (today count, active inside, daily income, monthly income, 7-day income data).
- Mode-aware rendering in the existing `_protected.dashboard.tsx` route.
- Cochera-relevant quick actions (Nueva Entrada, Vehiculos, Configuracion).
- Hide polleria/agua-specific metrics (sales, kilos, debtors, distribution) when in cochera mode.
- 7-day income chart using existing chart UI patterns.

### Out of Scope

- New `/cochera/dashboard` route or separate dashboard module.
- Full reports table/export.
- Advanced analytics.
- Occupancy forecasting.
- Multi-garage dashboards.

## Verified Context

- Existing dashboard route is `packages/app/app/routes/_protected.dashboard.tsx`.
- The dashboard currently shows sales-centric metrics and quick actions (Ventas, Clientes, Cobros, Gastos).
- For cochera mode, these are irrelevant; the dashboard should show parking-focused content instead.
- Completed checkout transactions from `F-005` are the reliable source for income.
- Active session count comes from `F-004`.

## Assumptions

- Revenue metrics count completed transactions, not active vehicles.
- Dates should follow Peru business-day expectations unless `/plan` finds an existing timezone helper.
- Chart can use existing UI/chart patterns if available.
- The dashboard will use an early-return pattern for `isCocheraMode` to avoid polluting the existing sales dashboard logic.

## Likely Files or Directories Involved

- `packages/backend/src/services/business/cochera-session.service.ts` (add aggregate methods)
- `packages/backend/src/services/repository/cochera-session.repository.ts` (add aggregate queries)
- `packages/backend/src/api/cochera-sessions.ts` (add dashboard aggregate endpoint)
- `packages/app/app/routes/_protected.dashboard.tsx` (mode-aware rendering)
- `packages/app/app/hooks/use-cochera-dashboard.ts` (TanStack Query hook for aggregates)
- `packages/app/app/components/dashboard/` (reuse existing chart components)

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

- The dashboard must remain a single core surface. Do not create a separate `/cochera/dashboard` route.
- If the existing dashboard becomes too large with mode-specific branches, extract `PolleriaDashboardContent`, `WaterDashboardContent`, and `CocheraDashboardContent` as local components within the same route file.

## Manual Overrides

None.
