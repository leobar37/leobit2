# T-004 Extend Remaining Entity Services

## Objective

Refactor all remaining manual services to extend their generated counterparts, keeping only custom business methods.

## Requirements Covered

- `FR-004`
- `FR-005`

## Dependencies

- `T-001`
- `T-003`

## Files or Areas Involved

- `packages/app/app/lib/services/purchase-service.ts` — Extend `PurchasesService`
- `packages/app/app/lib/services/product-service.ts` — Extend `ProductsService`
- `packages/app/app/lib/services/inventory-service.ts` — No generated base; keep as-is
- `packages/app/app/lib/services/tag-service.ts` — Extend `TagsService`
- `packages/app/app/lib/services/customer-tag-service.ts` — Extend `CustomerTagsService`
- `packages/app/app/lib/services/visita-service.ts` — Extend `VisitasService`
- `packages/app/app/lib/services/customer-group-service.ts` — Extend `CustomerGroupsService`
- `packages/app/app/lib/services/distribucion-service.ts` — Extend `DistribucionesService`
- `packages/app/app/lib/services/supplier-service.ts` — Extend `SuppliersService`

## Actions

For each service (except `InventoryService` which has no generated counterpart):

1. Change `extends BaseService` to `extends GeneratedXxxService`
2. Remove constructor if it only calls `super(engine)`
3. Remove `getEntityType()` and `getEntityPrefix()` (inherited)
4. Audit each CRUD method (`create`, `update`, `delete`, `findById`, `list`):
   - If it's a pure override with identical logic → **delete it**
   - If it adds validation, normalization, or side effects → **keep it**
5. Keep all custom business methods (search, pagination, aggregation, atomic operations, junction management)

### Service-specific notes:

- **PurchaseService**: Has atomic `createWithItems` and draft management. Keep these. May need to keep `updateStatus` and item management methods.
- **ProductService**: Has variant management (`getVariants`, `createVariant`, etc.). Keep these. The `create` override that auto-creates a variant may need to stay.
- **TagService**: Simple extension, only `getCustomerCount` is custom.
- **CustomerTagService**: All methods are custom (junction table management). May need to keep most methods.
- **VisitaService**: Keep enriched `findById`, `findByBusiness`, `findByDistribucion`, `createBulk`.
- **CustomerGroupService**: Keep member management methods (`getMembers`, `addMembers`, `removeMember`, `isMember`, `createWithMembers`).
- **DistribucionService**: Keep item management and atomic `createWithItems`.
- **SupplierService**: Only `findByBusiness` with search is custom.

## Completion Criteria

- All services (except `InventoryService`) extend their generated counterpart
- No service contains redundant CRUD methods
- All custom business methods are preserved
- TypeScript compiles all service files without errors

## Validation

- `cd packages/app && bun run typecheck`
- Verify each service file compiles
- Check that no `BaseService` is extended directly (except `InventoryService` and `SaleService` if decided in T-003)

## Risks or Notes

- Junction table services (`CustomerTagService`, `CustomerGroupService`) have complex custom logic. Be careful not to lose business rules.
- `InventoryService` has no generated base—document why it stays as-is.
- If a generated `list()` method filters by `businessId` but the manual version added ordering or limits, verify the generated version has equivalent behavior.
