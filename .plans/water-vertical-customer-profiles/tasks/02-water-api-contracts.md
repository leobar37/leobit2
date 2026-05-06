# T-002 Water API Contracts

## Objective

Expose typed backend APIs and shared contracts for creating, reading, and updating water customer profiles and related ledger data.

## Requirements Covered

- `FR-003`
- `FR-013`
- `FR-014`
- `NFR-004`
- `NFR-005`

## Dependencies

- `T-001`

## Files or Areas Involved

- `packages/backend/src/api/customers.ts` - Modify - Accept and return vertical profile payloads where appropriate.
- `packages/backend/src/services/business/customer.service.ts` - Modify - Orchestrate base customer and water profile writes transactionally.
- `packages/backend/src/services/repository/` - Create/Modify - Add repositories for water profiles, container ledger, and deposit ledger.
- `packages/backend/src/plugins/services.ts` - Modify - Register new repositories/services.
- `packages/shared/src/index.ts` - Modify - Add DTOs for water customer profile requests and responses.

## Actions

1. Define shared DTOs for `WaterCustomerProfile`, `CreateWaterCustomerProfileInput`, and `UpdateWaterCustomerProfileInput`.
2. Extend create/update customer inputs with an optional `waterProfile` payload.
3. In services, validate that `waterProfile` can only be written when `ctx.businessMode === "agua"`.
4. When creating an agua customer with a profile, write customer and profile inside one transaction.
5. When updating an agua customer, update base fields and profile fields transactionally.
6. Return customer responses with `waterProfile` only for agua businesses.
7. Add read helpers for profile by customer id and for route-generation queries by day/route.
8. Add service tests for tenant isolation, mode validation, transaction behavior, and polleria exclusion.

## Completion Criteria

- Polleria requests cannot write water profile data.
- Agua customer create/update can persist and return `waterProfile`.
- Backend responses remain backward-compatible for existing customer consumers.
- Repositories use `ctx` first and filter by `businessId`.

## Validation

- Run backend customer/water service tests.
- Run backend typecheck/build.
- Exercise API create/read/update for both polleria and agua with synthetic payloads.

## Risks or Notes

- Keep the API shape explicit. Do not accept arbitrary `customFields` as a write path for important business data.
