# T-001: Canonical Entity Identity

## Objective

Normalize sync entity identity so canonical runtime `entityType` uses snake_case and matches `tableName` for syncable entities.

## Requirements Covered

- `FR-001`

## Dependencies

- none

## Files or Areas Involved

- `packages/backend/src/sync.config.ts` — **Modify** — normalize entity keys and relation references
- `packages/drizzle-sync/src/config/types.ts` — **Modify** — clarify identity fields/contracts
- `packages/drizzle-sync/src/config/schema-types.ts` — **Modify** — ensure serialized identity fields are explicit
- `packages/drizzle-sync/src/config/serializer.ts` — **Modify** — serialize canonical identity deterministically
- `packages/drizzle-sync/src/config/schema-manager.ts` — **Review/Modify** — ensure canonical identity is persisted

## Actions

1. Rename syncable entity config keys that are currently camelCase to canonical snake_case where needed.
2. Update `relations.children` and `relations.parents` references to canonical names.
3. Ensure serialized schema explicitly captures canonical `entityType` alongside `tableName` when needed.
4. Add/adjust typing constraints so runtime-oriented identity cannot silently diverge from canonical naming.

## Completion Criteria

- `sync.config.ts` uses canonical entity names consistently for syncable entities.
- Relation references are canonical and consistent.
- Generated `sync.schema.json` identity fields are stable and unambiguous.

## Validation

- `cd packages/backend && bun run sync:build-schema`
- Inspect resulting `packages/backend/src/sync.schema.json` for canonical identity fields.
- Existing schema validation/build checks pass.

## Risks or Notes

- This task changes identity values used by persisted sync metadata; migration must be handled in `T-005`.
