# T-001 Fix tenant/business naming in service-generator.ts

## Objective

Align the generated service constructor parameter naming with `BaseService` so that `this.businessId` is correctly set and referenced throughout the generated code.

## Requirements Covered

- `NFR-002`

## Dependencies

- none

## Files or Areas Involved

- `packages/drizzle-sync/src/config/generators/service-generator.ts` — Modify — Constructor parameter and property references
- `packages/app/app/lib/services/base-service.ts` — Review — Confirm `businessId` property name

## Actions

1. Open `service-generator.ts` and locate the constructor generation code (around lines 173-181).
2. Change the constructor parameter from `tenantId` to `businessId` to match `BaseService`'s constructor signature.
3. Verify that `super()` call passes `businessId` as the 4th argument.
4. Verify all internal references to the tenant field use `this.businessId` (or resolve to the correct property).
5. Check `getAutoManagedColumns` and `resolveTenantField` to ensure the auto-managed column set includes the correct variants (`business_id`, `businessId`, etc.).
6. Run `bun test` in `packages/drizzle-sync` to verify service-generator tests pass after the change.

## Completion Criteria

- Generated `CustomersService` constructor signature reads `constructor(pg, db, syncService, businessId, userId)`.
- All references to the tenant identifier inside the generated service use `this.businessId` consistently.
- Existing `service-generator.test.ts` passes after update.

## Validation

- `cd packages/drizzle-sync && bun test src/config/generators/__tests__/service-generator.test.ts`
- Verify generated `services.ts` output compiles without `Property 'tenantId' does not exist on type` errors.

## Risks or Notes

- The `BaseService` property is `businessId`, not `tenantId`. The generated code must align.
- `schema-adapter.ts` uses `tenant_id` as the default column name, but the field/property name should be `businessId` after camelCase resolution. Ensure the generator uses the resolved field name, not the raw column name.
