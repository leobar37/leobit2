# T-004 Frontend Service Identity And Hooks

## Objective

Migrate frontend hooks and service typing to the canonical `abonos` service identity and remove weak typing that allowed the `payments` mismatch.

## Requirements Covered

- `FR-001`
- `FR-007`
- `NFR-002`
- `NFR-004`

## Dependencies

- `T-001`

## Files or Areas Involved

- `packages/app/app/hooks/use-payments.ts` - Modify - Replace service key lookup and normalize query keys.
- `packages/app/app/hooks/use-accounts-receivable.ts` - Modify - Replace service key lookup.
- `packages/app/app/lib/sync/service-overrides.ts` - Modify - Replace `Record<string, any>` with typed overrides compatible with generated engine services.
- `packages/app/app/lib/services/payment-service.ts` - Review/Modify - Ensure type names can remain user-facing `PaymentService` while sync entity remains `abonos`.
- `packages/app/app/routes/_protected.cobros._index.tsx` - Review - Ensure hooks still resolve data after service key migration.
- `packages/app/app/routes/_protected.cobros.nuevo.tsx` - Review - Ensure create payment path uses migrated hooks.
- `packages/app/app/routes/_protected.clientes.$id._index.tsx` - Review - Ensure customer payments tab uses migrated hooks.
- `packages/app/app/lib/sync/generated/engine.ts` - Review only - Confirm generated service key remains `abonos`.

## Actions

1. Replace all `useEngineService<PaymentService>("payments")` calls with the canonical service key.
2. Normalize payment query keys so cache invalidation is coherent; remove mixed `payments` and `payments-new` keys unless there is a deliberate compatibility need.
3. Strengthen `AvileoAppOverrides` so TypeScript catches invalid override/service keys such as `payments`.
4. Search app code for remaining `payments` service-key usage after migration; distinguish internal UI labels/query keys from engine service keys.
5. Ensure payment hooks still expose the same public hook API to routes/components unless a change is required by type safety.
6. Add or update hook/service tests to prove the payment hooks resolve the `abonos` override.

## Completion Criteria

- No frontend service lookup uses the non-existent `payments` engine key.
- TypeScript rejects invalid service override keys.
- Payment/cobro query invalidation is internally consistent.
- Cobros index, new cobro route, and customer payment tab still compile and read from local services.

## Validation

- `bun run --cwd packages/app typecheck`
- Targeted Vitest tests for hooks if present or added.
- Manual grep for `useEngineService<PaymentService>("payments")` returns no matches.

## Risks or Notes

- The user-facing Spanish concept can remain `cobros`/payments in UI labels; only sync entity and service identity must be canonical.
- Avoid adding a `payments` alias unless execution finds persisted queued operations or external consumers that require it.
