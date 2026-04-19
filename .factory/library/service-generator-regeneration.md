# Service Generator Regeneration

## Rule

After fixing the service generator (`packages/drizzle-sync/src/config/generators/service-generator.ts`), the checked-in generated output file (`packages/app/app/lib/sync/generated/services.ts`) **must be regenerated**.

## Why

The generated `services.ts` is checked into git and becomes stale when the generator is fixed. Multiple fix features in the scale-migration milestone (duplicate imports, junction tables, date types, hooks imports) all modified the generator but did not regenerate the output file, leaving stale generated code in the repo.

## How to Regenerate

```bash
cd packages/drizzle-sync
bun run generate  # or the appropriate CLI command for the generator
```

Then verify the generated file was updated:

```bash
git diff packages/app/app/lib/sync/generated/services.ts
```

## Known Stale Code (as of scale-migration)

- `CustomerTagsService` still has `findById`, `update`, `delete` methods and uses `id` field in `create` — all incorrect for a junction table without `id` column. The generator fix is correct (tests prove it), but the stale generated file needs regeneration.

## Junction Table Schema Notes

- `customer_tags` has NO `id` column (true junction table, composite PK on `customerId` + `tagId`)
- `customer_group_members` HAS an `id` column (`uuid("id").primaryKey().defaultRandom()`), so it is NOT a junction table by the "no id column" heuristic
