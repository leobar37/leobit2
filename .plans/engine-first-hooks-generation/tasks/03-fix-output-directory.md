# T-003 Fix output directory and remove dead backend hooks

## Objective

Ensure all generated artifacts are written to the frontend package (`packages/app/app/lib/sync/generated/`) and remove the broken backend-generated hooks file.

## Requirements Covered

- `FR-005`, `FR-006`

## Dependencies

- `T-002`

## Files or Areas Involved

- `packages/drizzle-sync/src/config/generator.ts` — Modify — `outputDir` handling
- `packages/drizzle-sync/src/cli.ts` — Review — Confirm CLI output path default
- `packages/backend/src/generated/sync/hooks.ts` — Delete — Dead backend hooks
- `packages/backend/src/generated/sync/schemas.ts` — Review — May also be unused and misplaced
- `packages/backend/src/generated/sync/types.ts` — Review — May also be unused and misplaced
- `packages/app/app/lib/sync/generated/` — Review — Confirm this is the correct target directory

## Actions

1. **Audit current artifact locations**:
   - List all files in `packages/backend/src/generated/sync/` and `packages/app/app/lib/sync/generated/`.
   - Determine which files are actually imported by the app.

2. **Update `generator.ts` `outputDir` default**:
   - Change or document that the default output directory for `generateAll` must be `packages/app/app/lib/sync/generated/`.
   - If the CLI or build script passes a different path, update the script (e.g., in `package.json` scripts or turbo config).

3. **Remove dead backend artifacts**:
   - Delete `packages/backend/src/generated/sync/hooks.ts`.
   - If `schemas.ts` and `types.ts` in `packages/backend/src/generated/sync/` are also unused, delete them or stop generating them there.
   - Verify no file in `packages/backend` imports from these paths.

4. **Ensure frontend receives all artifacts**:
   - `services.ts` — already in frontend (confirmed by grep)
   - `init.sql` — already in frontend (confirmed by import)
   - `applier.ts` — already in frontend (confirmed by import)
   - `hooks.ts` — must now be generated into frontend
   - `schemas.ts` — must now be generated into frontend
   - `types.ts` — must now be generated into frontend

5. **Update `.gitignore` if needed**:
   - Ensure `packages/app/app/lib/sync/generated/` is NOT gitignored if these files are meant to be committed.
   - Or, if they are build artifacts, ensure the build script runs the generator before TypeScript compilation.

6. **Update build scripts / turbo config**:
   - If the generator is run manually today, document the new command.
   - If it runs as part of a build pipeline, ensure the pipeline outputs to the frontend directory.

## Completion Criteria

- `packages/backend/src/generated/sync/hooks.ts` no longer exists.
- All 6 generated files (`services.ts`, `hooks.ts`, `schemas.ts`, `types.ts`, `init.sql`, `applier.ts`) are in `packages/app/app/lib/sync/generated/`.
- No file in `packages/backend` imports from the old generated paths.

## Validation

- `ls packages/backend/src/generated/sync/` — should not contain `hooks.ts`
- `ls packages/app/app/lib/sync/generated/` — should contain all 6 files after running generator
- `grep -r "backend/src/generated/sync" packages/backend/src/` — should return zero matches

## Risks or Notes

- `packages/backend/src/generated/sync/services.ts` is used by backend sync handlers (e.g., `PurchaseSyncHandler.ts`). Do NOT delete backend `services.ts` if it is still used. Only the frontend-facing hooks/schemas/types should move.
- Verify before deleting: check if `packages/backend/src/generated/sync/services.ts` has any imports in the backend.
