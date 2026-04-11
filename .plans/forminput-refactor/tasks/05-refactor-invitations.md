# T-005 Refactor Invitations Page

## Objective

Refactor `_protected.invitations.tsx` drawer form to wrap with `FormProvider` instead of spreading `register` props.

## Requirements Covered

- `FR-008` - invitations.tsx drawer form uses FormProvider
- `NFR-003` - Follow existing codebase patterns

## Dependencies

- T-001

## Files or Areas Involved

- `packages/app/app/routes/_protected.invitations.tsx` - Modify

## Actions

1. Import `FormProvider` from `react-hook-form`
2. Locate the drawer form (around line 220)
3. Wrap the `<form>` element with `<FormProvider {...form}>`
4. Change all three `FormInput` usages from `{...form.register("xxx")}` to `name="xxx"`
5. Remove error props (FormInput gets errors from context)

## Current Code Pattern

```tsx
<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
  <FormInput
    label="Nombre del vendedor"
    error={form.formState.errors.name?.message}
    {...form.register("name")}
  />
  <FormInput
    label="Email"
    error={form.formState.errors.email?.message}
    {...form.register("email")}
  />
  <FormInput
    label="Punto de venta (opcional)"
    error={form.formState.errors.salesPoint?.message}
    {...form.register("salesPoint")}
  />
```

## Target Code Pattern

```tsx
<FormProvider {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    <FormInput
      name="name"
      label="Nombre del vendedor"
    />
    <FormInput
      name="email"
      label="Email"
      type="email"
    />
    <FormInput
      name="salesPoint"
      label="Punto de venta (opcional)"
    />
```

## Completion Criteria

- [ ] `FormProvider` wraps the drawer form
- [ ] All three `FormInput` components use `name` prop
- [ ] Form validation still works
- [ ] Drawer opens and closes correctly

## Validation

- Manual test: open invitations page, click "Invitar", fill form
- Verify validation works for required fields
- Submit invitation successfully

## Risks or Notes

- The form is inside a Drawer component
- There's also a root error display that should still work
