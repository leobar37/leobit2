# T-002: Schema-Driven Applier Generation

## Objective

Fix generation so applier artifacts are fully schema-driven and emit canonical runtime names and mappings.

## Requirements Covered

- `FR-002`
- `NFR-003`

## Dependencies

- `T-001`

## Files or Areas Involved

- `packages/drizzle-sync/src/config/generators/applier-generator.ts` — **Modify**
- `packages/drizzle-sync/src/config/generators/schema-adapter.ts` — **Modify**
- `packages/drizzle-sync/src/config/generator.ts` — **Modify**
- `packages/drizzle-sync/src/config/schema-types.ts` — **Review**

## Actions

1. Ensure applier generation resolves runtime table/entity identity from serialized schema (`tableName`/canonical fields), not logical map keys.
2. Generate explicit runtime mapping structures required by apply path (valid entities/tables, table columns, defaults, apply order, relation fields).
3. Ensure generated output is deterministic and stable for identical schema input.
4. Remove residual assumptions that transform canonical names into camelCase runtime keys.

## Completion Criteria

- Generated `applier.ts` emits canonical snake_case runtime names.
- Generated structures are sufficient for runtime apply without hardcoded fallback maps.
- Generator output is stable across repeated runs.

## Validation

- `cd packages/backend && bun run sync:generate`
- Inspect `packages/app/app/lib/sync/generated/applier.ts` for canonical names only.
- Repeat generation twice and confirm no unintended diffs.

## Risks or Notes

- This task is foundational for runtime integration in `T-003`.
