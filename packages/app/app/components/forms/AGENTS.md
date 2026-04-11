# Forms Components

Form components wrap react-hook-form with app-specific styling and behavior.

## Overview

This directory contains form field components that integrate with react-hook-form. They provide consistent styling, error handling, and accessibility features across the application.

## Available Components

- `FormInput` - Text input field
- `FormSelect` - Select dropdown with drawer UI
- `FormDate` - Date picker input
- `FormNumberInput` - Numeric input with formatting
- `FormPassword` - Password input with visibility toggle
- `FormCalculatorInput` - Input for calculator forms
- `FormAssetPicker` - Image/file picker input
- `FormFieldShell` - Wrapper for consistent field layout

## Usage Patterns

### Pattern A: FormProvider (Recommended)

Use this pattern when you have multiple form fields. It keeps the code clean and is the preferred approach for most forms.

```tsx
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormInput } from "~/components/forms/form-input";
import { FormDate } from "~/components/forms/form-date";

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email inválido"),
  date: z.string(),
});

type FormData = z.infer<typeof schema>;

function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const onSubmit = form.handleSubmit((data) => {
    console.log(data);
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit}>
        <FormInput
          name="name"
          label="Nombre"
          required
        />
        <FormInput
          name="email"
          label="Email"
          type="email"
        />
        <FormDate
          name="date"
          label="Fecha"
          required
        />
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
}
```

**Key points:**
- Import `FormProvider` from `react-hook-form`
- Wrap your `<form>` with `<FormProvider {...form}>`
- Use `name` prop on form components (matches your schema field names)
- Error messages are automatically displayed from form state

### Pattern B: Register Prop (Edge Cases)

Use this pattern for simple standalone inputs or when you cannot use FormProvider.

```tsx
import { useForm } from "react-hook-form";
import { FormInput } from "~/components/forms/form-input";

function SimpleForm() {
  const form = useForm();

  return (
    <form>
      <FormInput
        {...form.register("name")}
        label="Nombre"
      />
    </form>
  );
}
```

**Key points:**
- Spread the result of `form.register("fieldName")` directly
- The `name` prop is included in the spread
- Use sparingly - Pattern A is preferred for consistency

## Component API

### FormInput

```tsx
interface FormInputProps {
  name: string;                    // Field name (required)
  label?: string;                  // Label text
  description?: string;            // Helper description
  error?: string;                  // Override error message
  helperText?: string;             // Additional helper text
  reserveMessageSpace?: boolean;   // Reserve space for errors (default: true)
  register?: UseFormRegisterReturn; // Alternative to FormProvider
  // ...all standard input props
}
```

### FormSelect

```tsx
interface FormSelectProps {
  name: string;                    // Field name (required)
  label?: string;
  description?: string;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
  error?: string;
  helperText?: string;
  control?: Control;               // Alternative to FormProvider
  // ...
}
```

### FormDate

```tsx
interface FormDateProps {
  name: string;                    // Field name (required)
  label?: string;
  required?: boolean;
  minDate?: string;                // YYYY-MM-DD format
  maxDate?: string;                // YYYY-MM-DD format
  control?: Control;               // Alternative to FormProvider
  // ...
}
```

## Troubleshooting

### Error: "FormInput must be used within a FormProvider"

This error occurs when you use FormInput without either:
1. Wrapping with FormProvider, OR
2. Passing the register prop

**Solution:**

```tsx
// Option 1: Add FormProvider
<FormProvider {...form}>
  <form>
    <FormInput name="field" />
  </form>
</FormProvider>

// Option 2: Use register prop
<form>
  <FormInput {...form.register("field")} />
</form>
```

### Error: "Cannot destructure property 'register' of 'useFormContext(...)' as it is null"

This was a common error before the components were made defensive. If you see this, ensure you're using one of the patterns above.

## Best Practices

1. **Always use FormProvider for multi-field forms** - It's cleaner and more maintainable
2. **Use Zod for validation** - The app uses Zod schemas with zodResolver
3. **Set `mode: "onChange"`** - For real-time validation feedback
4. **Use the `required` prop** - It adds visual indicators and accessibility attributes
5. **Let components handle errors** - Don't manually pass error messages unless overriding

## Examples in Codebase

See these files for working examples:

- `app/routes/_protected.clientes.nuevo.tsx` - Simple FormProvider usage
- `app/routes/_protected.proveedores.nuevo.tsx` - FormProvider with multiple fields
- `app/components/puntos-venta/punto-venta-form.tsx` - Form in a modal
- `app/components/sales/cancel-sale-provider.tsx` - Complex form with context

## Migration Guide

If you have old code using the spread register pattern:

**Before:**
```tsx
<form>
  <FormInput
    {...form.register("name")}
    label="Nombre"
    error={form.formState.errors.name?.message}
  />
</form>
```

**After:**
```tsx
<FormProvider {...form}>
  <form>
    <FormInput
      name="name"
      label="Nombre"
    />
  </form>
</FormProvider>
```
