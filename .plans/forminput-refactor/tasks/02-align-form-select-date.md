# T-002 Align FormSelect and FormDate

## Objective

Apply the same defensive pattern from T-001 to `FormSelect` and `FormDate` for consistency across all form components.

## Requirements Covered

- `FR-004` - FormSelect follows same pattern as FormInput
- `FR-005` - Clear TypeScript types for props
- `NFR-001` - Maintain backward compatibility

## Dependencies

- T-001 (pattern established)

## Files or Areas Involved

- `packages/app/app/components/forms/form-select.tsx` - Modify - Add register prop support
- `packages/app/app/components/forms/form-date.tsx` - Review/Modify - Check consistency

## Actions

1. Read current `FormSelect` implementation
2. Add optional `control` prop (FormDate already has this, verify FormSelect)
3. Ensure `FormSelect` handles missing context gracefully
4. Review `FormDate` - it already accepts `control` prop, verify it matches the pattern
5. Align error handling across all three components
6. Ensure consistent prop naming (register vs control where appropriate)

## Completion Criteria

- [ ] `FormSelect` accepts optional `control` prop
- [ ] `FormSelect` works with FormProvider context
- [ ] `FormSelect` works with `control` prop passed directly
- [ ] `FormDate` follows consistent pattern (already has control prop)
- [ ] All three components have consistent error handling

## Validation

- TypeScript compilation passes
- Existing usages continue to work

## Risks or Notes

- `FormSelect` uses `Controller` component which needs `control`, not `register` directly
- `FormDate` already has the control prop pattern - verify it's consistent
- Keep the API intuitive: register for simple inputs, control for complex ones
