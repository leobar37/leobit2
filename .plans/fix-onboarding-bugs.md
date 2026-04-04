# Fix Onboarding Bugs

## Objective

Fix 4 critical bugs in the onboarding-simplified-3-step implementation so the onboarding flow works correctly end-to-end: the checklist reflects real product/sale state, login/register navigates correctly, invitation registration properly joins the invited business, and the seed-demo endpoint enforces admin-only access.

## Scope

- In scope: `login.tsx`, `register.tsx`, `use-auth.ts`, `_protected.dashboard.tsx`, `_protected.onboarding.data.tsx`, `businesses.ts` (backend), `business.service.ts`
- Out of scope: Other onboarding components, E2E tests, new features

## Verified Context

- `useProducts()` and `useSales()` hooks exist in `packages/app/app/hooks/`
- `useAuth().register()` and `useAuth().login()` are defined in `use-auth.ts`
- `POST /businesses/seed-demo` exists in `packages/backend/src/api/businesses.ts:367`
- Invitation token acceptance uses `POST /public/invitations/accept` defined in `packages/backend/src/api/invitations.ts:92`
- `hydrateCurrentBusinessId()` is called in `use-auth.ts` after registration and decides redirect to `/business/create`
- `OnboardingChecklist` receives `hasProducts` and `hasSales` as props in `_protected.dashboard.tsx`

## Assumptions

- The `useProducts()` and `useSales()` queries return data synchronously enough for the checklist to react after the first sync
- Refactoring `login()`/`register()` to return navigation intent will not break other call sites

## Files Involved

- `packages/app/app/routes/_protected.dashboard.tsx` — Modify — wire real `hasProducts`/`hasSales` to checklist
- `packages/app/app/hooks/use-auth.ts` — Modify — remove `navigate()` calls, return navigation intent
- `packages/app/app/routes/login.tsx` — Modify — own navigation decision after login
- `packages/app/app/routes/register.tsx` — Modify — own navigation, restructure invitation flow before business redirect
- `packages/app/app/routes/_protected.onboarding.data.tsx` — Review — ensure seed-demo navigation still works after hook refactor
- `packages/backend/src/api/businesses.ts` — Modify — add `isAdmin()` guard to `/seed-demo`
- `packages/app/app/hooks/use-products.ts` — Review — confirm data shape for `hasProducts` computation
- `packages/app/app/hooks/use-sales.ts` — Review — confirm data shape for `hasSales` computation

## Ordered Execution Steps

### 1. Fix `hasProducts`/`hasSales` hardcoded values in Dashboard

- Files: `packages/app/app/routes/_protected.dashboard.tsx`
- Action:
  1. Import `useProducts` from `~/hooks/use-products` and `useSales` from `~/hooks/use-sales`
  2. Call both hooks inside the `DashboardPage` component (they are offline-aware)
  3. Compute `const hasProducts = (products?.length ?? 0) > 0` and `const hasSales = (sales?.length ?? 0) > 0`
  4. Replace `hasProducts={false}` and `hasSales={false}` with the computed values
- Depends on: none

### 2. Refactor `use-auth` to remove internal navigation

- Files: `packages/app/app/hooks/use-auth.ts`, `packages/app/app/routes/login.tsx`, `packages/app/app/routes/register.tsx`
- Action:
  1. In `use-auth.ts`, change `login()` and `register()` to **return an object** instead of calling `navigate()` internally:
     - `login()` returns `{ needsRedirect: true, redirectTo: "/business/create" }` when no business exists, or `{ needsRedirect: false }` when OK
     - `register()` returns `{ needsRedirect: true, redirectTo: "/business/create" }` when no business, `{ needsRedirect: false }` when OK
  2. In `login.tsx`, read the return value of `login()` and navigate based on it:
     - `const result = await login(email, password);`
     - `if (result.needsRedirect) { navigate(result.redirectTo); } else { navigate("/sync"); }`
  3. In `register.tsx`, read the return value of `register()` and handle navigation the same way
  4. Keep `navigate("/dashboard")` for the invitation success case in `register.tsx`
- Depends on: none

### 3. Fix invitation flow so acceptance runs before business redirect

- Files: `packages/app/app/routes/register.tsx`
- Action:
  1. Restructure the `onSubmit` handler so invitation acceptance is attempted **immediately after** `register()` succeeds and **before** the navigation result is processed
  2. Current broken flow: `register()` → may call `navigate("/business/create")` internally → `if (invitationToken)` block never runs
  3. New flow:
     - Call `register()` and get its result
     - If `invitationToken` is present, call `acceptInvitation()` **before** handling the business-redirect result
     - Then handle navigation based on the result from `register()`
  4. The `acceptInvitation()` must run while the component is still mounted and before any redirect
  5. If invitation acceptance fails, still allow the business-redirect flow to proceed (user creates a business; acceptInvitation error can be shown as a warning but should not block onboarding)
- Depends on: Step 2 (since `register()` signature changes)

### 4. Add admin-only guard to `seed-demo` endpoint

- Files: `packages/backend/src/api/businesses.ts`
- Action:
  1. Add `ForbiddenError` import if not present
  2. At the top of the `seed-demo` handler, add:
     ```ts
     if (!ctx.isAdmin()) {
       throw new ForbiddenError("No tienes permiso para sembrar datos de ejemplo");
     }
     ```
- Depends on: none

## Risks and Edge Cases

- **Risk:** `useProducts()` and `useSales()` are async/TanStack queries — the checklist will show `false` briefly on first load before data resolves. This is acceptable because the checklist only appears on first login and is a best-effort indicator.
- **Risk:** Removing `navigate()` from `use-auth.ts` hooks may break other callers (none found in current codebase, but verify `login()` is only called from `login.tsx` and `register()` only from `register.tsx` before changing).
- **Risk:** If `acceptInvitation()` fails during the invitation flow restructure, the user may silently proceed to create a business instead of joining one. Show a non-blocking warning in that case.
- **Edge Case:** If a user registers via invitation but the invitation has already expired, `acceptInvitation()` will throw. The error should be caught and shown as a warning, not blocking the user from completing registration.

## Validation Strategy

1. **Manual flow — checklist**: Register new user → create business → load dashboard → verify checklist items reflect actual product/sale state
2. **Manual flow — invitation**: Create invitation → open `?token=` link → register → verify user is added to invited business, not a new one
3. **Manual flow — navigation**: Login as user with business → verify lands on `/sync`; login as user without business → verify lands on `/business/create`
4. **Manual flow — seed-demo**: Login as non-admin → try seed-demo → verify 403 Forbidden; login as admin → seed-demo → verify products appear
5. **TypeScript**: Run `bun run typecheck` in `packages/app` after changes
6. **Lint**: Run `bun run lint` if configured
