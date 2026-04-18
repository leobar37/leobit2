# T-003 Standardize DistribucionService Types to String

## Objective

Change `DistribucionService.CreateDistribucionItemInput.cantidadAsignada` from `number` to `string`, removing the need for `Number()` in the sync handler and `.toString()` calls in the service.

## Requirements Covered

- `FR-003`
- `FR-004`

## Dependencies

- none

## Files or Areas Involved

- `packages/backend/src/services/business/distribucion.service.ts` — Modify — interface type and all `.toString()` / `parseFloat()` calls
- `packages/backend/src/services/sync/handlers/DistribucionSyncHandler.ts` — Modify — line 57

## Actions

1. **Update interface** (`distribucion.service.ts`):
   - `CreateDistribucionItemInput.cantidadAsignada`: change from `number` to `string`
   - Check all other interfaces that use `cantidadAsignada: number` (lines 104, 530, 738) and update them to `string`

2. **Remove `.toString()` calls** (`distribucion.service.ts`):
   - Line 177: `cantidadAsignada: item.cantidadAsignada.toString()` → `cantidadAsignada: item.cantidadAsignada`
   - Line 564: same pattern
   - Line 700: same pattern
   - Line 763: same pattern

3. **Fix `parseFloat()` call** (`distribucion.service.ts`):
   - Line 438: `parseFloat(item.cantidadAsignada)` → use `isPositive(item.cantidadAsignada)` or direct string comparison
   - This line calculates total assigned kilos. Replace `reduce` with string-based addition or keep the number conversion for internal aggregation (if it's only used for display/logging, `Number()` is acceptable here).

4. **Remove handler cast** (`DistribucionSyncHandler.ts`):
   - Line 57: `cantidadAsignada: Number(item.cantidadAsignada)` → `cantidadAsignada: item.cantidadAsignada`

5. **Check for other callers**: Search the entire backend for `CreateDistribucionItemInput` usage and verify no other callers pass `number` values.

## Completion Criteria

- `grep "Number(.*cantidadAsignada" packages/backend/src/services/ -r` returns zero matches
- `grep "cantidadAsignada.*number" packages/backend/src/services/ -r` returns zero matches (except test files)
- `DistribucionSyncHandler` passes `item.cantidadAsignada` directly without any cast
- All existing distribucion tests pass

## Validation

- `cd packages/backend && bun test`
- Search for all callers: `grep -r "CreateDistribucionItemInput" packages/backend/src/`
- Verify API route handlers (if any) that create distribuciones still work

## Risks or Notes

- This changes an exported interface type. Any API endpoint or service that creates distribucion items must be checked.
- The `reduce` on line 138 (`sum + item.cantidadAsignada`) needs to change if `cantidadAsignada` becomes string. Options:
  - Use a decimal `add()` helper from T-001
  - Convert to Number for this internal aggregation only (acceptable since it's for metrics, not persistence)
- The `<= 0` comparison on line 548 needs a string-compatible replacement (`isPositive` helper).
