# AGENTS.md - @avileo/app (Frontend)

> **Context file for AI agents working on the Avileo React Router v7 frontend**

## Overview

This is the **React Router v7 frontend** for Avileo (PollosPro) - an offline-first chicken sales management system. It provides a mobile-first web application for vendors to manage customers, sales, inventory distribution, and payments with offline capabilities.

## Project Type & Stack

| Aspect | Technology |
|--------|------------|
| **Type** | React 19 SPA (Single Page Application) |
| **Framework** | React Router v7 with file-based routing |
| **Language** | TypeScript 5.9+ |
| **Styling** | Tailwind CSS 3 + shadcn/ui patterns |
| **Build Tool** | Vite 7 |
| **State Management** | Jotai (atoms) + TanStack Query (server state) |
| **Forms** | react-hook-form + Zod validation |
| **Auth** | Better Auth (JWT-based) |
| **API Client** | Eden Treaty (@elysiajs/eden) |
| **Icons** | lucide-react |

### Key Dependencies

```typescript
// Core
react, react-router, react-dom

// State & Data
@tanstack/react-query, jotai

// Forms & Validation
react-hook-form, @hookform/resolvers, zod

// UI Primitives
@radix-ui/react-dialog, @radix-ui/react-label, @radix-ui/react-slot
class-variance-authority, clsx, tailwind-merge

// Icons
lucide-react

// Auth
better-auth/react

// Type-safe API
@elysiajs/eden
```

## Architecture

### Application Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Router v7                      │
│                  (File-based routing)                    │
├─────────────────────────────────────────────────────────┤
│  Routes                │  Protected Routes (_protected.*)│
│  ├── _index.tsx        │  ├── dashboard.tsx              │
│  ├── login.tsx         │  ├── clientes.tsx               │
│  ├── register.tsx      │  ├── ventas.tsx                 │
│  └── invitations.$token│  ├── productos.tsx              │
│                        │  └── ...                        │
├─────────────────────────────────────────────────────────┤
│  Providers (in _protected.tsx):                         │
│  ├── ElectricProvider (sync state)                      │
│  └── SyncProvider (network status)                      │
├─────────────────────────────────────────────────────────┤
│  State Management:                                      │
│  ├── TanStack Query (server state, caching)             │
│  └── Jotai (UI state, modals)                           │
├─────────────────────────────────────────────────────────┤
│  Data Layer:                                            │
│  ├── Eden Treaty API Client (@elysiajs/eden)            │
│  └── Local schema validation (Zod)                      │
└─────────────────────────────────────────────────────────┘
```

### Directory Structure

```
app/
├── routes/                    # File-based routes (React Router v7)
│   ├── _index.tsx            # Root redirect (auth check)
│   ├── _protected.tsx        # Auth layout with providers
│   ├── login.tsx             # Login page
│   ├── register.tsx          # Registration page
│   ├── _protected.dashboard.tsx
│   ├── _protected.clientes.tsx
│   ├── _protected.clientes.nuevo.tsx
│   ├── _protected.clientes.$id.tsx
│   ├── _protected.ventas.tsx
│   ├── _protected.ventas.nueva.tsx
│   └── ...
│
├── components/               # React components
│   ├── ui/                  # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── sheet.tsx
│   │   └── ...
│   ├── forms/               # Form components
│   │   ├── form-input.tsx
│   │   └── form-password.tsx
│   ├── customers/           # Customer components
│   ├── products/            # Product components
│   ├── sales/               # Sales/POS components
│   ├── inventory/           # Inventory components
│   ├── distribucion/        # Distribution components
│   ├── payments/            # Payment components
│   ├── calculator/          # Calculator components
│   └── sync/                # Sync status components
│
├── hooks/                   # Custom React hooks
│   ├── use-auth.ts          # Authentication hook
│   ├── use-customers.ts     # Customer data hooks
│   ├── use-customers-live.ts
│   ├── use-sales.ts
│   ├── use-products.ts
│   ├── use-distribuciones.ts
│   ├── use-modal.ts         # Jotai modal factory
│   └── ...
│
├── lib/                     # Utility libraries
│   ├── utils.ts             # cn() helper
│   ├── schemas.ts           # Zod validation schemas
│   ├── auth-client.ts       # Better Auth client
│   ├── api-client.ts        # Eden Treaty API instance
│   └── db/                  # Local data layer
│       ├── schema.ts        # Zod entity schemas
│       ├── collections.ts   # Data operations
│       └── electric-client.tsx # Sync provider
│
└── styles/
    └── globals.css          # Tailwind + CSS variables
```

## Coding Patterns & Conventions

### Import Aliases

Two aliases are configured and used interchangeably:

```typescript
// ~/* - Preferred for lib, hooks, schemas
import { cn } from "~/lib/utils";
import { useCustomers } from "~/hooks/use-customers";
import type { Customer } from "~/lib/db/schema";

// @/* - Used for component imports
import { Button } from "@/components/ui/button";
import { CustomerCard } from "@/components/customers/customer-card";
```

### Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| **Files** | kebab-case.tsx | `customer-card.tsx`, `use-auth.ts` |
| **Components** | PascalCase | `CustomerCard`, `Button` |
| **Hooks** | camelCase with use- prefix | `useAuth`, `useCustomers` |
| **Props Interfaces** | ComponentNameProps | `CustomerCardProps` |
| **Types/Interfaces** | PascalCase | `Customer`, `CreateCustomerInput` |
| **Zod Schemas** | camelCase with Schema suffix | `customerSchema`, `loginSchema` |

### Component Patterns

#### UI Primitive Pattern (shadcn/ui style)

```typescript
import * as React from "react";
import { cn } from "~/lib/utils";

export interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl",
          variant === "default" && "bg-orange-500 text-white",
          size === "default" && "h-12 px-4",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
```

#### Domain Card Pattern

```typescript
interface CustomerCardProps {
  customer: Customer;
  onClick?: () => void;
}

export function CustomerCard({ customer, onClick }: CustomerCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow" 
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-4">
        {/* Icon container - standard pattern */}
        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
          <User className="h-6 w-6 text-orange-600" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{customer.name}</h3>
          <p className="text-sm text-muted-foreground">{customer.phone}</p>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### Form Pattern (react-hook-form + zod)

```typescript
// 1. Define schema in lib/schemas.ts or inline
const customerSchema = z.object({
  name: z.string().min(2, "El nombre es requerido"),
  phone: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

// 2. Use in component
export function CustomerForm() {
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", phone: "" },
  });

  const mutation = useCreateCustomer();

  const onSubmit = async (data: CustomerFormData) => {
    await mutation.mutateAsync(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormInput
        label="Nombre"
        error={form.formState.errors.name?.message}
        {...form.register("name")}
      />
      <Button type="submit">Guardar</Button>
    </form>
  );
}
```

### Data Fetching Pattern (TanStack Query)

```typescript
// hooks/use-customers.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";

const QUERY_KEYS = {
  customers: ["customers"],
  customer: (id: string) => ["customers", id],
} as const;

// Query hook
export function useCustomers() {
  return useQuery({
    queryKey: QUERY_KEYS.customers,
    queryFn: async () => {
      const { data, error } = await api.customers.get();
      if (error) throw new Error(String(error.value));
      return data as unknown as Customer[];
    },
  });
}

// Single item query
export function useCustomer(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.customer(id),
    queryFn: async () => {
      const { data, error } = await api.customers({ id }).get();
      if (error) throw new Error(String(error.value));
      return data as unknown as Customer;
    },
    enabled: !!id,
  });
}

// Mutation hook
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateCustomerInput) => {
      const { data, error } = await api.customers.post(input);
      if (error) throw new Error(String(error.value));
      return data as unknown as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers });
    },
  });
}
```

### Modal Pattern (Jotai + Dialog/Sheet)

```typescript
// 1. Create modal hook
const useCustomerModal = createModal<Customer>();

// 2. Use in component
function CustomerList() {
  const modal = useCustomerModal();
  
  return (
    <>
      <Button onClick={() => modal.open(customer)}>Editar</Button>
      
      {/* Controlled Dialog */}
      <Dialog 
        open={modal.isOpen} 
        onOpenChange={(open) => !open && modal.close()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          {modal.data && (
            <CustomerForm 
              customer={modal.data} 
              onClose={modal.close} 
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### Route Pattern (React Router v7)

```typescript
// routes/_protected.clientes.tsx
import { Link } from "react-router";
import { useCustomers } from "~/hooks/use-customers";
import { CustomerCard } from "@/components/customers/customer-card";
import type { Route } from "./+types/_protected.clientes";

// Meta function (optional)
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Clientes | Avileo" },
    { name: "description", content: "Gestión de clientes" },
  ];
}

// Main component
export default function ClientesPage() {
  const { data: customers, isLoading } = useCustomers();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Clientes</h1>
      <div className="grid gap-4 mt-4">
        {customers?.map((customer) => (
          <CustomerCard key={customer.id} customer={customer} />
        ))}
      </div>
      <Link to="/clientes/nuevo">
        <Button>Nuevo Cliente</Button>
      </Link>
    </div>
  );
}
```

### Styling Patterns

#### Design System (Orange Theme)

```typescript
// Primary color palette
const colors = {
  // Icon containers
  iconContainer: "w-12 h-12 bg-orange-100 rounded-xl",
  iconContainerSmall: "w-10 h-10 bg-orange-100 rounded-lg",
  
  // Gradients
  gradientPrimary: "bg-gradient-to-br from-orange-400 to-orange-600",
  gradientSoft: "bg-gradient-to-br from-orange-100 to-orange-200",
  gradientBackground: "bg-gradient-to-br from-orange-50 to-stone-100",
  
  // Buttons
  buttonPrimary: "bg-orange-500 hover:bg-orange-600 text-white",
  buttonGradient: "bg-gradient-to-r from-orange-500 to-orange-600",
  
  // Status badges by product type
  typePollo: "bg-orange-100 text-orange-700",
  typeHuevo: "bg-yellow-100 text-yellow-700",
  typeOtro: "bg-gray-100 text-gray-700",
};

// Border radius hierarchy
const radius = {
  sm: "rounded-xl",    // Inputs, small elements
  md: "rounded-2xl",   // Standard cards
  lg: "rounded-3xl",   // Featured cards, modals
  full: "rounded-full", // Badges, avatars
};

// Shadow hierarchy
const shadows = {
  sm: "shadow-sm",     // Minimal elevation
  md: "shadow-md",     // Standard cards
  lg: "shadow-lg",     // Featured elements
  xl: "shadow-xl",     // Modals, popovers
};
```

#### Mobile-First Layout Pattern

```typescript
// Standard page layout
export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center h-16 px-4">
          {/* Content */}
        </div>
      </header>

      {/* Main content with bottom padding for nav */}
      <main className="p-4 pb-24">
        {/* Page content */}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-orange-100 px-4 py-2">
        {/* Nav items */}
      </nav>
    </div>
  );
}
```

## Key Files

### Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite configuration with React Router plugin |
| `react-router.config.ts` | React Router config (SSR disabled) |
| `tsconfig.json` | TypeScript config with path aliases |
| `tailwind.config.js` | Tailwind with CSS variables for theming |
| `components.json` | shadcn/ui configuration |

### Core Application Files

| File | Purpose |
|------|---------|
| `app/root.tsx` | Root layout with HTML shell, error boundary |
| `app/routes.ts` | Route configuration using flatRoutes() |
| `app/routes/_protected.tsx` | Auth layout with ElectricProvider & SyncProvider |
| `app/routes/_index.tsx` | Root redirect (dashboard or login) |

### Library Files

| File | Purpose |
|------|---------|
| `app/lib/utils.ts` | `cn()` utility for Tailwind class merging |
| `app/lib/schemas.ts` | Zod schemas for forms (login, register) |
| `app/lib/auth-client.ts` | Better Auth client configuration |
| `app/lib/api-client.ts` | Eden Treaty API client instance |
| `app/lib/db/schema.ts` | Zod schemas for domain entities |
| `app/lib/db/collections.ts` | Data operation functions |
| `app/lib/db/electric-client.tsx` | Sync state provider (placeholder) |

### Component Categories

| Category | Path | Description |
|----------|------|-------------|
| UI Primitives | `app/components/ui/` | shadcn/ui components (button, input, card, dialog, sheet) |
| Forms | `app/components/forms/` | Form field components |
| Customers | `app/components/customers/` | Customer card, form |
| Products | `app/components/products/` | Product card, form |
| Sales | `app/components/sales/` | Sale list, cart, customer search |
| Payments | `app/components/payments/` | Payment list, form |
| Inventory | `app/components/inventory/` | Inventory card |
| Distribution | `app/components/distribucion/` | Distribution table |
| Calculator | `app/components/calculator/` | Chicken calculator |
| Sync | `app/components/sync/` | Sync status indicator |

## Build & Development

### Commands

```bash
# Development
bun run dev              # Start dev server (port 5173, host 0.0.0.0)

# Building
bun run build            # Build for production
bun run typecheck        # Run TypeScript type checking

# Testing
bun run test             # Run Vitest tests
```

### Environment Variables

```bash
# .env
VITE_API_URL=http://localhost:3000    # Backend API URL
```

## Important Notes for Agents

### Critical Patterns

#### 1. Authentication Flow

```typescript
// Auth is handled by Better Auth
// - JWT stored in httpOnly cookie
// - useSession() hook from better-auth/react
// - Protected routes wrap content in ElectricProvider + SyncProvider

// Check auth status
const { user, isLoading } = useAuth();

// Redirect if not authenticated
if (!user) return <Navigate to="/login" replace />;
```

#### 2. API Client Pattern (Eden Treaty)

```typescript
import { api } from "~/lib/api-client";

// GET request
const { data, error } = await api.customers.get();

// GET with params
const { data, error } = await api.customers({ id }).get();

// POST request
const { data, error } = await api.customers.post({ name: "John" });

// Always check error
if (error) throw new Error(String(error.value));

// Note: Eden Treaty returns type needs casting
return data as unknown as Customer[];
```

#### 3. Offline-First Considerations

```typescript
// All vendor screens must work offline
// - Data is cached via TanStack Query
// - Sync status shown via SyncProvider
// - ElectricProvider manages sync state

// Handle loading states
if (isLoading) return <LoadingSpinner />;

// Handle empty states
if (!data?.length) return <EmptyState />;
```

#### 4. Form Error Handling

```typescript
// Display field errors
{errors.fieldName && (
  <p className="text-sm text-red-500">{errors.fieldName.message}</p>
)}

// Display root errors (from API)
{form.formState.errors.root && (
  <p className="text-sm text-destructive text-center">
    {form.formState.errors.root.message}
  </p>
)}

// Error styling on inputs
className={cn(
  "base-input-classes",
  error && "border-destructive focus-visible:ring-destructive"
)}
```

### DO's ✅

- Use `cn()` utility for ALL class merging
- Set `displayName` on forwardRef components
- Use Spanish for user-facing text (Peru locale: "es-PE")
- Follow the orange color scheme (`orange-500` is primary)
- Use lucide-react for all icons
- Use `Dialog` for confirmations and small forms
- Use `Sheet` for large forms and side panels
- Handle loading and empty states in lists
- Use path aliases (`~/` for lib/hooks, `@/` for components)
- Use React Query for server state
- Use Jotai for UI/modal state

### DON'Ts ❌

- Don't use inline styles - use Tailwind classes
- Don't create new UI primitives unnecessarily - extend existing ones
- Don't use English for user-facing text
- Don't use `as any` or `@ts-ignore` without justification
- Don't forget to handle error states
- Don't use `alert()` or `confirm()` - use Dialog component

### Route Naming Conventions

| URL | Route File | Purpose |
|-----|------------|---------|
| `/` | `_index.tsx` | Root redirect |
| `/login` | `login.tsx` | Login page |
| `/register` | `register.tsx` | Registration |
| `/dashboard` | `_protected.dashboard.tsx` | Main dashboard |
| `/clientes` | `_protected.clientes.tsx` | Customer list |
| `/clientes/nuevo` | `_protected.clientes.nuevo.tsx` | New customer |
| `/clientes/:id` | `_protected.clientes.$id.tsx` | Customer detail |
| `/ventas` | `_protected.ventas.tsx` | Sales list |
| `/ventas/nueva` | `_protected.ventas.nueva.tsx` | New sale (POS) |

### Sync Status Pattern

Tables with sync capability have these fields:
- `syncStatus`: `"pending" | "synced" | "error"`
- `createdAt`, `updatedAt`: Date fields

### Related Documentation

- [Components AGENTS.md](./app/components/AGENTS.md) - Detailed component patterns
- [Root AGENTS.md](../../AGENTS.md) - Project-wide context
- `/docs/` - Full project documentation

## Dependencies

### Internal

| Package | Path | Purpose |
|---------|------|---------|
| `@avileo/shared` | `workspace:*` | Shared types and utilities |
| `@avileo/backend` | `workspace:*` | Type definitions from backend (dev) |

### External Key Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.0 | Core React |
| `react-router` | ^7.9.2 | Routing framework |
| `@tanstack/react-query` | ^5.90.21 | Server state management |
| `jotai` | ^2.17.1 | Atomic state management |
| `react-hook-form` | ^7.71.1 | Form state management |
| `zod` | ^4.3.6 | Runtime validation |
| `better-auth` | ^1.4.18 | Authentication |
| `@elysiajs/eden` | ^1.4.8 | Type-safe API client |
| `tailwindcss` | 3 | Styling |
| `lucide-react` | ^0.563.0 | Icons |
| `@radix-ui/*` | latest | Headless UI primitives |
| `class-variance-authority` | ^0.7.1 | Component variants |

## Testing

```bash
# Run tests
bun run test

# Test configuration in vitest.config.ts
# Uses happy-dom for DOM simulation
# Testing Library for React component tests
```

Example test pattern:
```typescript
// hooks/use-chicken-calculator.test.ts
import { describe, it, expect } from "vitest";
import { useChickenCalculator } from "./use-chicken-calculator";

describe("useChickenCalculator", () => {
  it("calculates total correctly", () => {
    // Test implementation
  });
});
```

---

*This AGENTS.md file is specifically for the `@avileo/app` package. For component-specific patterns, see `app/components/AGENTS.md`.*
