# T-004 Refactor Quick Tag Modal

## Objective

Refactor `quick-tag-modal.tsx` to wrap its form with `FormProvider` instead of spreading `register` props.

## Requirements Covered

- `FR-007` - quick-tag-modal.tsx uses FormProvider
- `NFR-003` - Follow existing codebase patterns

## Dependencies

- T-001

## Files or Areas Involved

- `packages/app/app/components/tags/quick-tag-modal.tsx` - Modify

## Actions

1. Import `FormProvider` from `react-hook-form`
2. Wrap the `<form>` element with `<FormProvider {...form}>`
3. Change `FormInput` usage from `{...form.register("name")}` to `name="name"`
4. Remove the spread pattern

## Current Code Pattern

```tsx
<form onSubmit={onSubmit} className="px-4 py-4 space-y-4">
  <FormInput
    {...form.register("name", { required: "El nombre es requerido" })}
    label="Nombre"
    error={form.formState.errors.name?.message}
  />
```

## Target Code Pattern

```tsx
<FormProvider {...form}>
  <form onSubmit={onSubmit} className="px-4 py-4 space-y-4">
    <FormInput
      name="name"
      label="Nombre"
      required
    />
```

## Completion Criteria

- [ ] `FormProvider` wraps the form
- [ ] `FormInput` uses `name` prop instead of spread `register`
- [ ] Form validation still works
- [ ] Error messages still display
- [ ] Modal opens and closes correctly

## Validation

- Manual test: open quick tag modal, create a tag
- Verify validation errors display for empty name

## Risks or Notes

- This is a modal component using the `createModal` helper
- Ensure the form still submits correctly within the modal context
