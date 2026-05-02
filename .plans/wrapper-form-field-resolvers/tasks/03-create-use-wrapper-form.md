# T-003 - Create useWrapperForm

## Objective

Create a generic `useWrapperForm` wrapper around `react-hook-form` that accepts field resolvers, exposes resolver lookup, and provides methods for resolving form values into backend-ready payloads.

## Requirements Covered

- `FR-001`
- `FR-002`
- `FR-003`
- `FR-004`
- `FR-005`
- `FR-006`
- `FR-007`
- `FR-008`
- `FR-015`
- `NFR-001`
- `NFR-003`
- `NFR-004`
- `NFR-006`

## Dependencies

T-001.

## Files or Areas Involved

- `packages/app/app/hooks/use-wrapper-form.ts` - Create - hook implementation
- `packages/app/app/components/forms/wrapper-form-provider.tsx` - Create or colocate - provider/context for resolver lookup
- `packages/app/app/lib/forms/field-resolvers.ts` - Modify - add helper types as needed
- `packages/app/app/components/forms/index.ts` - Modify - export wrapper provider if consistent with existing pattern

## Target API Shape

```ts
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

const payload = await form.resolvePayload();

const submit = form.handleResolvedSubmit(async (payload) => {
  await createProduct(payload);
});
```

Expected returned methods:

```ts
type WrappedForm<TValues> = UseFormReturn<TValues> & {
  fields: WrapperFieldMap<TValues>;
  resolvePayload: (values?: TValues) => Promise<TValues>;
  resolveField: <K extends keyof TValues>(name: K, value?: TValues[K]) => Promise<TValues[K]>;
  getFieldResolver: <K extends keyof TValues>(name: K) => FieldResolver | undefined;
  handleResolvedSubmit: (
    callback: (payload: TValues) => void | Promise<void>
  ) => ReturnType<UseFormReturn<TValues>["handleSubmit"]>;
};
```

## Actions

1. Wrap `useForm` and pass through all standard `react-hook-form` options.
2. Store the provided `fields` resolver map on the returned form object.
3. Implement `getFieldResolver(name)`.
4. Implement `resolveField(name, value?)` using the configured resolver; return the original value if the field has no resolver.
5. Implement `resolvePayload(values?)`:
   - Use provided values or `form.getValues()`.
   - Shallow clone payload.
   - For each configured field, call its `toServer` resolver.
   - Throw if any resolver fails so the caller does not submit a partial payload.
6. Implement `handleResolvedSubmit(callback)` by composing `form.handleSubmit` with `resolvePayload`.
7. Create `WrapperFormProvider` to expose the wrapped form object while preserving compatibility with `FormProvider`.
8. Ensure non-wrapper forms can continue using existing `FormProvider` unchanged.

## Completion Criteria

- `useWrapperForm` behaves like `useForm` for ordinary fields.
- `resolvePayload()` converts configured fields to server values.
- `handleResolvedSubmit()` passes only resolved payloads to callbacks.
- Field components can look up a resolver by `name` through context.
- Existing forms are not forced to migrate immediately.

## Validation

- Add unit tests in T-007 for `resolvePayload` and `handleResolvedSubmit`.
- `cd packages/app && bun run typecheck`.

## Risks or Notes

- Keep the payload clone shallow unless nested field resolver support is explicitly added later.
- Do not make `useWrapperForm` import media-specific resolver factories; it should only depend on the generic resolver contract.
