# FormInput Refactor Context

## Overview

This plan addresses a recurring error where `FormInput` crashes with "Cannot destructure property 'register' of 'useFormContext(...)' as it is null." This has occurred 5 times in different parts of the application. The root cause is an architectural inconsistency: `FormInput` requires a `FormProvider` context but is being used without it in several components.

The refactor will:
1. Make `FormInput` defensive with clear error messages
2. Support both patterns: `FormProvider` context AND direct `register` prop
3. Update all affected files to use the correct pattern
4. Document the form component conventions

## Background

### The Problem
`FormInput` at `packages/app/app/components/forms/form-input.tsx:31` uses:
```typescript
const { register, formState: { errors } } = useFormContext();
```

This requires the component to be wrapped in `<FormProvider>`, but several files use `FormInput` without it:
- `tag-form.tsx` - Uses `{...form.register("name")}` without FormProvider
- `quick-tag-modal.tsx` - Uses `{...form.register("name")}` without FormProvider
- `_protected.invitations.tsx` - Uses `{...form.register("name")}` without FormProvider
- `_protected.team.tsx` - Uses `{...form.register("salesPoint")}` without FormProvider
- `_protected.compras.nueva.($draftId)._index.tsx` - Uses `name` prop without FormProvider

### Working Examples
Files that correctly use `FormInput` with `FormProvider`:
- `_protected.clientes.nuevo.tsx`
- `_protected.proveedores.nuevo.tsx`
- `cancel-sale-provider.tsx` + `cancel-sale-dialog.tsx`
- `smart-calculator-form.tsx`

## Goal

Eliminate the `useFormContext is null` error permanently by:
1. Making `FormInput` flexible enough to work with or without `FormProvider`
2. Providing clear error messages when misused
3. Ensuring all form components follow a consistent pattern
4. Documenting the conventions for future developers

## Key Decisions

- **Option A (Chosen)**: Make `FormInput` flexible - accept `register` as optional prop, fallback to context
- **Rationale**: Minimizes refactoring needed, maintains backward compatibility, prevents future crashes
- **Alternative rejected**: Force all usages to use `FormProvider` - requires more refactoring, higher risk

## Scope Boundaries

### In scope
- `packages/app/app/components/forms/form-input.tsx` - Core component refactor
- `packages/app/app/components/forms/form-select.tsx` - Apply same pattern (also uses useFormContext)
- `packages/app/app/components/forms/form-date.tsx` - Review and align
- `packages/app/app/components/tags/tag-form.tsx` - Refactor to use FormProvider
- `packages/app/app/components/tags/quick-tag-modal.tsx` - Refactor to use FormProvider
- `packages/app/app/routes/_protected.invitations.tsx` - Refactor to use FormProvider
- `packages/app/app/routes/_protected.team.tsx` - Refactor to use FormProvider
- `packages/app/app/routes/_protected.compras.nueva.($draftId)._index.tsx` - Add FormProvider
- `packages/app/app/components/forms/AGENTS.md` - Create documentation

### Out of scope
- Backend changes
- Database schema changes
- New form components
- Validation logic changes
- Tests (existing tests should continue to pass)

## Related Files for Reference

These files show the correct pattern and can be used as templates:
- `packages/app/app/routes/_protected.clientes.nuevo.tsx`
- `packages/app/app/routes/_protected.proveedores.nuevo.tsx`
- `packages/app/app/components/puntos-venta/punto-venta-form.tsx`
- `packages/app/app/components/sales/cancel-sale-provider.tsx`
