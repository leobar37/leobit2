# F-007 — Cochera Reports and Export

## Objective

Add CocheraPro reporting for completed parking transactions with filters for today, this week, and this month, plus export capability for Professional plan users.

## Status

planned

## Owner

unassigned

## Scope Boundaries

### In Scope

- Filtered transaction report API.
- Report table with plate, entry time, exit time, duration, amount, and payment method.
- Summary metrics: total vehicles, total income, average per vehicle.
- Export action gated by subscription plan.
- Frontend report route and hooks.

### Out of Scope

- SUNAT reports.
- PDF ticket generation.
- Custom BI dashboards.
- Cross-business reporting.

## Verified Context

- Existing reporting code is primarily sales-oriented and should be used as a pattern, not as the data source.
- `F-005` creates completed parking transactions.
- `F-002` defines Professional-only export behavior.
- Frontend report routes exist for current domains and can guide UI conventions.

## Assumptions

- “Excel” may be implemented as CSV or XLSX depending on existing dependencies found during `/plan`.
- Free plan can view basic reports but not export, matching the product table.
- Filters should map to server-side date ranges to avoid client-only data slicing.

## Likely Files or Directories Involved

- `packages/backend/src/api/cochera-reports.ts`
- `packages/backend/src/services/business/cochera-report.service.ts`
- `packages/backend/src/services/repository/cochera*.repository.ts`
- `packages/backend/src/api/reports.ts`
- `packages/app/app/hooks/use-cochera-reports.ts`
- `packages/app/app/routes/_protected.cochera.reportes.tsx`
- `packages/app/app/components/cochera/report-table.tsx`

## Dependencies on Other Feature IDs

- Depends on `F-002` and `F-005`.

## Parallelization Notes

Can run in parallel with dashboard after checkout data exists. Coordinate export gating with subscription work.

## Worktree Recommendation

Group with dashboard in an insights worktree, or split if export requires backend-heavy work.

## Suggested Branch/Worktree Name

- Branch: `feature/cochera-insights`
- Worktree: `../avileo-cochera-insights`

## Suggested `/plan` Mode

`structured`

## Decision Notes

None yet.

## Manual Overrides

None.
