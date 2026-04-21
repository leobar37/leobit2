# T-002 Wire SDK Generation into Main Pipeline

## Objective

Update the codegen pipeline so `generateAll(...)` emits SDK artifacts as a first-class output and stops treating remote-first hooks as the default path.

## Requirements Covered

- `FR-001`
- `NFR-005`

## Dependencies

- `T-001`

## Files or Areas Involved

- `packages/drizzle-sync/src/config/generator.ts` - Modify - Add SDK generation stage and output registration.
- `packages/drizzle-sync/src/config/index.ts` - Modify - Re-export any new generator entrypoints.
- `packages/drizzle-sync/src/cli.ts` - Modify - Update dry-run and generation output expectations.
- `packages/backend/package.json` - Review - Ensure `sync:generate` command path remains correct for new artifacts.

## Actions

1. Add generation stage for `sdk.ts` (or equivalent target filename) in main pipeline.
2. Ensure generated file list and dry-run output include SDK artifact.
3. Preserve deterministic generation order to avoid noisy diffs.
4. Keep old remote hooks generator available temporarily only if needed for migration fallback.

## Completion Criteria

- `generateAll(...)` always writes SDK artifact.
- CLI output reflects the new artifact set.
- Existing generation commands still run without manual flags.

## Validation

- `cd packages/drizzle-sync && bun run build`
- `cd packages/backend && bun run sync:generate`

## Risks or Notes

- Do not silently break existing generated import paths consumed by the app in this step; keep migration-safe compatibility until `T-005`/`T-006`.
