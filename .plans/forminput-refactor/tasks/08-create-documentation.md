# T-008 Create Forms Documentation

## Objective

Create `AGENTS.md` documentation for the forms components explaining the patterns, conventions, and when to use each approach.

## Requirements Covered

- `NFR-005` - Documentation with examples of both valid patterns

## Dependencies

- T-001 (pattern established)
- T-002 (all components aligned)

## Files or Areas Involved

- `packages/app/app/components/forms/AGENTS.md` - Create

## Actions

1. Create documentation file at `packages/app/app/components/forms/AGENTS.md`
2. Document the two valid patterns:
   - Pattern A: FormProvider + name prop (recommended)
   - Pattern B: register prop directly (for edge cases)
3. Include code examples for each pattern
4. Document common pitfalls (the useFormContext error)
5. Document each form component (FormInput, FormSelect, FormDate)
6. Include troubleshooting section

## Documentation Structure

```markdown
# Forms Components

## Overview
Form components wrap react-hook-form with app-specific styling and behavior.

## Patterns

### Pattern A: FormProvider (Recommended)
Use when you have multiple form fields.

\`\`\`tsx
import { useForm, FormProvider } from "react-hook-form";
import { FormInput } from "~/components/forms/form-input";

function MyForm() {
  const form = useForm();
  return (
    <FormProvider {...form}>
      <form>
        <FormInput name="fieldName" label="Field Label" />
      </form>
    </FormProvider>
  );
}
\`\`\`

### Pattern B: Register Prop
Use for simple standalone inputs.

\`\`\`tsx
<FormInput {...form.register("fieldName")} label="Field Label" />
\`\`\`

## Components
...

## Troubleshooting
...
```

## Completion Criteria

- [ ] AGENTS.md file created
- [ ] Pattern A documented with example
- [ ] Pattern B documented with example
- [ ] Common error (useFormContext null) explained
- [ ] Each component has basic usage docs

## Validation

- Review documentation for clarity
- Verify examples compile mentally

## Risks or Notes

- Keep examples minimal but complete
- Reference existing working files as examples
- Don't duplicate react-hook-form docs, just the app-specific patterns
