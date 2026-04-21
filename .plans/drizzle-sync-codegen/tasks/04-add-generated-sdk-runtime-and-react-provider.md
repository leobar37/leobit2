# T-004 Add Generated SDK Runtime and React Provider

## Objective

Add React runtime/context primitives in `@avileo/drizzle-sync/react` to provide SDK instances with implicit business scope and lifecycle-safe access.

## Requirements Covered

- `FR-005`
- `NFR-004`

## Dependencies

- `T-002`
- `T-003`

## Files or Areas Involved

- `packages/drizzle-sync/src/react/provider.tsx` - Modify - Add or extend provider contract for SDK context.
- `packages/drizzle-sync/src/react/hooks.ts` - Modify - Add hook(s) to access SDK runtime.
- `packages/drizzle-sync/src/react/types.ts` - Modify - Define SDK runtime typing.
- `packages/drizzle-sync/src/react/context.ts` - Modify - Add SDK context wiring.
- `packages/drizzle-sync/src/react/index.ts` - Modify - Export new provider/hook APIs.

## Actions

1. Define SDK runtime shape consumed by hooks layer.
2. Add provider path that instantiates or accepts generated SDK instances.
3. Expose `useSyncSdk()` (or equivalent) with strict provider enforcement.
4. Ensure provider lifecycle does not duplicate existing sync runtime subscriptions.

## Completion Criteria

- React layer can provide and consume generated SDK instances without app-specific glue code in each hook.
- Business scope is injected once during provider setup.
- Runtime subscriptions and disposal behavior remain deterministic.

## Validation

- `cd packages/drizzle-sync && bun run build`
- Add/execute react-layer unit tests where applicable.

## Risks or Notes

- Avoid coupling SDK provider to Avileo-specific service-provider internals.
