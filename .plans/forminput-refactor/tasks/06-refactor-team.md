# T-006 Refactor Team Page

## Objective

Refactor `_protected.team.tsx` drawer form to wrap with `FormProvider` instead of spreading `register` props.

## Requirements Covered

- `FR-009` - team.tsx drawer form uses FormProvider
- `NFR-003` - Follow existing codebase patterns

## Dependencies

- T-001

## Files or Areas Involved

- `packages/app/app/routes/_protected.team.tsx` - Modify

## Actions

1. Import `FormProvider` from `react-hook-form`
2. Locate the edit member drawer form (around line 259)
3. Wrap the `<form>` element with `<FormProvider {...form}>`
4. Change `FormInput` usage from `{...form.register("salesPoint")}` to `name="salesPoint"`
5. Remove error prop

## Current Code Pattern

```tsx
<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
  {/* Role selector (native select) */}
  <FormInput
    label="Punto de venta"
    error={form.formState.errors.salesPoint?.message}
    {...form.register("salesPoint")}
  />
```

## Target Code Pattern

```tsx
<FormProvider {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    {/* Role selector (native select) */}
    <FormInput
      name="salesPoint"
      label="Punto de venta"
    />
```

## Completion Criteria

- [ ] `FormProvider` wraps the drawer form
- [ ] `FormInput` uses `name` prop
- [ ] Form validation still works
- [ ] Role selector continues to work (it's a native select, not FormInput)

## Validation

- Manual test: open team page, click edit on a member, change punto de venta
- Verify form submits correctly

## Risks or Notes

- This form has a mix: native select for role, FormInput for salesPoint
- The role select uses `form.watch("role")` and `form.setValue` - these should still work
