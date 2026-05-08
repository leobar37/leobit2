# F-002 — Subscription Plans and Limits

## Objective

Define and enforce Avileo Cocheras Free/Professional subscription behavior as an internal Avileo/Avileo Cocheras control so Free tenants are limited and Professional tenants unlock unlimited records, full reports, and export capabilities.

## Status

planned

## Owner

unassigned

## Scope Boundaries

### In Scope

- Shared subscription constants/types for `gratis` and `profesional`.
- Tenant-scoped subscription storage or plan source.
- Free-plan monthly record limit for Avileo Cocheras.
- Backend limit-check service/API surfaces that downstream checkout/session flows can call.
- Frontend plan/status hooks and limit/status notices where needed.

### Out of Scope

- External payment processor integration.
- Automatic recurring billing.
- User-facing upgrade buttons, WhatsApp redirects, or self-service plan changes.
- Invoices or receipts for subscriptions.

## Verified Context

- No durable subscription/billing model was found in the current source.
- Existing business data is tenant-scoped through `businessId`.
- Avileo Cocheras plan decisions are product requirements: Gratis `S/ 0/mes` up to 50 records/month and basic reports; Profesional `S/ 49/mes` unlimited records, full reports, and Excel/export capability.
- Subscription enforcement should integrate with Avileo Cocheras session/checkout flows but remain reusable.

## Assumptions

- “Records/month” means completed checkout transactions unless product later defines entries differently.
- Plan can initially be manually stored or internally administered per business without payment processor integration.
- The app should not expose an “upgrade via WhatsApp” or similar commercial self-service flow in this feature.
- Export is gated to Professional for the MVP unless explicitly allowed by a future product decision.

## Likely Files or Directories Involved

- `packages/shared/src/index.ts`
- `packages/shared/src/schema.ts`
- `packages/backend/src/db/schema/`
- `packages/backend/src/db/schema/index.ts`
- `packages/backend/src/services/repository/`
- `packages/backend/src/services/business/`
- `packages/backend/src/api/`
- `packages/backend/src/plugins/services.ts`
- `packages/app/app/hooks/`
- `packages/app/app/routes/_protected.config*`

## Dependencies on Other Feature IDs

- Depends on `F-001`.

## Parallelization Notes

Can run in parallel with parking configuration and vehicle session work after `F-001`. Coordinate contract names with `F-005`, which will need limit checks during checkout or monthly record creation.

## Worktree Recommendation

Use a separate subscription worktree because it is cross-cutting and may touch shared/backend/frontend contracts.

## Suggested Branch/Worktree Name

- Branch: `feature/cochera-subscription`
- Worktree: `../avileo-cochera-subscription`

## Suggested `/plan` Mode

`structured`

## Decision Notes

None yet.

## Manual Overrides

None.
