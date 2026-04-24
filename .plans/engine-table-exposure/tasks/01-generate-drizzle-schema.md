# T-001 Generate drizzle-schema.ts File

## Objective

Create a generated file `drizzle-schema.ts` that re-exports all Drizzle table objects from `@avileo/shared` so that both generated and custom services have a single import source.

## Requirements Covered

- `FR-001`
- `FR-004`
- `NFR-004`

## Dependencies

- none

## Files or Areas Involved

- `packages/app/app/lib/sync/generated/drizzle-schema.ts` - Create - Centralized table exports
- `packages/shared/src/schema.ts` - Review - Source of table definitions
- `packages/app/app/lib/sync/generated/services.ts` - Review - Current broken imports

## Actions

1. Identify all table exports from `@avileo/shared` by examining `packages/shared/src/schema.ts`
2. Create `drizzle-schema.ts` with all table re-exports:
   ```typescript
   export {
     customers,
     sales,
     saleItems,
     abonos,
     // ... all 17+ tables
   } from "@avileo/shared";
   ```
3. Ensure the file path matches the import path already referenced by generated services: `~/lib/sync/drizzle-schema`
4. Verify all tables needed by existing services are included (check imports in payment-service, sale-service, etc.)
5. Optionally re-export types alongside tables (e.g., `export type { Customer, Sale } from "@avileo/shared"`)

## Completion Criteria

- `drizzle-schema.ts` exists at `packages/app/app/lib/sync/generated/drizzle-schema.ts`
- File exports all tables currently imported by services
- Generated services can successfully import from `~/lib/sync/drizzle-schema`
- No compilation errors from the new file

## Validation

- Run `cd packages/app && bun run typecheck` and verify no errors from `drizzle-schema.ts`
- Check that `import { customers } from "~/lib/sync/drizzle-schema"` compiles

## Risks or Notes

- The list of tables must stay in sync with `@avileo/shared`. Future schema additions require updating this file until T-005 (generator) is complete.
- Ensure no naming collisions (e.g., `sales` table vs `sales` variable in services)
