# T-004 End-to-end validation with test entity

## Objective

Run the complete generator pipeline, verify TypeScript compilation, and confirm that existing custom hooks continue working without modification.

## Requirements Covered

- `NFR-001`, `NFR-003`

## Dependencies

- `T-003`

## Files or Areas Involved

- `packages/app/app/lib/sync/generated/hooks.ts` — Review — Generated output
- `packages/app/app/hooks/use-customers.ts` — Review — Existing custom hook for comparison
- `packages/app/app/hooks/use-products.ts` — Review — Existing custom hook for comparison
- `packages/app/tsconfig.json` — Review — Ensure generated files are included
- `packages/app/package.json` — Review — Build / typecheck scripts

## Actions

1. **Run the generator**:
   - Execute the drizzle-sync generate command (e.g., `bun run generate` or `bun run --cwd packages/drizzle-sync cli.ts generate`).
   - Confirm all 6 files appear in `packages/app/app/lib/sync/generated/`.

2. **Inspect generated hooks.ts**:
   - Pick one entity (e.g., `tags` — simple, no children).
   - Verify it exports `useTags`, `useTag`, `useCreateTag`, `useUpdateTag`, `useDeleteTag`.
   - Verify imports are correct: `useEngineService`, TanStack Query, `./services`.
   - Verify `ListOptions` type exists.

3. **TypeScript compilation check**:
   - Run `cd packages/app && bun run typecheck` (or `tsc --noEmit`).
   - Confirm zero errors from the generated files.
   - Fix any import path or type mismatch issues.

4. **Backwards compatibility check**:
   - Verify `packages/app/app/hooks/use-customers.ts` still compiles (it imports `useCustomerService` from `engine-provider.tsx`, not from generated hooks).
   - Verify `packages/app/app/hooks/use-products.ts` still compiles.
   - Run the app dev server briefly to confirm no runtime errors.

5. **Functional smoke test** (optional but recommended):
   - Temporarily import one generated hook into a test component (not committed):
     ```ts
     import { useTags } from "~/lib/sync/generated/hooks";
     ```
   - Confirm the hook returns data from the engine service.

## Completion Criteria

- `bun run typecheck` in `packages/app` passes with zero errors.
- Existing custom hooks (`use-customers.ts`, `use-products.ts`, `use-sales.ts`) compile without changes.
- Generated `hooks.ts` is importable and typed correctly.

## Validation

- `cd packages/app && bun run typecheck`
- `cd packages/app && bun run build` (if available) or `bun run dev` startup without errors.

## Risks or Notes

- If `BaseService` or `SyncClientEngine` types changed recently, the generated service/hook types may drift. The typecheck will catch this.
- If `useEngineService` generic inference fails, the generated hooks may need explicit type annotations.
