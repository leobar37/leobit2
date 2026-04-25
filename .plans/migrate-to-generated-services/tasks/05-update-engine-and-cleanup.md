# T-005 Update Engine Configuration and Remove registerAppServices

## Objective

Update `createAvileoSyncEngine` to use the extended service classes, and delete the redundant `registerAppServices.ts` file.

## Requirements Covered

- `FR-006`
- `FR-007`

## Dependencies

- `T-003`
- `T-004`

## Files or Areas Involved

- `packages/app/app/lib/sync/generated/engine.ts` — Update `entities` array
- `packages/app/app/lib/sync/register-services.ts` — **Delete**
- `packages/app/app/routes/_protected.tsx` — Remove `registerAppServices` import and call

## Actions

1. In `generated/engine.ts`, update the `entities` array to use extended service classes:
   ```typescript
   // BEFORE (uses generated classes):
   { name: "customers", entityType: "customers", factory: (ctx) => new CustomersService(ctx) },

   // AFTER (uses extended classes):
   import { CustomerService } from "../../services/customer-service";
   // ...
   { name: "customers", entityType: "customers", factory: (engine) => new CustomerService(engine) },
   ```

2. Repeat for all 14+ entities:
   - `customers` → `CustomerService`
   - `sales` → `SaleService` (or keep `SalesService` if SaleService wasn't extended)
   - `abonos` → `PaymentService`
   - `purchases` → `PurchaseService`
   - `products` → `ProductService`
   - `tags` → `TagService`
   - `customer_tags` → `CustomerTagService`
   - `customer_groups` → `CustomerGroupService`
   - `customer_group_members` → keep generated or extend
   - `visitas` → `VisitaService`
   - `distribuciones` → `DistribucionService`
   - `suppliers` → `SupplierService`
   - `product_variants` → keep generated (managed by ProductService)
   - `sale_items` → keep generated (managed by SaleService)
   - `purchase_items` → keep generated (managed by PurchaseService)
   - `distribucion_items` → keep generated (managed by DistribucionService)

3. Delete `packages/app/app/lib/sync/register-services.ts`

4. In `routes/_protected.tsx`:
   - Remove `import { registerAppServices } from "~/lib/sync/register-services";`
   - Remove `registerAppServices(eng);` call (around line 74)

5. Verify that `createAvileoSyncEngine` still exports the same interface and `CreateEngineParams`

## Completion Criteria

- `register-services.ts` does not exist
- `createAvileoSyncEngine` imports and uses extended service classes
- `_protected.tsx` no longer imports or calls `registerAppServices`
- Engine still creates successfully and all services are accessible via `getService()`

## Validation

- `cd packages/app && bun run typecheck`
- Verify `bun run dev` starts without runtime errors
- Check browser console for service registration errors

## Risks or Notes

- The `name` in each entity definition must match what hooks expect (e.g., `"customers"`, not `"customer"`)
- Some entities like `sale_items` may not have extended services—they stay as generated
- If `SaleService` wasn't extended in T-003, keep using `SalesService` generated for the `sales` entity
- Ensure the factory parameter is named `engine` (not `ctx`) for clarity, matching T-001 changes
