# T-007 - Tests and Cleanup

## Objective

Add focused test coverage for the wrapper/resolver system, verify backend tenant safety, and remove or wrap deprecated duplicate upload/resolve paths after migrations are complete.

## Requirements Covered

- `FR-004`
- `FR-005`
- `FR-006`
- `FR-014`
- `NFR-001`
- `NFR-002`
- `NFR-004`
- `NFR-006`

## Dependencies

- T-005
- T-006

## Files or Areas Involved

- `packages/app/app/lib/forms/__tests__/` - Create - resolver and wrapper unit tests
- `packages/app/app/hooks/__tests__/` or existing test structure - Create/modify - upload/resolve hook tests if applicable
- `packages/app/app/components/forms/__tests__/` - Create/modify - media field tests if project test setup supports component tests
- `packages/backend/src/services/repository/file.repository.test.ts` - Create - tenant boundary tests
- `packages/backend/src/api/media.test.ts` - Create - batch resolver route tests if route tests exist
- `packages/app/app/hooks/use-file-upload.ts` - Delete or convert to wrapper once no direct uses remain
- `packages/app/app/hooks/use-files.ts` - Cleanup duplicated validation/upload logic if replaced
- `packages/app/app/hooks/use-assets.ts` - Cleanup duplicated upload logic if replaced
- `packages/app/app/components/forms/form-file-upload.tsx` - Delete or deprecate as wrapper if unused
- `packages/app/app/components/forms/form-asset-picker.tsx` - Delete or deprecate as wrapper if unused

## Test Cases

Frontend resolver tests:

1. `resolvePayload()` leaves a string ID unchanged.
2. `resolvePayload()` converts `{ id, url }` to `id`.
3. `resolvePayload()` uploads `File` and returns uploaded ID.
4. `resolvePayload()` preserves `null` and `undefined` as configured.
5. `resolvePayload()` throws and does not call submit callback when upload fails.
6. `handleResolvedSubmit()` calls callback with resolved payload.
7. Non-configured fields are unchanged.

Backend tests:

1. Same-business file/asset IDs resolve successfully.
2. Cross-business file IDs are omitted or rejected without data leakage.
3. Deleted file/asset IDs are omitted.
4. Duplicate IDs in request do not duplicate work or response entries.

## Actions

1. Add frontend unit tests for generic field resolver behavior.
2. Add frontend unit tests for `useWrapperForm.resolvePayload` and `handleResolvedSubmit`.
3. Add backend tests for file repository tenant filtering.
4. Add backend tests for `POST /media/resolve` if route test infrastructure exists.
5. Search for remaining direct imports of `uploadFileNow`, `useUploadFile`, `useUploadAsset`, `useFile`, `useAsset`, `FormFileUpload`, `FormAssetPicker`, `use-file-upload`.
6. Remove deprecated paths only when no imports remain, or convert them into compatibility wrappers over the new core.
7. Run final typecheck/test commands.

## Completion Criteria

- Resolver behavior has unit coverage for the main value shapes.
- Backend tenant safety has direct coverage.
- No remaining usage depends on the stubbed `use-file-upload.ts` implementation.
- Duplicated upload/validation code is removed or delegated to the new core.
- App and backend verification commands pass.

## Validation

- `cd packages/app && bun test`
- `cd packages/app && bun run typecheck`
- `cd packages/backend && bun test`
- `bun run build` from repository root if time permits.

## Risks or Notes

- Existing test setup may not have component tests for all UI pieces. Prioritize pure resolver and route/repository tests if UI testing is expensive.
- Do not delete old components/hooks until Grep confirms no remaining imports.
