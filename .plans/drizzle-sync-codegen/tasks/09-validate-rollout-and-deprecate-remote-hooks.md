# T-009 Validate Rollout and Deprecate Remote-First Hooks

## Objective

Run final validation gates for SDK-backed generation, complete phased rollout, and retire remote-first generated hook behavior safely.

## Requirements Covered

- `NFR-001`
- `NFR-002`
- `NFR-003`
- `NFR-005`

## Dependencies

- `T-007`
- `T-008`

## Files or Areas Involved

- `packages/drizzle-sync/src/config/generators/hooks-generator.ts` - Modify - Remove fallback remote-first logic if still present.
- `packages/drizzle-sync/src/cli.ts` - Modify - Ensure generation messaging reflects final architecture.
- `packages/backend/package.json` - Review - Confirm sync generation command stability.
- `packages/app/app/lib/sync/generated/*.ts` - Generated - Confirm deterministic output.
- `.plans/drizzle-sync-codegen/checklist.json` - Modify - Mark rollout completion states.

## Actions

1. Execute full generation/build/typecheck/test matrix for drizzle-sync, backend, and app.
2. Verify deterministic generated diffs across repeated runs.
3. Remove remaining remote-first generated paths.
4. Document migration completion and remaining intentional manual wrappers.

## Completion Criteria

- End-to-end validation passes for SDK-backed generation path.
- Remote-first generated hooks path is retired or explicitly gated off.
- Rollout checklist reflects completed migration state with remaining exceptions documented.

## Validation

- `cd packages/drizzle-sync && bun run test:run && bun run build`
- `cd packages/backend && bun run sync:generate && bun run test:run`
- `cd packages/app && bun run typecheck && bun run test`

## Risks or Notes

- Do not retire fallback paths before migrated domains and sales wrappers are verified in offline scenarios.
