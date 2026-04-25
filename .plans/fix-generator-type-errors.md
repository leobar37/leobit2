# Fix Generator Type Errors

## Context

Two remaining issues in `drizzle-sync` generators produce ~64 TypeScript errors after previous fixes:

1. **Enum conflicts** — 4 errors in `schema.ts` where different tables share the same enum column name but have different enum values. The `Type` enum (products) collides with `Type` enum (suppliers) and `Status` enum collides across tables.
2. **services.ts type mismatches** — 60 errors where entity insertions assign `input.fieldName` directly but the input type allows `undefined` (optional fields).

## Root Causes

### Issue 1: Enum Name Collision

**File:** `packages/drizzle-sync/src/config/generators/drizzle-schema-generator.ts`

**Problem:** Lines 288-298 collect enums into a `Map<string, GeneratedEnum>` using only the enum name as key. When multiple tables have a column with the same name (e.g., `type`) but different enum values, the first table's enum wins and subsequent ones are silently dropped.

```typescript
// Line 295-296: only checks name, not values
if (!allEnums.has(enumDef.name)) {
  allEnums.set(enumDef.name, enumDef);
}
```

**Affected:** `schema.ts` lines 166, 301, 312, 386 — `Type.REGULAR`, `Type.INSTANT_SALE`, `Status.DRAFT` don't exist in their respective enums.

### Issue 2: Entity Insert Missing Fallbacks

**File:** `packages/drizzle-sync/src/config/generators/service-generator.ts`

**Problem:** After fixing the `hasDefault` condition (to avoid `?? null` for `default: null`), NOT NULL columns without real defaults now assign `input.fieldName` directly. But the input type may be `string | undefined` (optional). This causes `string | undefined` not assignable to `string`.

Also, tenant columns (like `businessId`) are assigned directly from input when they're actually provided by the service (via `this.businessId`).

**Affected:** All `Create*Input` entity constructions in `services.ts`.

## Solution

### Fix 1: Scoped Enum Names

**Approach:** Prefix enum names with the table/entity name to create unique names per-table.

In `extractEnums()` and `generateDrizzleSchemaFile()`, change enum naming to include entity context:

```typescript
// Instead of: Type = { POLLO, HUEVO, OTRO }
// Generate per-table scoped names:
// ProductType = { POLLO, HUEVO, OTRO }
// SupplierType = { GENERIC, REGULAR, INTERNAL }
// VisitaStatus = { PENDIENTE, COMPRO, NO_COMPRA }
// SaleStatus = { PENDIENTE, COMPLETADA, CANCELADA }
```

Also update all enum default references in `generateColumnDefinition()` to use scoped names.

### Fix 2: Tenant Columns Always Use Service Values

**Approach:** In `generateInsertFields()`, for tenant columns (`businessId`), always use `this.businessId` instead of from input.

For other NOT NULL columns without defaults, always use `?? null` to handle the type mismatch between optional input and required schema.

## Files to Modify

### `packages/drizzle-sync/src/config/generators/drizzle-schema-generator.ts`

1. **Lines 16-35 (`extractEnums`)** — Add `entityName` parameter and scope enum names
2. **Lines 117-125 (`formatDefaultValue` enum handling)** — Use scoped enum names in defaults
3. **Lines 288-298 (`generateDrizzleSchemaFile`)** — Pass entityName to `extractEnums`; use composite key for enum deduplication

### `packages/drizzle-sync/src/config/generators/service-generator.ts`

1. **Lines 306-333 (`generateInsertFields`)** — Always use `?? null` for nullable columns; tenant columns use service value
2. **Lines 274-301 (`generateInsertFieldsJunction`)** — Same fixes for junction tables
3. **Lines 192-216 (`create` method template)** — Ensure tenant columns come from service, not input

## Validation

1. Run `bun run sync:generate` to regenerate
2. Run `cd packages/app && npx tsc --noEmit` — no errors in generated files
3. Run existing tests: `cd packages/drizzle-sync && bun test`

## Open Questions

1. Should enum scoping use entity name (`ProductType`) or entity+column (`Product_type`)? Both work, entity name is cleaner.
2. For tenant columns in entity insert — should we keep them in the input types (for flexibility) but just always override with service values?
