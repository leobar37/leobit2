# FormInput Refactor Requirements

## Objective

Eliminate the recurring `useFormContext is null` error by making `FormInput` flexible to work with or without `FormProvider`, updating all affected components, and establishing clear form component conventions.

## Scope

- **In scope:**
  - Core form component refactoring (`FormInput`, `FormSelect`, `FormDate`)
  - Refactoring 5+ affected route/component files to use `FormProvider`
  - Creating documentation for form component patterns
  - Adding defensive error messages

- **Out of scope:**
  - Backend API changes
  - Database schema modifications
  - New feature development
  - Comprehensive test suite creation

## Functional Requirements

- `FR-001` - `FormInput` must work within `FormProvider` context (current behavior)
- `FR-002` - `FormInput` must accept an optional `register` prop to work without `FormProvider`
- `FR-003` - `FormInput` must throw a descriptive error when neither context nor register prop is available
- `FR-004` - `FormSelect` must follow the same pattern as `FormInput` for consistency
- `FR-005` - All form components must have clear TypeScript types for their props
- `FR-006` - `tag-form.tsx` must wrap its form with `FormProvider`
- `FR-007` - `quick-tag-modal.tsx` must wrap its form with `FormProvider`
- `FR-008` - `_protected.invitations.tsx` must wrap its drawer form with `FormProvider`
- `FR-009` - `_protected.team.tsx` must wrap its drawer form with `FormProvider`
- `FR-010` - `_protected.compras.nueva.($draftId)._index.tsx` must wrap its form with `FormProvider`

## Non-Functional Requirements

- `NFR-001` - Maintain backward compatibility: existing `FormProvider` usages must continue to work
- `NFR-002` - Error messages must be developer-friendly and actionable
- `NFR-003` - Refactored components must follow the existing codebase patterns (imports, naming, structure)
- `NFR-004` - No visual or behavioral changes for end users
- `NFR-005` - Documentation must include examples of both valid patterns

## Acceptance Criteria

- [ ] `FormInput` renders successfully with `FormProvider` context
- [ ] `FormInput` renders successfully with `register` prop passed directly
- [ ] `FormInput` throws clear error when used outside `FormProvider` without `register` prop
- [ ] All 5 affected files are refactored and no longer cause crashes
- [ ] No existing functionality is broken
- [ ] Documentation exists explaining when to use each pattern

## Constraints

- Must use react-hook-form v7+ patterns
- Must maintain compatibility with existing Zod validation schemas
- Must follow the project's component naming conventions (kebab-case files, PascalCase components)
- FormProvider import must come from `react-hook-form`

## Open Questions

- Should we deprecate the `register` prop pattern in favor of always using `FormProvider`?
- Should we create a lint rule to prevent future misuse?
