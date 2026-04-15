# T-003 PGlite Worker and Runtime Strategy

## Objective

Move local DB execution off the main thread and adopt runtime/storage settings that improve interactivity and throughput on Android Chrome.

## Requirements Covered

- `FR-001`
- `NFR-002`

## Dependencies

- `T-001`

## Files or Areas Involved

- `packages/app/app/engine/db.ts` - Modify - Prepare DB initialization for worker-compatible setup.
- `packages/app/app/engine/provider.tsx` - Modify - Integrate worker-backed DB lifecycle and error handling.
- `packages/app/app/engine/index.ts` - Modify - Export worker-aware engine interfaces.
- `packages/app/package.json` - Modify - Add worker-related PGlite package usage if required.
- `packages/app/vite.config.ts` - Review/Modify - Ensure worker bundling setup is correct.
- `packages/app/app/engine/` - Create - Add dedicated worker entry file if needed.

## Actions

1. Introduce PGlite worker execution model for app DB access.
2. Evaluate and apply runtime settings for Android Chrome (including storage mode and durability option strategy).
3. Ensure fallback behavior remains safe for unsupported environments.
4. Validate that existing services and sync layer continue to operate through worker-backed DB client.

## Completion Criteria

- Main-thread blocking from DB operations is reduced in user-visible flows.
- Worker-backed DB initialization is stable across reloads and route changes.
- Offline read/write behavior remains functional in web and installed PWA contexts.

## Validation

- Measure responsiveness/jank indicators before and after worker migration.
- Run critical offline sales workflows and confirm no regressions.

## Risks or Notes

- Worker migration can surface serialization/API boundary issues with existing DB wrappers.
