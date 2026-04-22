# Engine-First Hooks Generation Requirements

## Objective

Redesign the drizzle-sync code generator to produce engine-first React hooks that consume the `SyncClientEngine` via `useEngineService<T>()`, replacing the broken API-first hooks. All generated artifacts must reside in the frontend package and support basic CRUD with tenant-aware filtering.

## Scope

- **In scope**:
  - `hooks-generator.ts` redesign for engine-first
  - `service-generator.ts` tenant/business naming fix
  - Output directory unification (frontend only)
  - Removal of dead backend-generated hooks
  - Basic filter generation (search, limit, offset, sortBy)
  - End-to-end validation
- **Out of scope**:
  - Existing custom hooks remain untouched
  - Domain-specific filter generation
  - Atomic multi-entity creation hooks
  - Changes to `@avileo/drizzle-sync` runtime (client/react modules)

## Functional Requirements

- `FR-001` — Hooks must use `useEngineService<T>("entityName")` from `@avileo/drizzle-sync/react` instead of direct API calls.
- `FR-002` — Hooks must call generated service methods: `list()`, `findById()`, `create()`, `update()`, `delete()`.
- `FR-003` — Hooks must integrate with TanStack Query (`useQuery` for reads, `useMutation` for writes) with automatic query-key invalidation on mutations.
- `FR-004` — The list hook (`use<Entity>s`) must accept optional basic filters: `search?` (string, fuzzy across varchar/text columns), `limit?` (number), `offset?` (number), `sortBy?` (column name), `sortOrder?` ("asc" | "desc").
- `FR-005` — All generated files (`hooks.ts`, `schemas.ts`, `types.ts`, `services.ts`, `init.sql`, `applier.ts`) must be written to `packages/app/app/lib/sync/generated/`.
- `FR-006` — The broken backend-generated hooks (`packages/backend/src/generated/sync/hooks.ts`) must stop being generated or be removed.
- `FR-007` — Generated hooks must be fully typed, importing types from the generated `services.ts` (`CreateXxxInput`, `UpdateXxxInput`, service class).

## Non-Functional Requirements

- `NFR-001` — Backwards compatibility: existing custom hooks and services must continue working without changes.
- `NFR-002` — Naming consistency: the generator and `BaseService` must agree on whether the tenant identifier is called `tenantId` or `businessId`.
- `NFR-003` — The generated hooks file must compile without TypeScript errors (`tsc --noEmit` in `packages/app`).

## Acceptance Criteria

- `packages/app/app/lib/sync/generated/hooks.ts` compiles and exports `useCustomers`, `useCustomer`, `useCreateCustomer`, `useUpdateCustomer`, `useDeleteCustomer`, etc.
- `packages/backend/src/generated/sync/hooks.ts` no longer exists or is no longer generated.
- Running the generator produces zero `Cannot find module` errors.
- A manually written custom hook can import `CustomersService` from the generated `services.ts` and add domain-specific filters on top.

## Constraints

- The app uses `@tanstack/react-query` v5. The generated hooks must use its API (`useQuery`, `useMutation`, `useQueryClient`, `invalidateQueries`).
- The engine service names are registered in `engine-service-factories.ts` (e.g., `"customers"`, `"sales"`). The generated hooks must reference the same names.
- `BaseService` exposes `businessId` as the tenant property. The generated service constructor must align with this.

## Open Questions

- [Resolved] All generated artifacts go to `packages/app/app/lib/sync/generated/`.
- [Resolved] Basic filters are `search`, `limit`, `offset`, `sortBy`, `sortOrder`.
