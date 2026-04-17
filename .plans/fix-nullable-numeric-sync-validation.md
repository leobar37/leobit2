# Fix Nullable Numeric Sync Validation

## Objective

Ensure the sync validation layer accepts `null` for optional numeric fields (like `orderedQuantity`, `unitPriceQuoted`) and normalizes them correctly, matching the frontend behavior where `normalizeNullableCurrency()` and `normalizeWeight()` return `null` for absent values.

## Scope

- In scope: Backend Zod schema validation for optional numeric fields in sync operations
- Out of scope: Frontend normalization changes, other sync validation layers

## Verified Context

- `packages/backend/src/services/sync/schemas/index.ts:31-49` - `optionalNumericStringTransform` uses `.optional()` which only accepts `undefined`, not `null`
- `packages/app/app/lib/services/base-service.ts:248-269` - `normalizeNullableCurrency()` and `normalizeWeight()` return `null` for null/undefined inputs
- The sync payload contains `"orderedQuantity":null` which Zod rejects with `invalid_union` error
- 9 schemas use `optionalNumericStringTransform` for fields like `quantity`, `orderedQuantity`, `unitPrice`, `unitPriceQuoted`, `amountPaid`, `balanceDue`, `tara`, `netWeight`, `packs`, `costPrice`, `totalAmount`, `totalCost`, `montoRecaudado`

## Assumptions

- The frontend intentionally sends `null` (not `undefined`) for optional absent values
- The backend should accept `null` as equivalent to `undefined` for optional fields
- JSON serialization preserves `null` values in the payload

## Files Involved

- `packages/backend/src/services/sync/schemas/index.ts` - Modify - Contains `optionalNumericStringTransform` that needs to accept `null`
- `packages/backend/src/services/sync/handlers/SaleItemSyncHandler.ts` - Review - Uses the schema for validation

## Ordered Execution Steps

1. **Update `optionalNumericStringTransform` to accept `null`**
   - Files: `packages/backend/src/services/sync/schemas/index.ts`
   - Action: Change the transform to accept `.nullable()` before `.optional()`, and update the transform logic to treat `null` the same as `undefined`
   - Depends on: None

2. **Verify the fix with manual payload test**
   - Files: None (validation only)
   - Action: Confirm the schema now accepts `{ orderedQuantity: null, unitPriceQuoted: null }` without error
   - Depends on: 1

## Risks and Edge Cases

- **Risk**: Changing `.optional()` to `.nullable().optional()` modifies the Zod union behavior - needs verification that `null` is properly transformed to `undefined`
- **Edge case**: If `null` appears in the union unexpectedly, ensure it doesn't break the numeric string transformation
- **Edge case**: Confirm other sync handlers using the same schema still work correctly

## Validation Strategy

- Test with a payload containing `null` for optional numeric fields:
  ```json
  {
    "orderedQuantity": null,
    "unitPriceQuoted": null
  }
  ```
- Verify the Zod parse succeeds and transforms `null` to `undefined` internally
- Run existing sync tests to ensure no regression

## Open Questions

- Should the frontend also be updated to use `undefined` instead of `null` for consistency? (Optional future improvement)
