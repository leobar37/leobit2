# T-003: Runtime Apply Integration

## Objective

Integrate client runtime apply path with generated applier configuration and remove hardcoded hot-path schema maps.

## Requirements Covered

- `FR-003`

## Dependencies

- `T-002`

## Files or Areas Involved

- `packages/drizzle-sync/src/pglite/change-applier.ts` — **Modify**
- `packages/drizzle-sync/src/pglite/change-strategies.ts` — **Modify**
- `packages/drizzle-sync/src/pglite/schema-mapper.ts` — **Modify/Reduce usage**
- `packages/drizzle-sync/src/client/types.ts` — **Modify** (engine config for applier wiring)
- `packages/drizzle-sync/src/client/create-sync-client-engine.ts` — **Modify**
- `packages/drizzle-sync/src/client/sync-client-engine.ts` — **Modify**
- `packages/app/app/routes/_protected.tsx` — **Modify** (inject generated config)
- `packages/app/app/lib/services/base-service.ts` — **Modify** (align table allowlist source)

## Actions

1. Add explicit engine/runtime configuration input for apply schema/applier metadata.
2. Route table/column validation in apply and strategies through injected generated config.
3. Remove hardcoded mapper constants from runtime-critical execution path.
4. Update app engine construction to provide generated applier config.
5. Ensure base service allowlist relies on canonical/generated source.

## Completion Criteria

- Pull/apply runtime validates against generated config.
- Hardcoded table metadata is no longer required for hot-path correctness.
- Engine initialization succeeds with canonical generated config.

## Validation

- `cd packages/app && bun test`
- Run targeted sync apply tests and pull flow tests.
- Manual smoke: create/update offline and sync without table-name mismatch errors.

## Risks or Notes

- Introduce temporary fallback only if necessary for migration safety; remove after `T-007`.
