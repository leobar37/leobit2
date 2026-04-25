# T-007 Update Non-Hook Service Consumers

## Objective

Update components and other files that directly instantiate or access services to use `useEngineService` or equivalent patterns.

## Requirements Covered

- `FR-009`

## Dependencies

- `T-006`

## Files or Areas Involved

- `packages/app/app/components/purchases/purchase-form-context.tsx` — Uses PurchaseService directly
- `packages/app/app/lib/debug/console/service-helpers.ts` — May reference service types
- Any other files that call `useSyncEngine()` followed by `engine.use()` or `engine.getInstance()`

## Actions

1. Search for remaining `engine.use(` and `useSyncEngine(` outside of hooks:
   ```bash
   grep -r "engine.use(" packages/app/app/ --include="*.ts" --include="*.tsx" | grep -v "hooks/"
   grep -r "useSyncEngine(" packages/app/app/ --include="*.ts" --include="*.tsx" | grep -v "hooks/"
   ```

2. For each file found:
   - Replace `engine.use("name", () => new Service(engine))` with `useEngineService<Service>("name")`
   - Or if it's not in a React hook context, use `engine.getService<Service>("name")` directly

3. In `purchase-form-context.tsx`:
   - Likely has `const engine = useSyncEngine(); const purchaseService = engine.use("purchases", ...) `
   - Replace with `const purchaseService = useEngineService<PurchaseService>("purchases")`

4. Check `lib/debug/console/service-helpers.ts`:
   - If it only imports types, no changes needed
   - If it instantiates services, update to use engine API

5. Verify no `engine.use(` or `engine.getInstance(` calls remain in the app (except in `registerAppServices` which is deleted in T-005)

## Completion Criteria

- Zero `engine.use(` calls outside of `drizzle-sync` internal code
- Zero `engine.getInstance(` calls in app code
- All service access goes through `useEngineService` or `engine.getService`

## Validation

- `cd packages/app && bun run typecheck`
- `grep -r "engine.use(" packages/app/app/ --include="*.ts" --include="*.tsx"` returns empty
- `grep -r "engine.getInstance(" packages/app/app/ --include="*.ts" --include="*.tsx"` returns empty

## Risks or Notes

- Some debug/devtools code may use `engine.getInstance()` for introspection. Decide if these should use `engine.getService()` instead.
- Components outside hooks (like contexts) can still call `useEngineService` because it's a React hook.
- If any file is not a React component/hook, it may need to accept the engine as a prop or use a different pattern.
