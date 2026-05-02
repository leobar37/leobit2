# T-001 - Create Generic Field Resolver Core

## Objective

Create the frontend foundation for field resolvers: a generic contract, file/asset resolver factories, centralized multipart upload helpers, and frontend media resolve helpers. This task must not create the form wrapper yet; it only creates the reusable primitives that `useWrapperForm` will consume.

## Requirements Covered

- `FR-003`
- `FR-004`
- `FR-005`
- `FR-006`
- `FR-009`
- `FR-012`
- `FR-013`
- `NFR-001`
- `NFR-006`

## Dependencies

None.

## Files or Areas Involved

- `packages/app/app/lib/forms/field-resolvers.ts` - Create - generic resolver contracts and helpers
- `packages/app/app/lib/forms/media-field-resolvers.ts` - Create - `fileField()` and `assetField()` implementations
- `packages/app/app/lib/media/media-client.ts` - Create - shared upload/resolve client functions
- `packages/app/app/lib/media/media-types.ts` - Create - shared `ResolvedMedia`, `MediaKind`, request/response types
- `packages/app/app/hooks/use-files.ts` - Later integration target; do not delete in this task
- `packages/app/app/hooks/use-assets.ts` - Later integration target; do not delete in this task
- `packages/app/app/lib/api-client.ts` - Reuse existing `uploadFile` behavior or extract common auth/header logic if needed

## Target API Shape

```ts
type FieldResolver<TValue = unknown, TServerValue = unknown> = {
  kind: string;
  toServer(value: TValue, context: FieldResolverContext): Promise<TServerValue>;
};

type WrapperFieldMap<TValues> = Partial<Record<keyof TValues, FieldResolver>>;

const fields = {
  imageId: assetField(),
  proofImageId: fileField(),
};
```

Media resolver behavior:

```ts
fileField().toServer("existing-id") // "existing-id"
fileField().toServer({ id: "existing-id", url: "..." }) // "existing-id"
fileField().toServer(file) // uploads to /files/upload, returns uploaded.id
assetField().toServer(file) // uploads to /assets/upload, returns uploaded.id
fileField().toServer(null) // null
fileField().toServer(undefined) // undefined
```

## Actions

1. Define a generic `FieldResolver` contract that is not media-specific.
2. Define a `FieldResolverContext` for shared dependencies such as upload functions, abort signal, and optional metadata.
3. Implement `fileField()` using the centralized media upload client with `kind: "file"`.
4. Implement `assetField()` using the centralized media upload client with `kind: "asset"`.
5. Implement shared value normalization for `string`, `File`, object-with-`id`, `null`, and `undefined`.
6. Create a media upload client that routes to `/files/upload` or `/assets/upload` and uses consistent auth/business headers.
7. Create frontend helpers/types for calling the future backend batch resolver (`POST /media/resolve`), but allow the actual endpoint to land in T-002.
8. Keep validation/profile-specific options extensible but avoid hardcoding domain names like `avatar` into the generic form wrapper.

## Completion Criteria

- `fileField()` and `assetField()` exist and implement the generic resolver contract.
- Media upload logic is centralized and not duplicated inside feature routes.
- The primitives are usable without React, making unit tests straightforward.
- No existing feature route is migrated yet.

## Validation

- Add or plan unit tests in T-007 for resolver behavior.
- Run `bun run typecheck` in `packages/app` after implementation.

## Risks or Notes

- `uploadFileNow` currently uses `fetch("/files/upload")`; the new client should avoid repeating that pattern and use consistent API base URL/auth/business headers.
- Do not make the base `FieldResolver` media-specific; only `fileField()` and `assetField()` should know about file/asset upload semantics.
