# Wrapper Form Field Resolvers - Context

## Overview

Create a generic form wrapper for Avileo forms that can resolve special field values before they are sent to the backend. The immediate use case is file and asset fields: forms should be able to keep local values such as `File`, resolved media objects, or existing IDs, while the submit payload sent to the backend is normalized to IDs.

The API should not be media-specific at the form layer. The wrapper should be generic and extensible through field resolvers such as `fileField()` and `assetField()`.

## Background

Current file and asset behavior is spread across backend endpoints, frontend hooks, form components, and feature-specific submit handlers.

Verified current flows:

- `packages/backend/src/api/files.ts` exposes file upload/read/delete routes.
- `packages/backend/src/api/assets.ts` exposes asset gallery upload/read/delete routes.
- `packages/backend/src/services/business/file.service.ts` and `asset.service.ts` already contain `getWithUrl` and `getWithUrls` helpers.
- `packages/backend/src/services/repository/file.repository.ts` currently has `findById`, `findByIds`, and `softDelete` paths that do not filter by `ctx.businessId`.
- `packages/app/app/hooks/use-files.ts` implements `useFile`, `useUploadFile`, `uploadFileNow`, and `validateFile`.
- `packages/app/app/hooks/use-assets.ts` implements `useAssets`, `useAsset`, `useUploadAsset`, and `useDeleteAsset`.
- `packages/app/app/hooks/use-file-upload.ts` is a stub that returns an empty URL and is used by `_protected.activos.tsx`.
- Product forms use `AssetPicker` directly for `imageId`.
- Profile resolves avatar using `useFile(profile?.avatarId ?? "")`.
- Payment creation manually stores a selected `File`, uploads it after payment creation, and updates `proofImageId` afterward.
- Purchase creation uses `FileUploader` plus `useUploadFile` and manually maps `receiptImageId`.
- Payment method QR upload manually stores a URL derived from `result.id`.
- Business logo upload uses its own `/businesses/:id/logo` path and direct R2 upload logic.

## Goal

Add a generic `useWrapperForm` abstraction that wraps `react-hook-form`, accepts field resolver configuration, and exposes submit helpers that resolve form values into backend-ready payloads.

Target usage:

```tsx
const form = useWrapperForm<ProductFormData>({
  resolver: zodResolver(productSchema),
  defaultValues: {
    name: "",
    imageId: undefined,
  },
  fields: {
    imageId: assetField(),
  },
});

return (
  <WrapperFormProvider form={form}>
    <form onSubmit={form.handleResolvedSubmit(async (payload) => {
      await createProduct(payload);
    })}>
      <FormInput name="name" label="Nombre" />
      <FormMediaField name="imageId" label="Imagen del producto" />
    </form>
  </WrapperFormProvider>
);
```

The key new form method is:

```ts
const payload = await form.resolvePayload();
```

`resolvePayload()` must return a server payload where file/asset fields are IDs, not `File` objects or resolved metadata objects.

## Key Decisions

- The abstraction is generic: `useWrapperForm`, not `useMediaForm`.
- Media support is implemented through field resolvers: `fileField()` and `assetField()`.
- Components should not receive `kind`, `resolve`, or resolved media props when the field is already configured in the wrapper.
- `FormMediaField` should infer the field resolver from form context by `name`.
- Server payload resolution belongs to the wrapper form method (`resolvePayload` / `handleResolvedSubmit`), not feature submit handlers.
- Backend needs a batch resolver endpoint because existing `GET /files/:id` and `GET /assets/:id` cause repeated per-ID queries in lists and previews.
- This plan keeps uploads online-only for the first implementation. Offline-first binary queue integration remains out of scope.

## Scope Boundaries

In scope:

- Generic field resolver contract in the frontend.
- `useWrapperForm` wrapper around `react-hook-form`.
- `resolvePayload()` and `handleResolvedSubmit()` methods.
- File and asset field resolvers that upload `File` values and return IDs.
- Batch backend resolver for file/asset IDs to URL metadata.
- Centralized upload client that uses the same auth/business headers as the API client.
- Generic form media field component that reads resolver config from context.
- Migration of current repeated file/asset form flows.
- Unit/integration tests around resolver behavior and backend tenant boundaries.

Out of scope:

- Replacing the `files` and `assets` database tables with a single table.
- Implementing offline binary upload queue or sync-native file entity handling.
- Redesigning product/gallery UX beyond wiring it to the wrapper.
- Changing persisted backend entity fields; backend still receives IDs such as `imageId`, `avatarId`, `proofImageId`, and `receiptImageId`.

## Verified Evidence

- Product image fields are `asset` references through `products.imageId` and `assets.id`.
- Payment proof and profile avatar fields are `file` references through `abonos.proofImageId` and `userProfiles.avatarId`.
- `FileService.getWithUrls` and `AssetService.getWithUrls` exist, so backend batch resolution can reuse service-layer logic.
- The frontend already uses `react-hook-form` heavily via direct `useForm` and `FormProvider`.
- Current form file handling duplicates upload/validation/preview logic in several routes and components.

## Unknowns

- Whether business logo should remain as direct `logoUrl` storage or migrate to a file/asset ID field in a future schema change.
- Whether payment QR images should persist as URL strings or be converted to `file` IDs in the config model. This plan can centralize upload behavior without forcing schema changes.
- Exact desired directory for generic form wrapper code; the plan recommends `packages/app/app/lib/forms/` and `packages/app/app/components/forms/` but implementation should align with existing local conventions.
