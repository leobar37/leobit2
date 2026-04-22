# T-002 Redesign hooks-generator.ts for engine-first with basic filters

## Objective

Rewrite `hooks-generator.ts` to produce engine-first React hooks that consume `useEngineService<T>()` from `@avileo/drizzle-sync/react`, call generated service methods, integrate with TanStack Query, and expose basic filter types.

## Requirements Covered

- `FR-001`, `FR-002`, `FR-003`, `FR-004`, `FR-007`

## Dependencies

- `T-001`

## Files or Areas Involved

- `packages/drizzle-sync/src/config/generators/hooks-generator.ts` — Modify — Complete rewrite of hook generation logic
- `packages/drizzle-sync/src/config/generators/code-builder.ts` — Review — Ensure helper supports the new import patterns
- `packages/drizzle-sync/src/config/generator.ts` — Modify — Update `generateAll` to use the new hooks generator

## Actions

1. **Delete all API-first logic** from `hooks-generator.ts`:
   - Remove `api-client` import generation.
   - Remove `api.customers.get()` / `api.customers.post()` patterns.
   - Remove CUID2 id generation in hooks (the service handles this).
   - Remove batch atomic parent+child creation logic (out of scope; custom hooks handle this).

2. **Implement engine-first hook generation** for each entity:
   - `use<Entity>s(options?: ListOptions)` → `useQuery` calling `service.list(options)`
   - `use<Entity>(id: string | null)` → `useQuery` calling `service.findById(id)`
   - `useCreate<Entity>()` → `useMutation` calling `service.create(input)`
   - `useUpdate<Entity>()` → `useMutation` calling `service.update(id, input)`
   - `useDelete<Entity>()` → `useMutation` calling `service.delete(id)`

3. **Generate basic filter types** per entity:
   - `ListOptions` interface with: `search?`, `limit?`, `offset?`, `sortBy?`, `sortOrder?`
   - `search` is a string; the service's `list()` must accept it (this is a new method or overload on the generated service; verify if `list()` already accepts params).
   - If `list()` does not accept options today, add an overload or update the generated service signature.

4. **Imports in generated hooks file**:
   - `import { useEngineService } from "@avileo/drizzle-sync/react";`
   - `import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";`
   - `import { <Entity>Service, type Create<Entity>Input, type Update<Entity>Input } from "./services";`

5. **Query keys pattern**:
   - List: `["entityName"]` or `["entityName", "list", options]`
   - Detail: `["entityName", id]`
   - Mutations invalidate list and detail keys on success.

6. **Update `generateAll` in `generator.ts`**:
   - Ensure it still calls `generateHooksFile` but with the new engine-first `generateHooks`.

7. **Add/update tests**:
   - Update `hooks-generator.test.ts` to assert engine-first output (imports, `useEngineService`, `useQuery`, `useMutation`, query key patterns).

## Completion Criteria

- `hooks-generator.ts` generates a file that compiles and exports 5 hooks per entity.
- Generated hooks use `useEngineService` from `@avileo/drizzle-sync/react`.
- Generated hooks do not reference `api-client` or direct REST calls.
- `ListOptions` type is generated per entity.

## Validation

- `cd packages/drizzle-sync && bun test src/config/generators/__tests__/hooks-generator.test.ts`
- Inspect generated output manually to confirm imports and hook signatures.

## Risks or Notes

- The generated service's `list()` method may not accept `ListOptions` today. Check `service-generator.ts` — if `list()` is hardcoded with no params, we must either:
  a) Change `service-generator.ts` to make `list()` accept optional filters, or
  b) Have the hook call `service.list()` without options and leave filter support for custom hooks.
- **Decision**: Option (a) is preferred since the user wants `findByBusiness(filters)` as a generable pattern. Add an optional `options?: ListOptions` parameter to the generated `list()` method.
