# T-004: Decouple Generic Library From @avileo/shared

## Objective

Remove Avileo shared-domain coupling from generic `drizzle-sync` runtime and config/codegen paths.

## Requirements Covered

- `FR-004`
- `NFR-002`

## Dependencies

- `T-001`
- `T-003`

## Files or Areas Involved

- `packages/drizzle-sync/src/core/types.ts` — **Modify**
- `packages/drizzle-sync/src/core/priority.ts` — **Modify**
- `packages/drizzle-sync/src/core/index.ts` — **Modify**
- `packages/drizzle-sync/src/server/types.ts` — **Modify**
- `packages/drizzle-sync/src/server/operation-sorter.ts` — **Modify**
- `packages/drizzle-sync/src/server/handler-registry.ts` — **Modify**
- `packages/drizzle-sync/src/config/generators/service-generator.ts` — **Modify**
- `packages/drizzle-sync/src/config/generators/hooks-generator.ts` — **Modify**
- `packages/drizzle-sync/package.json` — **Review/Modify** dependency graph if needed

## Actions

1. Replace shared-domain type imports with generic/string-based or config-injected contracts.
2. Update sorter priority fallback to rely on provided config rather than `@avileo/shared` maps.
3. Remove `@avileo/shared` imports from generic generators and runtime code paths.
4. Keep compatibility wrappers only if strictly needed and isolated from generic entry points.

## Completion Criteria

- Generic library paths compile without `@avileo/shared` imports.
- Runtime behavior remains equivalent under canonical config.
- Package dependency graph no longer requires shared domain package for generic functionality.

## Validation

- `cd packages/drizzle-sync && bun run build`
- `cd packages/drizzle-sync && bun test`
- Static search confirms no disallowed imports in generic paths.

## Risks or Notes

- This task can uncover hidden implicit contracts in backend/app consumers; resolve in `T-007`.
