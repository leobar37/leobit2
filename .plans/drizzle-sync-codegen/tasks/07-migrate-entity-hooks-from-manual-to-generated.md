# T-007 Migrate Entity Hooks from Manual to Generated

## Objective

Move non-complex entity domains from manual hooks to generated SDK-backed hooks while keeping runtime behavior stable.

## Requirements Covered

- `FR-007`
- `NFR-003`

## Dependencies

- `T-005`
- `T-006`

## Files or Areas Involved

- `packages/app/app/hooks/use-customers.ts` - Modify - Migrate to generated hooks where possible.
- `packages/app/app/hooks/use-products.ts` - Modify - Migrate to generated hooks where possible.
- `packages/app/app/hooks/use-suppliers.ts` - Modify - Migrate to generated hooks where possible.
- `packages/app/app/hooks/use-tags.ts` - Modify - Migrate to generated hooks where possible.
- `packages/app/app/lib/sync/generated/hooks.ts` - Generated - Source for migrated imports.

## Actions

1. Migrate simple CRUD-heavy domains first (customers/products/suppliers/tags).
2. Preserve existing query keys or provide compatibility aliases where needed.
3. Keep manual wrappers only where custom business logic is still required.
4. Record migration map and remaining manual hooks.

## Completion Criteria

- Selected simple domains run on generated hooks in production code paths.
- Offline behavior and cache invalidation remain correct.
- Remaining manual hooks are explicitly classified as complex wrappers.

## Validation

- `cd packages/app && bun run typecheck`
- Run targeted hook tests and manual offline smoke checks for migrated domains.

## Risks or Notes

- Aggressive full replacement in one pass risks regression; migrate domain by domain.
