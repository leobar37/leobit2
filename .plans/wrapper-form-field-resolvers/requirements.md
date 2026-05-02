# Wrapper Form Field Resolvers - Requirements

## Objective

Introduce a generic wrapper around `react-hook-form` that supports configured field resolvers. File and asset fields should be easy to include in forms, and the wrapper should resolve form values into backend-ready payloads where media fields are IDs.

## Scope

- In scope: frontend form wrapper, field resolver contract, file/asset resolver implementations, backend batch media resolution endpoint, migration of current repeated file/asset form logic, and targeted tests.
- Out of scope: offline binary sync queue, database table consolidation, and broad UX redesign.

## Functional Requirements

- `FR-001` - Provide a generic `useWrapperForm` API that accepts normal `useForm` options plus a `fields` resolver map.
- `FR-002` - `useWrapperForm` must expose `resolvePayload()` to transform current form values into a backend payload.
- `FR-003` - `resolvePayload()` must resolve configured `file` and `asset` fields to IDs before submission.
- `FR-004` - If a configured media field contains an existing string ID, `resolvePayload()` must keep the ID unchanged.
- `FR-005` - If a configured media field contains a resolved object with an `id`, `resolvePayload()` must use that `id`.
- `FR-006` - If a configured media field contains a `File`, `resolvePayload()` must upload it through the appropriate field resolver and replace it with the returned ID.
- `FR-007` - `useWrapperForm` must expose `handleResolvedSubmit(callback)` as a convenience wrapper around `handleSubmit` that passes the resolved payload to `callback`.
- `FR-008` - `useWrapperForm` must expose `getFieldResolver(name)` or an equivalent context lookup so form fields can infer their resolver by field name.
- `FR-009` - Provide reusable `fileField()` and `assetField()` resolver factories.
- `FR-010` - Provide a generic media field component that only needs `name` plus UI labels and reads `file` vs `asset` behavior from wrapper context.
- `FR-011` - Provide a batch backend endpoint to resolve file and asset IDs into metadata and URLs.
- `FR-012` - Provide frontend resolver client/hooks that call the batch resolver and cache results through TanStack Query.
- `FR-013` - Centralize multipart upload logic so file/asset uploads use consistent API base URL, authorization, and business headers.
- `FR-014` - Migrate existing product image, profile avatar, payment proof, purchase receipt, asset gallery, QR upload, and active asset upload flows away from feature-specific upload/resolve logic where feasible.
- `FR-015` - Preserve backend payload contracts: forms submit IDs for media fields, not `File` objects and not resolved metadata objects.

## Non-Functional Requirements

- `NFR-001` - Field resolver logic must be testable as pure units where possible.
- `NFR-002` - Backend file and asset resolution must enforce tenant boundaries with `ctx.businessId`.
- `NFR-003` - The wrapper must remain generic and not hardcode media-specific behavior into the base form API.
- `NFR-004` - Existing forms that do not configure field resolvers must continue to behave like normal `react-hook-form` forms.
- `NFR-005` - Migration should be incremental; legacy hooks/components may remain temporarily if wrapped by the new core.
- `NFR-006` - Error handling must prevent submitting partially resolved payloads when a required upload fails.

## Acceptance Criteria

- `useWrapperForm` can replace direct `useForm` in at least product and payment forms without adding media-specific submit logic.
- `form.resolvePayload()` returns backend-ready values with IDs for configured fields.
- `form.handleResolvedSubmit(fn)` calls `fn` with the resolved payload, not raw form state.
- `FormMediaField name="imageId"` can infer that `imageId` is an asset field from wrapper context.
- Backend exposes a batch resolver for file and asset IDs.
- Product lists/details can avoid per-row `useAsset(imageId)` calls by using batch resolution.
- Existing upload behavior still works for product image, avatar, payment proof, and purchase receipt.
- Tests cover string ID, object-with-id, `File`, `null`, and failed upload cases for `resolvePayload()`.
- Backend tests cover cross-business file/asset resolution denial.

## Constraints

- Backend services and repositories must keep `ctx` as the first parameter.
- Backend queries touching business-owned data must filter by `ctx.businessId`.
- Frontend must keep user-facing text in Spanish.
- The wrapper should compose with existing `FormProvider`/form components and not force a global rewrite of all forms.

## Open Questions

- Should `business.logoUrl` be left as a URL-only special case in this phase or migrated later to a `file`/`asset` ID field?
- Should payment method QR config continue storing URL strings, or should a later data migration store `fileId`/`assetId`?
- Should `FormMediaField` support gallery selection for `assetField()` in the first implementation, or should that be a separate `FormAssetField` wrapper using the same resolver context?
