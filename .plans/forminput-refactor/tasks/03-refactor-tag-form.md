# T-003 Refactor Tag Form

## Objective

Refactor `tag-form.tsx` to wrap its form with `FormProvider` instead of spreading `register` props.

## Requirements Covered

- `FR-006` - tag-form.tsx uses FormProvider
- `NFR-003` - Follow existing codebase patterns

## Dependencies

- T-001 (FormInput now flexible, but we want consistency)

## Files or Areas Involved

- `packages/app/app/components/tags/tag-form.tsx` - Modify

## Actions

1. Import `FormProvider` from `react-hook-form`
2. Wrap the `<form>` element with `<FormProvider {...form}>`
3. Change `FormInput` usage from `{...form.register("name")}` to `name="name"`
4. Remove the spread pattern, use the context-based pattern instead
5. Verify the error prop still works correctly

## Current Code Pattern

```tsx
<form onSubmit={onSubmit} className="space-y-4">
  <FormInput
    {...form.register("name", { required: "El nombre es requerido" })}
    label="Nombre"
    error={form.formState.errors.name?.message}
  />
```

## Target Code Pattern

```tsx
<FormProvider {...form}>
  <form onSubmit={onSubmit} className="space-y-4">
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
- [ ] No runtime errors

## Validation

- Manual test: open tag form, try to submit empty name, verify error shows
- Create and edit a tag to verify full flow works

## Risks or Notes

- The form has both create and edit modes - test both
- The color picker section doesn't need changes (it's custom buttons)
