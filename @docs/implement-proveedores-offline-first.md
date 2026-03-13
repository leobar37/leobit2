# Implement Offline-First for Proveedores

## Objective

Adapt the proveedores (suppliers) feature to work offline by implementing the same PGlite + ElectricSQL pattern already used by customers, sales, payments, and purchases. Currently, the feature makes direct API calls that fail when offline.

## Current State

- **Done:**
  - Backend analysis: schema, repository, service, and API endpoints exist and are complete
  - Pattern identified: CustomerService is the exact template to follow
  - Files analyzed: customer-service.ts, base-service.ts, service-provider.tsx, use-suppliers.ts
  - Root cause identified: useSuppliers hook makes direct API calls instead of using local service

- **Remaining:**
  - Create SupplierService class extending BaseService
  - Register SupplierService in ServiceProvider
  - Rewrite useSuppliers hook to use the new service
  - Fix bug in proveedores._index.tsx (passes `search` string instead of `businessId`)
  - Update proveedores.nuevo.tsx to use service mutations
  - Create missing routes: proveedores.$id._index.tsx (detail) and proveedores.$id.edit.tsx (edit)
  - Add supplierSchema to lib/db/schema.ts

- **In progress:** None yet

- **Blockers or constraints:** None

## Decisions Already Made

- **SupplierService must extend BaseService** - This is the established pattern in the codebase (CustomerService, SaleService, etc.). Using a different pattern would break consistency.
- **queueSync must be called after every write** - This ensures offline operations are queued for sync when back online.
- **Use PGlite for local storage** - This is the current offline-first approach, not TanStack DB.
- **BusinessId must be passed from context** - The route must use `useBusinessId()` from service-provider, not pass search string as businessId.

## Affected Files / Artifacts

- `packages/app/app/lib/services/supplier-service.ts` - **create** - New file, follows customer-service.ts pattern
- `packages/app/app/lib/sync/service-provider.tsx` - **change** - Add SupplierService import, registration, and useSupplierService hook
- `packages/app/app/hooks/use-suppliers.ts` - **change** - Replace API calls with service calls, fix parameter usage
- `packages/app/app/routes/_protected.proveedores._index.tsx` - **change** - Fix businessId bug, use proper hook signature
- `packages/app/app/routes/_protected.proveedores.nuevo.tsx` - **change** - Use service mutations instead of API
- `packages/app/app/routes/_protected.proveedores.$id._index.tsx` - **create** - Detail view (missing)
- `packages/app/app/routes/_protected.proveedores.$id.edit.tsx` - **create** - Edit form (missing)
- `packages/app/app/lib/db/schema.ts` - **change** - Add supplierSchema Zod validation

## Execution Plan

1. **Create SupplierService** - Copy customer-service.ts structure, adapt for suppliers (TABLE_NAME="suppliers", ENTITY_TYPE="suppliers", ID_PREFIX="supp"). Implement: findById, findByBusiness, create, update, delete. Each method must write to PGlite AND call queueSync.

2. **Register in ServiceProvider** - Add SupplierService import, add to ServicesContextValue interface, instantiate in useMemo, export useSupplierService hook.

3. **Rewrite useSuppliers hook** - Replace api.suppliers.post/put/delete calls with supplierService.create/update/delete. Ensure hooks get businessId from context.

4. **Fix route list bug** - In proveedores._index.tsx line 71, change `useSuppliers(search)` to `useSuppliers(businessId)` using `useBusinessId()` hook.

5. **Update create route** - Make proveedores.nuevo.tsx use the service-based mutations.

6. **Create missing routes** - Build proveedores.$id._index.tsx (detail view) and proveedores.$id.edit.tsx (edit form) following existing patterns like clientes.$id._index.tsx.

7. **Add local schema** - Add supplierSchema to lib/db/schema.ts for local validation (Zod).

## Validation

- **Automated:**
  - `bun run typecheck` passes
  - Build succeeds: `bun run build`

- **Manual:**
  - Create a supplier while offline (simulate with DevTools > Network > Offline)
  - Verify it saves to local PGlite
  - Come back online and verify sync happens
  - Check sync status in UI updates from "pending" to "synced"

- **Acceptance:**
  - Proveedores CRUD works completely offline
  - Creating/editing/deleting a supplier queues for sync
  - No API calls made directly (all go through service layer)
  - Route /proveedores loads without passing search as businessId

## Open Questions / Assumptions

- No open questions. All implementation details are defined by existing patterns.

## Immediate Next Action

Create `packages/app/app/lib/services/supplier-service.ts` by copying customer-service.ts and adapting:
- TABLE_NAME = "suppliers"
- ENTITY_TYPE = "suppliers"
- ID_PREFIX = "supp"
- Map fields: name, type, ruc, address, phone, email, notes, isActive
- Include syncStatus and syncAttempts in create operation
