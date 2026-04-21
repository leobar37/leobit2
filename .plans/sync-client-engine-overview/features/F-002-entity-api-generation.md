# F-002 Entity API Generation

## Objective

Extend the existing `drizzle-sync` generator to produce:
1. Typed entity APIs (`engine-entities.ts`) that expose `engine.entities.customers.create(data)`
2. React hooks (`react-hooks.ts`) that wrap the engine with `useQuery`/`useMutation` and automatic cache invalidation

These generated artifacts replace the current `hooks.ts` (which is remote-first and unused) and provide the primary developer interface for local-first data operations.

## Scope Boundaries

- In scope:
  - `local-first-hooks-generator.ts` integration into the generator pipeline (`generator.ts`)
  - Generation of `engine-entities.ts` with typed `engine.entities.xxx` API
  - Generation of `react-hooks.ts` with `useCustomers()`, `useCreateCustomer()`, etc.
  - Invalidation key generation based on entity names
  - Support for entities with children (nested create/update)
- Out of scope:
  - Complex business hooks (those remain manual, F-004)
  - Changing the backend sync config schema
  - Replacing `services.ts` generation (it stays, engine consumes it)

## Verified Context

- Generator currently produces: `schemas.ts`, `types.ts`, `hooks.ts` (remote-first), `services.ts`, `applier.ts`, `init.sql`
- `local-first-hooks-generator.ts` exists but is **not integrated** into `generateAll()`
- Current `hooks.ts` uses `api.customers.post()` (remote-first)
- Manual hooks (`use-customers.ts`) use `customerService.findByBusiness()` (local-first)
- The generator reads `sync.config.ts` from backend to discover entities

## Assumptions

- The generator can produce both imperative APIs and React hooks from the same entity config
- Generated hooks will use `useQuery`/`useMutation` from TanStack Query directly
- Entity priority/order from `sync.config.ts` can be used to determine invalidation cascade

## Unknowns

- Whether generated hooks should live in `packages/app` (app-specific) or `@avileo/drizzle-sync/react` (reusable)
- How to handle custom hooks that extend generated ones (e.g., `useSaleWithItems` combining `sales` + `saleItems` + `customers`)

## Likely Files or Areas Involved

- `packages/drizzle-sync/src/config/generators/generator.ts` — **Modify** — Integrate local-first generator into pipeline
- `packages/drizzle-sync/src/config/generators/local-first-hooks-generator.ts` — **Modify** — Extend to produce engine-entities API
- `packages/drizzle-sync/src/config/generators/hooks-generator.ts` — **Review** — Deprecate or repurpose
- `packages/app/app/lib/sync/generated/` — **Create** — New output: `engine-entities.ts`, `react-hooks.ts`
- `packages/backend/src/sync.config.ts` — **Review** — Ensure entity config has enough metadata for generation
- `packages/app/app/hooks/use-customers.ts` — **Review** — Reference for hook pattern to generate

## Feature Dependencies

- Depends on: F-001 (engine class must exist to generate against its interface)
- Blocks: F-004 (migration uses generated APIs)

## Human-Owned Tracking Fields

- Status: planned
- Owner: backend team
- Decision Notes: Generated hooks should match manual hook patterns exactly; validate by diffing output against use-customers.ts
- Manual Overrides: none

## Parallelization Notes

- Parallelizable: yes
- Reason: Code generation logic is isolated from React integration (F-003); can be developed in parallel once F-001 interface is frozen

## Worktree Recommendation

- Recommended: yes
- Suggested branch: `feature/sync-entity-api-generation`
- Suggested worktree path: `../wt-sync-entity-api`
- Rationale: Isolated scope; safe to develop in parallel without affecting main tree

## Suggested `/plan` Mode

- Mode: `structured`
- Rationale: Multiple generator modifications, new output formats, validation against existing manual hooks

## Suggested Next Command

- `/plan .plans/sync-client-engine-overview/features/F-002-entity-api-generation.md`
