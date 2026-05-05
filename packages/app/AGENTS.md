# AGENTS.md - @avileo/app (Frontend)

> Consolidated frontend guidance for the React Router v7 SPA.
> This file includes the conventions previously split across: components, forms, sales lib, and e2e docs.

## Overview

Frontend for Avileo (offline-aware vendor workflow): customers, sales, inventory, expenses, distribution, and reporting, optimized for mobile-first usage.

## Stack

- React 19 + React Router v7
- TypeScript 5.9+
- Tailwind CSS 3 + shadcn-style primitives
- Jotai + TanStack Query
- react-hook-form + Zod
- Better Auth (`better-auth`)
- Eden Treaty (`@elysiajs/eden`) API client
- lucide-react + Radix UI

## Critical frontend conventions

1. **Always follow flat route conventions** (`app/routes`).
2. **Keep mobile-first layouts** first; use the app shell + slot system for header/footer actions.
3. **Route-level writes through mutations** (`useMutation` wrappers), not local `useState` ad-hoc loading states.
4. **User text in Spanish (`es-PE`)**, code/comments in English.
5. **Use `~/` for shared app imports and `@/` for component-to-component imports.**

## Directory map

```text
app/
├── components/
│   ├── ui/                      # shadcn-style primitives
│   ├── forms/                   # form-specific abstractions
│   ├── customers/, products/, sales/, payments/
│   ├── inventory/, distribucion/, calculator/
│   ├── layout/, mobile/, cards/, theme/
│   └── ...                      # domain folders
├── hooks/                       # data hooks and UI helpers
├── lib/                         # shared utilities
│   ├── query/                   # API/query helpers
│   ├── utils/
│   ├── validators/
│   ├── schemas/
│   ├── calculator/
│   ├── forms/
│   ├── mappers/
│   ├── media/
│   └── navigation/
├── routes/                      # file-based routes
├── stores/                      # state (Jotai/atoms)
└── styles/
```

## Layout and shell patterns

Protected routes render through `app/routes/_protected.tsx`, which uses:

- `MobileSlotProvider`
- `AppLayout`

Prefer this composition over page-local fixed sidebars/headers.

```tsx
// Route-level pattern (conceptual)
export default function ProtectedRouteShell() {
  return (
    <MobileSlotProvider>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </MobileSlotProvider>
  );
}
```

### Slot vocabulary

- `header:left`
- `header:center`
- `header:right`
- `footer`
- `floating`

Use route-level slots for action bars/FAB placement before introducing page-level sticky/fixed wrappers.

## Imports and naming

- Files: `kebab-case.ts` / `kebab-case.tsx`
- Components: `PascalCase`
- Hooks: `use` + `camelCase` (`useCustomers`)
- Props: `<Name>Props`
- Zod schemas: `<name>Schema`

```ts
import { useCustomers } from "~/hooks/use-customers";
import { Button } from "@/components/ui/button";
```

## Query and mutation conventions

- Keep all API access in hooks/services in `app/hooks`.
- Query hooks return TanStack Query results with consistent keys.
- Mutation hooks must expose `isPending` and `mutateAsync` and be the source of button disabled/loading state.

```ts
export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await api.customers.get();
      if (error) throw new Error(String(error.value));
      return data as unknown as Customer[];
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCustomerInput) => {
      const { data, error } = await api.customers.post(input);
      if (error) throw new Error(String(error.value));
      return data as unknown as Customer;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
}
```

## Forms (react-hook-form + Zod)

Preferred pattern: `FormProvider` for multi-field forms.

```tsx
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  mode: "onChange",
});

<FormProvider {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormInput name="name" label="Nombre" />
    <FormInput name="phone" label="Teléfono" />
  </form>
</FormProvider>
```

`FormInput`/`FormSelect` also support direct `register` use for isolated/simple inputs.

## Component conventions

- Prefer existing shadcn-style primitives from `components/ui`.
- Use `cn()` for class composition.
- Set `displayName` on `forwardRef` components.
- Compound/card pattern for domain cards:
  - icon container (`w-12 h-12`, `rounded-*`, `bg-orange-100`)
  - content area with title/value/details
  - optional action icon area
- Prefer `Dialog` for compact interactions and `Sheet` for larger flows.

## Mobile list screens

For operational lists (ventas/clientes/pagos/distribución, etc):

- `summary -> search -> list -> FAB` structure
- fixed FAB on primary create actions
- compact cards (`p-4`, controlled shadows, subtle borders)
- avoid heavy backgrounds such as hardcoded `bg-gray-50` defaults

## Sales domain notes (`app/lib/sales/*`)

- Event namespaces: `cart:*`, `payment:*`, `sale:*`, `ocr:*`
- Persisted `unitPrice` should be derived from `subtotal / quantity`.
- Use shared number parsing helpers (avoid raw `parseFloat` for user strings).
- Payment modes:
  - `pago_total` (contado)
  - `a_cuenta` (abono, requires customer, must be `> 0` and `<= total`)
  - `debe_todo` (crédito)
- `balanceDue` applies only to credit modes.

## E2E testing rules (Playwright)

- Keep selectors in page objects (`page-objects/*.ts`).
- Prefer `data-testid` selectors.
- Mobile viewport baseline: `390x844` (iPhone 14 style).
- Commands: `bun run test:e2e`, `bun run test:e2e:headed`, `bun run test:e2e:ui`, `bun run test:e2e:debug`.

## Error and UX patterns

- Show explicit empty/loading/error states in list screens.
- Avoid `alert()` / `confirm()`, use UI components (`Dialog`, etc.).
- Avoid inline styles; rely on Tailwind classes.

## Online-only feature pattern

For actions that require connectivity (e.g., WhatsApp/remote services), show a clear in-app message and disable the action if offline.

## Route naming conventions (examples)

- `/` → `_index.tsx`
- `/login` → `login.tsx`
- `/register` → `register.tsx`
- `/dashboard` → `_protected.dashboard.tsx`
- `/clientes` → `_protected.clientes.tsx`
- `/ventas` → `_protected.ventas.tsx`

## API client basics

```ts
import { api } from "~/lib/api-client";

const { data, error } = await api.customers.get();
if (error) throw new Error(String(error.value));
```

All API calls should keep explicit error checks before using `data`.

## Testing notes

```bash
cd packages/app
bun run test           # Vitest
bun run test:e2e       # Playwright end-to-end
```

## Key files

- `app/routes/_protected.tsx` layout shell
- `app/components/layout/`
- `app/components/mobile/`
- `app/hooks/`
- `app/lib/query/`
- `app/lib/schemas/`
- `app/lib/sales/`
- `app/lib/api-client.ts`
- `app/lib/utils.ts` (and `app/lib/utils/*`)

## DO's ✅

- Use `cn()` for all class merging.
- Keep UI primitives in `components/ui` and reuse before creating new components.
- Use existing modal/sheet patterns for confirmations and data entry.
- Keep API state transitions in dedicated hooks/services.

## DON'Ts ❌

- No duplicated local state for mutation pending/loading when `useMutation` exists.
- No English-facing UI copy.
- No comments in Spanish.
- No page-local fixed shell workarounds when MobileSlot/AppLayout already provide it.

---

*This AGENTS.md now consolidates previously separated frontend package docs.*