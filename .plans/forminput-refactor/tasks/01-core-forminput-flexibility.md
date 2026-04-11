# T-001 Core FormInput Flexibility

## Objective

Make `FormInput` defensive and flexible by supporting both `FormProvider` context and direct `register` prop, with clear error messages when misused.

## Requirements Covered

- `FR-001` - Work with FormProvider context
- `FR-002` - Accept optional register prop
- `FR-003` - Throw descriptive error when neither available
- `NFR-001` - Maintain backward compatibility
- `NFR-002` - Developer-friendly error messages

## Dependencies

- None (foundation task)

## Files or Areas Involved

- `packages/app/app/components/forms/form-input.tsx` - Modify - Core component changes

## Actions

1. Add optional `register` prop to `FormInputProps` interface
2. Modify component to accept `register` as optional prop
3. Implement logic: use `register` prop if provided, else use `useFormContext().register`
4. Add guard clause: throw descriptive error if neither register prop nor context is available
5. Handle `formState.errors` similarly - from prop or context
6. Test that existing usages still work (with FormProvider)

## Completion Criteria

- [ ] `FormInput` accepts optional `register` prop with correct TypeScript type
- [ ] `FormInput` works with `FormProvider` context (existing behavior preserved)
- [ ] `FormInput` works with `register` prop passed directly
- [ ] Clear error message when used outside FormProvider without register prop
- [ ] TypeScript compiles without errors
- [ ] No changes needed to existing working files

## Validation

- Check TypeScript compilation: `cd packages/app && tsc --noEmit`
- Verify existing working pages still function (clientes nuevo, proveedores nuevo)
- Manual test: use FormInput without FormProvider and verify error message

## Risks or Notes

- The `register` prop type should be `UseFormRegisterReturn` from react-hook-form
- Error message should guide developers to wrap with FormProvider or pass register prop
- Be careful not to break the ref forwarding behavior
- The `name` prop may be redundant when `register` is passed (register already contains name)
