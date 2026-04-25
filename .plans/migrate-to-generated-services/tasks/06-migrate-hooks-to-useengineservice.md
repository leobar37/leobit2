# T-006 Migrate Hooks to useEngineService

## Objective

Replace all 111 instances of `engine.use("name", () => new Service(engine))` across hooks with `useEngineService<T>("name")`.

## Requirements Covered

- `FR-008`

## Dependencies

- `T-005`

## Files or Areas Involved

- `packages/app/app/hooks/use-customers.ts` (9 functions)
- `packages/app/app/hooks/use-sales.ts` (13 functions)
- `packages/app/app/hooks/use-purchases.ts` (14 functions)
- `packages/app/app/hooks/use-products.ts` (4 functions)
- `packages/app/app/hooks/use-product-variants.ts` (6 functions)
- `packages/app/app/hooks/use-payments.ts` (6 functions)
- `packages/app/app/hooks/use-tags.ts` (5 functions)
- `packages/app/app/hooks/use-customer-tags.ts` (4 functions)
- `packages/app/app/hooks/use-customer-tags-with-details.ts` (1 function)
- `packages/app/app/hooks/use-customer-filters.ts` (1 function)
- `packages/app/app/hooks/use-grupos.ts` (7 functions)
- `packages/app/app/hooks/use-customer-groups-with-details.ts` (2 functions)
- `packages/app/app/hooks/use-bulk-assign-tags.ts` (1 function)
- `packages/app/app/hooks/use-bulk-assign-groups.ts` (1 function)
- `packages/app/app/hooks/use-visitas.ts` (4 functions)
- `packages/app/app/hooks/use-inventory.ts` (4 functions)
- `packages/app/app/hooks/use-distribuciones.ts` (3 functions)
- `packages/app/app/hooks/use-suppliers.ts` (6 functions)
- `packages/app/app/hooks/use-dashboard.ts` (3 functions)
- `packages/app/app/hooks/use-accounts-receivable.ts` (2 functions)
- `packages/app/app/hooks/use-sales-db.ts` (5 functions)

## Actions

For each hook file, perform a systematic transformation:

### Pattern to replace:
```typescript
// BEFORE:
import { useSyncEngine } from "@avileo/drizzle-sync/react";
import { CustomerService } from "~/lib/services/customer-service";

export function useCustomers() {
  const engine = useSyncEngine();
  const customerService = engine.use("customers", () => new CustomerService(engine));
  // ...
}
```

### Pattern to use:
```typescript
// AFTER:
import { useEngineService } from "@avileo/drizzle-sync/react";
import { CustomerService } from "~/lib/services/customer-service";

export function useCustomers() {
  const customerService = useEngineService<CustomerService>("customers");
  // ...
}
```

### Steps per file:

1. Replace `import { useSyncEngine } from "@avileo/drizzle-sync/react";` with `import { useEngineService } from "@avileo/drizzle-sync/react";`
2. Find all instances of:
   ```typescript
   const engine = useSyncEngine();
   const xxxService = engine.use("xxx", () => new XxxService(engine));
   ```
3. Replace with:
   ```typescript
   const xxxService = useEngineService<XxxService>("xxx");
   ```
4. Remove any unused `useSyncEngine` imports after replacement
5. Verify the service name string matches the entity name in `createAvileoSyncEngine.entities[]`

### Batch approach:

- Use search-and-replace with regex or structured edits
- Process files in batches of 3-5 to verify each batch compiles
- Start with simpler hooks (`use-tags.ts`, `use-suppliers.ts`) before complex ones (`use-sales.ts`, `use-sales-db.ts`)

## Completion Criteria

- Zero occurrences of `engine.use(` in `packages/app/app/hooks/`
- Zero occurrences of `useSyncEngine(` in hooks (unless needed for non-service purposes)
- All hook functions use `useEngineService<T>("name")`
- Hook APIs remain unchanged (same function signatures, return types, query keys)

## Validation

- `cd packages/app && bun run typecheck`
- `grep -r "engine.use(" packages/app/app/hooks/` should return empty
- `grep -r "useSyncEngine(" packages/app/app/hooks/` should return empty (or only where genuinely needed)
- Spot-check 3-5 hooks in the running app to verify they still fetch data correctly

## Risks or Notes

- Some hooks may use `useSyncEngine()` for purposes other than getting services (e.g., accessing `engine.getSyncService()`, `engine.getDb()`). Keep those usages—only replace service instantiation.
- The generic type parameter `<CustomerService>` is important for TypeScript inference. Without it, the service methods won't be type-safe.
- If a hook imports multiple services, it will have multiple `useEngineService` calls. This is fine.
