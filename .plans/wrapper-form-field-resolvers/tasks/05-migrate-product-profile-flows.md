# T-005 - Migrate Product and Profile Flows

## Objective

Migrate the simpler visible media flows first so the API shape is proven before workflow-heavy payment and purchase forms are touched.

## Requirements Covered

- `FR-014`
- `FR-015`
- `NFR-005`

## Dependencies

- T-002
- T-003
- T-004

## Files or Areas Involved

- `packages/app/app/routes/_protected.productos.nuevo.tsx` - Modify - use `useWrapperForm` with `imageId: assetField()`
- `packages/app/app/components/products/product-form.tsx` - Modify - replace direct `AssetPicker` wiring where still used
- `packages/app/app/components/products/product-form-content.tsx` - Modify - use `FormMediaField name="imageId"`
- `packages/app/app/components/products/product-image.tsx` - Modify or wrap - stop per-row `useAsset` when parent batch resolver is available
- `packages/app/app/components/products/product-card.tsx` - Review - pass resolved image where appropriate
- `packages/app/app/routes/_protected.productos.$id.tsx` - Modify - use resolved submit for edit flow if it owns submit handling
- `packages/app/app/routes/_protected.profile.tsx` - Modify - use `useWrapperForm` with `avatarId: fileField()` and `FormMediaField`
- `packages/app/app/hooks/use-profile.ts` - Modify or simplify - remove special avatar upload hook if no longer needed

## Actions

1. Replace direct product create `useForm` with `useWrapperForm`.
2. Configure product image field with `imageId: assetField()`.
3. Replace direct `AssetPicker` usage with `FormMediaField name="imageId"` where the wrapper context is available.
4. Submit product create/edit through `form.handleResolvedSubmit` or `form.resolvePayload`.
5. Adjust product list/detail image rendering to use batch-resolved media where the parent has multiple products.
6. Replace profile avatar-specific upload logic with wrapper field resolver flow.
7. Ensure backend payloads still send `imageId` and `avatarId` IDs.
8. Keep existing UI text and layout behavior unless a minimal adjustment is necessary.

## Completion Criteria

- Product create/edit forms no longer manually manage asset picker state outside form resolver config.
- Profile avatar no longer requires a feature-specific upload hook to transform `File` to ID.
- Product image previews still render for existing products.
- Backend receives ID strings for `imageId` and `avatarId`.

## Validation

- `cd packages/app && bun run typecheck`
- Product create/edit manual test with existing asset and newly uploaded asset.
- Profile avatar manual test with existing avatar and new upload.

## Risks or Notes

- `ProductImage` currently calls `useAsset(imageId || "")`; replacing it with batch resolution may require parent-level changes in product lists.
- Keep old `AssetPicker` available as an internal primitive until all uses are migrated.
