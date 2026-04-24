# Refactor Drizzle Sync Adoption - Requirements

## Objective

Eliminate raw SQL usage in frontend services and fix sync configuration inconsistencies so that the offline-first sync engine (`@avileo/drizzle-sync`) operates correctly for customers, payments, and sales flows.

## Scope

- **In scope**: Sync config, frontend services (payment, sale, purchase, distribucion), integration testing
- **Out of scope**: Backend repositories, UI changes, new features, library modifications

## Functional Requirements

- `FR-001` - All syncable entities must be registered in `SYNC_ENTITIES` and have correct priority values
- `FR-002` - Parent-child relationships in sync config must match the database schema (foreign key constraints)
- `FR-003` - Frontend services must use Drizzle ORM query builder or generated drizzle-sync services instead of `pg.query()`
- `FR-004` - Complex CTE queries for business logic (e.g., accounts receivable) must be encapsulated in typed Drizzle queries or views
- `FR-005` - All write operations must continue to enqueue sync operations via `queueSync()`
- `FR-006` - After refactoring, existing functionality (customer list, payment registration, sale creation) must remain identical from the user perspective

## Non-Functional Requirements

- `NFR-001` - No regression in offline-first behavior: all flows must work without network
- `NFR-002` - Type safety must be maintained or improved (no `any`, minimal casting)
- `NFR-003` - Sync ordering must guarantee parent-before-child processing to avoid FK errors

## Acceptance Criteria

- `files` entity is present in `SYNC_ENTITIES` with correct priority
- `visitas` and `abonos` have priority `2` (not `1`)
- `visitas` parent list includes `distribuciones` and `customers` (not `sales`)
- `payment-service.ts` contains zero `pg.query()` calls
- `sale-service.ts` contains zero `pg.query()` calls for business logic queries
- `purchase-service.ts` and `distribucion-service.ts` contain zero `pg.query()` calls
- All modified services pass TypeScript type checking
- E2E tests for customer, payment, and sale flows pass

## Constraints

- Must preserve existing data format and column names (no migrations)
- Must maintain backward compatibility with existing sync queue entries
- Must not break the mobile offline experience

## Open Questions

- Should `files` sync be enabled, or is it intentionally excluded from `SYNC_ENTITIES` because file uploads are online-only?
- Are there other frontend services using `pg.query()` that were not identified in the initial analysis?
