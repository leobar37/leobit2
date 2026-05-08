# F-008 — Auth, Onboarding, and Access UX

## Objective

Wire Avileo Cocheras into existing login/register/business creation flows so users can create/select a Avileo Cocheras business, land in the correct routes, and see appropriate plan/limit status without introducing self-service upgrade flows.

## Status

planned

## Owner

unassigned

## Scope Boundaries

### In Scope

- Business creation option for `cochera`.
- Mode-aware landing/dashboard/navigation labels.
- First-run route to configure Cochera settings when missing (navigate to `/config/cochera`).
- Basic subscription status and limit notices in relevant screens.
- Ensure existing auth/session behavior works unchanged.

### Out of Scope

- New auth provider.
- Staff roles beyond existing business roles.
- External payment checkout for subscription upgrades.
- WhatsApp/contact-sales upgrade redirects.
- User-facing self-service plan changes.
- Multi-cochera ownership flows.

## Verified Context

- Auth already exists through Better Auth and app routes for login/register.
- `business_users` links users to businesses and roles.
- Business creation and dashboard currently have mode-aware behavior for existing modes.
- Cochera settings from `F-003` are needed for first-run completeness.
- Subscription status from `F-002` is needed for internal plan/limit notices.

## Assumptions

- Existing `ADMIN_NEGOCIO` and `VENDEDOR` roles are enough for MVP access control.
- Owners/admins configure rates; operators can register entries and checkouts.
- Exact role restrictions can be refined in `/plan`.

## Likely Files or Directories Involved

- `packages/app/app/routes/register.tsx`
- `packages/app/app/routes/login.tsx`
- `packages/app/app/routes/_protected.business.create.tsx`
- `packages/app/app/routes/_protected.dashboard.tsx`
- `packages/app/app/routes/_protected.config._index.tsx`
- `packages/app/app/components/layout/`
- `packages/app/app/hooks/use-auth.ts`
- `packages/app/app/hooks/use-business.ts`
- `packages/app/app/hooks/use-business-mode.ts`
- `packages/backend/src/api/businesses.ts`
- `packages/backend/src/services/business/business.service.ts`

## Dependencies on Other Feature IDs

- Depends on `F-001`, `F-002`, and `F-003`.

## Parallelization Notes

Can proceed after foundation/config/subscription contracts are stable. It can run in parallel with dashboard and reports because it focuses on access/navigation rather than data aggregates.

## Worktree Recommendation

Use a frontend-heavy onboarding worktree.

## Suggested Branch/Worktree Name

- Branch: `feature/cochera-onboarding`
- Worktree: `../avileo-cochera-onboarding`

## Suggested `/plan` Mode

`structured`

## Decision Notes

None yet.

## Manual Overrides

None.
