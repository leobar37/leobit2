# T-006 Adapt App Provider and Bootstrap SDK Context

## Objective

Integrate generated SDK runtime/provider into app bootstrap so generated hooks can run in production paths with implicit business scope.

## Requirements Covered

- `FR-005`
- `NFR-004`

## Dependencies

- `T-004`
- `T-005`

## Files or Areas Involved

- `packages/app/app/lib/sync/service-provider.tsx` - Modify - Wire SDK provider/runtime and avoid duplicate lifecycle orchestration.
- `packages/app/app/routes/_protected.tsx` - Review/Modify - Ensure provider order remains correct.
- `packages/app/app/lib/sync/react-runtime.ts` - Review/Modify - Keep compatibility with library runtime contracts if still needed.
- `packages/app/app/root.tsx` - Review - Confirm no top-level provider conflicts.

## Actions

1. Inject generated SDK context from existing sync initialization path.
2. Ensure business scope and auth context are available before SDK instantiation.
3. Keep existing sync runtime stable while introducing SDK provider.
4. Remove redundant adapter glue only when equivalent library behavior is proven.

## Completion Criteria

- Generated hooks can resolve SDK context in app runtime.
- Sync lifecycle still starts/stops once and behaves as before.
- No provider ordering regressions in protected routes.

## Validation

- `cd packages/app && bun run typecheck`
- Run focused sync/provider tests or smoke tests in app.

## Risks or Notes

- Provider ordering bugs can break all hooks at runtime; keep this rollout incremental and observable.
