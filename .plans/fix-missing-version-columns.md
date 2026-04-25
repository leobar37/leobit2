# Fix Missing Version Columns in Sync Entities

## Objective

Add missing `version` columns to `customers`, `products`, `product_variants`, `purchases`, and `purchase_items` tables in `packages/shared/src/schema.ts`. These columns are required by the `ConflictResolver` classes but are currently absent, causing conflict detection to fail at runtime for these entities.

## Scope

- **In scope**: Add `version` column to 5 tables in shared schema, regenerate drizzle-sync artifacts, verify consistency.
- **Out of scope**: Other schema changes, handler modifications, frontend service changes.

## Verified Context

- `CustomerConflictResolver` (ConflictResolver.ts:105-122) references `customers.version` field
- `ProductConflictResolver` (ConflictResolver.ts:141-158) references `products.version` field
- `ProductVariantConflictResolver` (ConflictResolver.ts:160-179) references `product_variants.version` field
- `PurchaseConflictResolver` (ConflictResolver.ts:182-200) references `purchases.version` field
- `PurchaseItemConflictResolver` (ConflictResolver.ts:203-221) references `purchase_items.version` field
- `customers` table (schema.ts:125-147) has no `version` column
- `products` table (schema.ts:285-308) has no `version` column
- `productVariants` table (schema.ts:317-341) has no `version` column
- `purchases` table (schema.ts:403-425) has no `version` column
- `purchaseItems` table (schema.ts:434-454) has no `version` column
- Entities WITH `version` column already: `sales`, `abonos`, `customer_tags`, `customer_group_members`, `visitas`, `files`, `distribucion_items`

## Assumptions

- Adding `version` with `default(1)` is safe for existing rows
- The pattern used in `sales` table (`version: integer("version").notNull().default(1)`) should be replicated
- Regeneration will update `drizzle-sync` generated files to include the new column

## Files Involved

- `packages/shared/src/schema.ts` - Modify - Add `version` column to 5 tables
- `packages/drizzle-sync/src/config/generator.ts` - Review - Verify it picks up schema changes
- `packages/app/app/lib/sync/generated/drizzle-schema.ts` - Regenerate - Auto-generated
- `packages/app/app/lib/sync/generated/services.ts` - Regenerate - Auto-generated
- `packages/app/app/lib/sync/generated/schema-sql.ts` - Regenerate - Auto-generated

## Ordered Execution Steps

### Step 1: Add `version` Column to `customers` Table

- **Files**: `packages/shared/src/schema.ts`
- **Action**: Add `version: integer("version").notNull().default(1)` to `customers` table definition, following the same pattern as `sales` table (line 176).
- **Depends on**: None
- **Pattern to follow** (from `sales` table, line 176):
  ```typescript
  version: integer("version").notNull().default(1),
  ```

### Step 2: Add `version` Column to `products` Table

- **Files**: `packages/shared/src/schema.ts`
- **Action**: Add `version: integer("version").notNull().default(1)` to `products` table definition.
- **Depends on**: None

### Step 3: Add `version` Column to `productVariants` Table

- **Files**: `packages/shared/src/schema.ts`
- **Action**: Add `version: integer("version").notNull().default(1)` to `productVariants` table definition.
- **Depends on**: None

### Step 4: Add `version` Column to `purchases` Table

- **Files**: `packages/shared/src/schema.ts`
- **Action**: Add `version: integer("version").notNull().default(1)` to `purchases` table definition.
- **Depends on**: None

### Step 5: Add `version` Column to `purchaseItems` Table

- **Files**: `packages/shared/src/schema.ts`
- **Action**: Add `version: integer("version").notNull().default(1)` to `purchaseItems` table definition.
- **Depends on**: None

### Step 6: Regenerate Drizzle-Sync Artifacts

- **Files**: `packages/app/app/lib/sync/generated/` (multiple files)
- **Action**: Run the code generator to regenerate `drizzle-schema.ts`, `services.ts`, `schema-sql.ts`, and other generated files.
- **Depends on**: Steps 1-5
- **Note**: Verify the generator command. Typically `bun run sync:generate` or similar. Check `package.json` scripts in `packages/app`.

### Step 7: Verify Schema Consistency

- **Files**: `packages/shared/src/schema.ts`, `packages/app/app/lib/sync/generated/drizzle-schema.ts`
- **Action**: Compare that all 5 tables now have `version` in both files.
- **Depends on**: Step 6

### Step 8: Verify Conflict Resolvers Align with Schema

- **Files**: `packages/backend/src/services/sync/framework/ConflictResolver.ts`
- **Action**: Confirm that `getVersionField()` methods return `"version"` for all 5 entities and that the schema now has these fields.
- **Depends on**: Step 7

## Risks and Edge Cases

- **Existing rows**: Adding `notNull().default(1)` is safe because existing rows will get the default value `1`.
- **Backend schema drift**: The backend DB schema (Drizzle migrations) must also include these columns. If migrations haven't been run, this will cause errors until `db:push` or `db:migrate` is executed.
- **Generated artifacts**: If the generator doesn't pick up changes automatically, may need to manually trigger regeneration or check generator config.

## Validation Strategy

1. **Type check**: Run `bun run typecheck` or `tsc --noEmit` in `packages/shared` to verify schema types
2. **Generation check**: After running generator, verify `drizzle-schema.ts` exports include `version` on all 5 tables
3. **Backend sync test**: Start the backend and attempt a conflict scenario on a customer, product, and purchase to verify the resolver no longer fails
4. **Frontend build**: Verify `packages/app` builds without errors after regeneration

## Open Questions

- Is there a `db:generate` + `db:migrate` step required after schema changes to update the backend PostgreSQL schema?
- Should we also add `version` to `distribuciones` and `distribucion_items` if they are syncable and missing it?
- The `variantInventory` table has no version column — is it syncable and should it have one?
