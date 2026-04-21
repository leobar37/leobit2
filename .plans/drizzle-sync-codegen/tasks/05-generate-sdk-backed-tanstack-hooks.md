# T-005 Generate SDK-Backed TanStack Hooks

## Objective

Replace remote-first hooks generation with hooks that call generated SDK methods and keep TanStack Query behavior consistent.

## Requirements Covered

- `FR-004`
- `FR-006`
- `FR-007`
- `FR-009`

## Dependencies

- `T-002`
- `T-003`
- `T-004`

## Files or Areas Involved

- `packages/drizzle-sync/src/config/generators/hooks-generator.ts` - Modify - Remove direct API path generation and target SDK runtime.
- `packages/drizzle-sync/src/config/generator.ts` - Modify - Ensure hooks generation consumes SDK contract.
- `packages/drizzle-sync/src/config/generators/__tests__/hooks-generator.test.ts` - Modify - Assert SDK-backed hooks output.
- `packages/app/app/lib/sync/generated/hooks.ts` - Generated - Verify no direct Eden API calls for offline-first entities.

## Actions

1. Refactor generated query hooks to call SDK read methods.
2. Refactor generated mutation hooks to call SDK mutation methods.
3. Implement query key and invalidation rules per entity.
4. Preserve filtering logic for entities that should not generate standalone hooks.

## Completion Criteria

- Generated hooks no longer call `api.<entity>.*` for local-first entities.
- Hooks compile and provide list/detail/mutation ergonomics expected by app code.
- Cache invalidation is deterministic after mutations.

## Validation

- `cd packages/drizzle-sync && bun run test:run`
- `cd packages/backend && bun run sync:generate`
- Search generated hooks for direct API usage regressions.

## Risks or Notes

- Keep hook signatures migration-friendly where possible to reduce consumer churn.
