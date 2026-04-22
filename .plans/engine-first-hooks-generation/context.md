# Engine-First Hooks Generation Context

## Overview

Redesign the drizzle-sync code generator to produce **engine-first React hooks** that consume the `SyncClientEngine` via `useEngineService<T>()`, replacing the current broken API-first hooks that assume a non-existent `api-client` and are generated in the wrong location (backend instead of frontend).

## Background

The current `hooks-generator.ts` produces hooks like:

```ts
// ❌ BROKEN: Generated in backend, assumes REST API
import { api } from "~/lib/api-client"; // ← does not exist in backend
const { data } = await api.customers.get(); // ← API-first, not local-first
```

But the actual Avileo app architecture is:

```ts
// ✅ ACTUAL: Engine-first, PGlite local-first
const service = useEngineService<CustomersService>("customers");
const customers = await service.list(); // ← PGlite local DB
```

The generated hooks file (`packages/backend/src/generated/sync/hooks.ts`) has **zero consumers** in the app, contains invalid imports, and is generated in the wrong package. Meanwhile, every entity requires hand-written CRUD hooks (5 per entity × 12 entities = ~60 hooks) that follow an identical boilerplate pattern.

## Goal

1. Generate hooks that use `useEngineService<T>("entityName")` from `@avileo/drizzle-sync/react`
2. Generate hooks that call generated service methods: `list()`, `findById()`, `create()`, `update()`, `delete()`
3. Integrate with TanStack Query (`useQuery`/`useMutation`) with automatic query key invalidation
4. Support basic filters (`search`, `limit`, `offset`, `sortBy`) for the list hook
5. Write all generated artifacts to the frontend (`packages/app/app/lib/sync/generated/`)
6. Remove/deprecate the broken backend-generated hooks

## Key Decisions

- **Engine-first, not API-first**: All generated hooks consume the `SyncClientEngine` service registry, not REST endpoints.
- **Basic filters are generable**: `search` (across varchar/text fields), `limit`/`offset` (pagination), `sortBy`/`sortOrder` (by `createdAt` or any column). Domain-specific filters (`hasDni`, `tagIds`) remain custom hook territory.
- **Tenant-aware by default**: All list operations are implicitly scoped to the current tenant via the engine context. No explicit `businessId` parameter in hooks.
- **Custom hooks extend generated base**: The generated hooks provide the CRUD foundation. App-specific hooks (e.g., `useCustomers(filters)`) can import the generated service types and add domain logic.
- **All artifacts go to frontend**: `services.ts`, `hooks.ts`, `schemas.ts`, `types.ts`, `init.sql`, `applier.ts` all live in `packages/app/app/lib/sync/generated/`.

## Scope Boundaries

- **In scope**:
  - Redesign `hooks-generator.ts` for engine-first output
  - Fix `service-generator.ts` tenant/business naming inconsistency
  - Unify output directory to frontend
  - Remove dead backend-generated hooks
  - Generate basic filter types for list hooks
  - End-to-end validation with one entity
- **Out of scope**:
  - Rewriting existing custom hooks (they continue working)
  - Generating domain-specific filters (hasDni, tagIds, etc.)
  - Generating atomic parent+child creation (e.g., Sale + SaleItems) — remains custom
  - Changes to the sync engine runtime (`@avileo/drizzle-sync/client` or `/react`)
