# T-005 Document custom hook extension pattern

## Objective

Write clear documentation so developers know how to extend the generated base hooks with domain-specific filters and business logic.

## Requirements Covered

- `NFR-001`

## Dependencies

- `T-004`

## Files or Areas Involved

- `packages/app/app/hooks/AGENTS.md` — Modify — Add section on generated hooks vs custom hooks
- `packages/drizzle-sync/README.md` or `AGENTS.md` — Review/Modify — Document generator output and extension pattern

## Actions

1. **Document the generated hook contract**:
   - For each entity, the generator produces 5 base hooks:
     - `use<Entity>s(options?: ListOptions)`
     - `use<Entity>(id: string | null)`
     - `useCreate<Entity>()`
     - `useUpdate<Entity>()`
     - `useDelete<Entity>()`
   - `ListOptions` includes `search`, `limit`, `offset`, `sortBy`, `sortOrder`.

2. **Document the custom hook extension pattern**:
   - Show a concrete example using `customers`:
     ```ts
     // Generated (do not edit)
     // packages/app/app/lib/sync/generated/hooks.ts
     export function useCustomers(options?: ListOptions) { ... }

     // Custom (developer writes this)
     // packages/app/app/hooks/use-customers.ts
     import { useCustomerService } from "~/lib/sync/engine-provider";
     import type { CustomerSearchFilters } from "~/lib/services/customer-service";

     export function useCustomers(filters?: CustomerSearchFilters) {
       const service = useCustomerService();
       return useQuery({
         queryKey: filters ? ["customers", "search", filters] : ["customers"],
         queryFn: () => service.findByBusiness(filters),
       });
     }
     ```
   - Explain: "Import the generated service type, use `useCustomerService()` from the engine provider, and add your domain methods (`findByBusiness`, `search`, `getCustomerTagsForCustomers`)."

3. **Document when to use generated vs custom**:
   - **Use generated** if you only need CRUD (list, get, create, update, delete) with basic filters.
   - **Write custom** if you need domain-specific filters, pagination with custom shapes, atomic multi-entity operations (Sale + SaleItems), or non-CRUD service methods.

4. **Document the generator command**:
   - How to regenerate after schema changes.
   - Where the output goes.
   - What files are safe to edit (none in `generated/`) vs what to extend (files in `app/hooks/` and `app/lib/services/`).

5. **Delete or update the `engine-hooks.ts` POC**:
   - `packages/app/app/hooks/engine-hooks.ts` was a proof-of-concept.
   - Either delete it (since generated hooks now provide the same pattern) or update its comments to point to the generated hooks.

## Completion Criteria

- `packages/app/app/hooks/AGENTS.md` contains a section "Generated Hooks vs Custom Hooks" with the extension pattern.
- A new developer can read the doc and know exactly where to write a custom hook that extends the generated base.

## Validation

- Read the documentation section and mentally verify it matches the actual generated output from T-004.
- Ask: "If I need to add `hasDni` filter to customers, do I know where to write it and what to import?"

## Risks or Notes

- Keep documentation in the same language as existing AGENTS.md files (English for code comments, Spanish for user-facing text).
- Do not duplicate the full API reference of `@avileo/drizzle-sync/react` — link to it instead.
