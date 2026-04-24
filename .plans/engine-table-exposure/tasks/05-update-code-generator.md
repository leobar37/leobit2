# T-005 Update Code Generator for drizzle-schema.ts

## Objective

Update the `@avileo/drizzle-sync` code generator to automatically produce `drizzle-schema.ts` alongside other generated artifacts, ensuring the file stays in sync with the schema.

## Requirements Covered

- `FR-005`

## Dependencies

- `T-001`

## Files or Areas Involved

- `packages/drizzle-sync/src/config/generators/` - Review - Existing generators
- `packages/drizzle-sync/src/config/generators/service-generator.ts` - Modify - Update import path
- `packages/drizzle-sync/src/config/generators/` - Create/Modify - Add schema-export-generator.ts
- `packages/drizzle-sync/src/config/schema-manager.ts` - Review - Schema introspection

## Actions

1. Create a new generator (`schema-export-generator.ts`) or extend an existing one to:
   a. Read entity definitions from sync config
   b. Generate `drizzle-schema.ts` with re-exports
2. Update the service generator to change the import path from `~/lib/sync/drizzle-schema` to the correct path
3. Integrate the new generator into the main generation pipeline
4. Ensure the generator runs automatically when `bun run generate` or equivalent command is executed
5. Document the new generated file in the generator's output list

## Completion Criteria

- Running the code generator produces `drizzle-schema.ts` automatically
- Generated `drizzle-schema.ts` includes all sync-enabled entities
- Generated services compile using the new import path
- No manual file creation needed when adding new entities

## Validation

- Run the code generator and verify `drizzle-schema.ts` is created/updated
- Check that generated services import correctly from the new file
- Add a test entity to config, regenerate, and verify it appears in `drizzle-schema.ts`

## Risks or Notes

- The generator must know which tables to export. Options:
  - Read from `SYNC_ENTITIES` in `sync-config.ts`
  - Introspect `@avileo/shared` exports
  - Read from `sync.schema.json` entities list
- Ensure the generator handles table name aliases correctly (e.g., `sale_items` -> `saleItems`)
- Consider generating the file in both frontend (`packages/app`) and the generator package itself for testing
