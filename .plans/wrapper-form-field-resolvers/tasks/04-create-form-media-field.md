# T-004 - Create Generic Form Media Field

## Objective

Create a reusable media field component that integrates with the wrapper form context. The component should only need the field `name` and UI labels; it should infer `file` vs `asset` behavior from the configured field resolver.

## Requirements Covered

- `FR-008`
- `FR-010`
- `NFR-003`

## Dependencies

- T-001
- T-003

## Files or Areas Involved

- `packages/app/app/components/forms/form-media-field.tsx` - Create - generic field component
- `packages/app/app/components/ui/file-uploader.tsx` - Reuse or adapt - visual upload/preview primitive
- `packages/app/app/components/assets/asset-picker.tsx` - Reuse or adapt - gallery picker behavior for asset fields
- `packages/app/app/components/assets/asset-gallery.tsx` - Reuse or adapt - asset upload/select UI
- `packages/app/app/components/forms/form-file-upload.tsx` - Later wrapper/deprecation candidate
- `packages/app/app/components/forms/form-asset-picker.tsx` - Later wrapper/deprecation candidate
- `packages/app/app/components/forms/index.ts` - Export new component

## Target API Shape

```tsx
<WrapperFormProvider form={form}>
  <FormMediaField name="imageId" label="Imagen del producto" />
</WrapperFormProvider>
```

No `kind`, no `resolve`, and no resolved object prop should be required when the field is configured in `useWrapperForm`.

## Actions

1. Create `FormMediaField` that reads the wrapper form context.
2. Use `name` to find the configured field resolver.
3. Render a clear error if `FormMediaField` is used for a field without a compatible resolver.
4. For file-like fields, reuse `FileUploader` where practical.
5. For asset-like fields, support selection/upload through the existing asset picker/gallery UI where practical.
6. Store selected `File`, ID string, or cleared value in `react-hook-form` state.
7. Show local previews for selected `File` values.
8. Use the frontend batch resolver from T-001/T-002 to show previews for existing string IDs.
9. Keep labels/helper text configurable in Spanish from the consuming feature.

## Completion Criteria

- `FormMediaField` can be used with only `name` and UI props when the wrapper form has a resolver for that field.
- Existing IDs render previews through batch resolution.
- Newly selected files render local previews before submit.
- Clearing the field updates form state to `null` or `undefined` based on component configuration.

## Validation

- Component tests or integration tests in T-007.
- Manual test on mobile-sized viewport for camera/gallery flows after migration.

## Risks or Notes

- Avoid putting upload-to-server side effects inside the field component; upload should happen during `resolvePayload()` unless a specific resolver opts into eager upload.
- If gallery selection requires immediate asset upload, keep that behavior in `assetField`/asset UI adapter but still ensure submit payload is an ID.
