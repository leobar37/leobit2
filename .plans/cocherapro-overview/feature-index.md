# CocheraPro Feature Index

## Summary

- Mode: Initiative Overview
- Slug: `cocherapro-overview`
- Feature Briefs Directory: `features/`
- Dependency Graph: `dependency-graph.md`
- Worktree Strategy: `worktrees.md`

## Feature List

| Feature ID | Brief File | Goal | Suggested Plan Mode | Dependencies | Parallelizable | Status | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-001 | `features/F-001-business-mode-cochera.md` | Add `cochera` as a first-class Avileo business mode | `simple` | none | no | planned | unassigned |
| F-002 | `features/F-002-subscription-plans-limits.md` | Add Free/Professional subscription contracts and limit checks | `structured` | F-001 | yes | planned | unassigned |
| F-003 | `features/F-003-parking-configuration.md` | Add parking garage settings for rates, grace time, capacity, and payment methods | `structured` | F-001 | yes | planned | unassigned |
| F-004 | `features/F-004-vehicle-entry-session.md` | Register active vehicle entries and prevent duplicate active plates | `structured` | F-001 | yes | planned | unassigned |
| F-005 | `features/F-005-checkout-payment-calculation.md` | Close parking sessions with automatic fee calculation and payment capture | `structured` | F-002, F-003, F-004 | no | planned | unassigned |
| F-006 | `features/F-006-cochera-dashboard.md` | Show CocheraPro KPIs and 7-day income chart | `structured` | F-005 | yes | planned | unassigned |
| F-007 | `features/F-007-cochera-reports-export.md` | Add filtered reports and export for parking transactions | `structured` | F-002, F-005 | yes | planned | unassigned |
| F-008 | `features/F-008-auth-onboarding-access.md` | Wire CocheraPro into auth, business creation, routing, and access UX | `structured` | F-001, F-002, F-003 | yes | planned | unassigned |
| F-009 | `features/F-009-qa-seeds-fixtures.md` | Add demo data and validation coverage for core CocheraPro flows | `structured` | F-005, F-006, F-007, F-008 | no | planned | unassigned |

## Suggested Execution Waves

1. **Wave 1 - Mode Foundation**: `F-001`
2. **Wave 2 - Independent Foundations**: `F-002`, `F-003`, `F-004` in parallel after `F-001`
3. **Wave 3 - Checkout Core**: `F-005` after plans/subscription/config/session contracts exist
4. **Wave 4 - Insights and Access UX**: `F-006`, `F-007`, `F-008` after their dependencies
5. **Wave 5 - QA/Seeds**: `F-009` after core flows are available

## Change Log (for refreshes)

- Added: F-001, F-002, F-003, F-004, F-005, F-006, F-007, F-008, F-009
- Removed: none
- Split: none
- Merged: none

## Follow-up Commands

- `/plan .plans/cocherapro-overview/features/F-001-business-mode-cochera.md`
- `/plan .plans/cocherapro-overview/features/F-002-subscription-plans-limits.md`
- `/plan .plans/cocherapro-overview/features/F-003-parking-configuration.md`
- `/plan .plans/cocherapro-overview/features/F-004-vehicle-entry-session.md`
- `/plan .plans/cocherapro-overview/features/F-005-checkout-payment-calculation.md`
- `/plan .plans/cocherapro-overview/features/F-006-cochera-dashboard.md`
- `/plan .plans/cocherapro-overview/features/F-007-cochera-reports-export.md`
- `/plan .plans/cocherapro-overview/features/F-008-auth-onboarding-access.md`
- `/plan .plans/cocherapro-overview/features/F-009-qa-seeds-fixtures.md`
