# T-008 TypeScript Validation and Final Verification

## Objective

Run full TypeScript type checking and tests to validate the entire migration, then fix any remaining errors.

## Requirements Covered

- `FR-010`
- `NFR-001`
- `NFR-002`
- `NFR-003`

## Dependencies

- `T-005`
- `T-006`
- `T-007`

## Files or Areas Involved

- Entire `packages/app/` and `packages/drizzle-sync/` packages

## Actions

1. Run TypeScript type checking in app:
   ```bash
   cd packages/app && bun run typecheck
   ```

2. Run TypeScript type checking in drizzle-sync:
   ```bash
   cd packages/drizzle-sync && bun run typecheck
   ```

3. Run drizzle-sync tests:
   ```bash
   cd packages/drizzle-sync && bun test
   ```

4. Run app tests:
   ```bash
   cd packages/app && bun test
   ```

5. Fix any TypeScript errors:
   - If hooks have type mismatches, verify the service generic is correct
   - If generated services have missing methods, check if the extension class exported them
   - If `useEngineService` returns `unknown`, ensure the generic parameter is provided

6. Fix any test failures:
   - Update test mocks if they depended on old service instantiation patterns
   - Verify `SyncClientEngine` mocks still satisfy `SyncClientEngineLike`

7. Smoke test in browser:
   - Start dev server: `bun run dev`
   - Verify app loads without console errors
   - Navigate to key screens: customers, sales, purchases, products
   - Verify data loads correctly

8. Final cleanup:
   - Remove any unused imports in modified files
   - Remove any leftover `// @ts-ignore` or `@ts-nocheck` comments that were workarounds
   - Verify no `console.log` debugging statements remain

## Completion Criteria

- `bun run typecheck` passes in both `packages/app` and `packages/drizzle-sync`
- `bun test` passes in both packages
- App starts in dev mode without runtime errors
- Key screens (customers, sales, purchases, products) load data correctly
- No `engine.use(` calls remain in app code
- `register-services.ts` does not exist

## Validation

- Full test suite green
- Manual smoke test of 3-5 key app screens
- Code review: verify hook APIs unchanged, service methods preserved

## Risks or Notes

- Type errors may cascade—one missing type import can cause 50+ errors. Fix root causes first.
- If generated services changed method signatures (e.g., parameter types), hooks calling them may fail type check.
- The `SaleService` atomic operations are the highest risk for runtime bugs. Test creating a sale with items end-to-end.
