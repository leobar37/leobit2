# T-003 Complete SDK Generator CRUD/Read Surface

## Objective

Produce a complete generated local-first SDK surface (read + write) for supported entities, including naming and codec behavior guarantees.

## Requirements Covered

- `FR-001`
- `FR-002`
- `FR-003`
- `FR-008`
- `FR-009`
- `NFR-002`

## Dependencies

- `T-001`
- `T-002`

## Files or Areas Involved

- `packages/drizzle-sync/src/config/generators/local-first-hooks-generator.ts` - Modify - Evolve into SDK generator semantics with read methods.
- `packages/drizzle-sync/src/config/generators/service-generator.ts` - Review - Reuse proven local-first patterns and codec handling behavior.
- `packages/drizzle-sync/src/config/introspect.ts` - Review/Modify - Ensure relation and field metadata support SDK method generation.
- `packages/drizzle-sync/src/config/generators/__tests__/` - Modify - Add/expand tests for SDK generation outputs.
- `packages/app/app/lib/sync/generated/sdk.ts` - Generated - Verify artifact contract from real config.

## Actions

1. Add query methods (`findById`, business-scoped list) to generated SDK output for eligible entities.
2. Keep generated mutations local-first (PGlite write + enqueue sync).
3. Preserve canonical snake_case entity type and camelCase payload conventions.
4. Enforce safe behavior for junction tables and unsupported standalone entities.
5. Add generator tests covering regular entities, child entities, and junction entities.

## Completion Criteria

- Generated SDK exposes complete basic CRUD/read contract for supported entities.
- Codec transformations still apply correctly on generated mutation payload normalization.
- Junction/child generation remains safe and does not emit invalid APIs.

## Validation

- `cd packages/drizzle-sync && bun run test:run`
- `cd packages/backend && bun run sync:generate`
- Inspect generated `packages/app/app/lib/sync/generated/sdk.ts` for contract correctness.

## Risks or Notes

- Avoid mixing domain-specific filters/pagination logic into SDK generator; keep primitives intentionally minimal.
