# AGENTS.md - Routes Directory

> **React Router v7 file-based routing conventions**

## Overview

This directory contains all application routes using React Router v7's file-based routing system. Routes are automatically generated from filenames using the `flatRoutes()` convention.

## File-Based Routing Convention

### Route File Naming

| Filename Pattern | URL Path | Purpose |
|------------------|----------|---------|
| `_index.tsx` | `/` | Root redirect (to dashboard or login) |
| `login.tsx` | `/login` | Login page (public) |
| `register.tsx` | `/register` | Registration page (public) |
| `invitations.$token.tsx` | `/invitations/:token` | Accept invitation (public) |
| `venta.$token.tsx` | `/venta/:token` | Public sale token page |
| `_protected.tsx` | (layout) | Auth guard + AppLayout wrapper |
| `_protected.dashboard.tsx` | `/dashboard` | Main dashboard |
| `_protected.clientes._index.tsx` | `/clientes` | Customer list |
| `_protected.clientes.nuevo.tsx` | `/clientes/nuevo` | New customer form |
| `_protected.clientes.$id._index.tsx` | `/clientes/:id` | Customer detail |
| `_protected.clientes.$id.edit.tsx` | `/clientes/:id/edit` | Edit customer |
| `_protected.ventas._index.tsx` | `/ventas` | Sales list |
| `_protected.ventas.nueva.tsx` | `/ventas/nueva` | New sale (POS) |
| `_protected.ventas.$id._index.tsx` | `/ventas/:id` | Sale detail |
| `_protected.ventas.$id.editar.tsx` | `/ventas/:id/editar` | Edit sale (nested) |
| `_protected.ventas.$id.editar._index.tsx` | `/ventas/:id/editar` | Edit sale index |
| `_protected.ventas.$id.editar.calculadora.tsx` | `/ventas/:id/editar/calculadora` | Calculator sub-route |

### Critical Rules

1. **Use `._index.tsx` suffix** for routes with children
   - Example: `clientes._index.tsx` when you have `clientes.$id.tsx`
   - Without this, nested routes conflict

2. **`_protected.*` prefix** for auth-required routes
   - Automatically wrapped with auth guard
   - Includes `ElectricProvider` + `SyncProvider`
   - Bottom navigation included

3. **Public routes** have no underscore prefix
   - `login.tsx`, `register.tsx` - no auth required
   - No layout wrappers applied

4. **Dynamic segments** use `$` prefix
   - `$id` → `:id` in URL
   - `$token` → `:token` in URL
   - Access via `useParams()` hook

## Route Module Structure

```typescript
// routes/_protected.clientes.tsx
import { Link } from "react-router";
import { useCustomers } from "~/hooks/use-customers";
import type { Route } from "./+types/_protected.clientes";

// Optional: Meta tags
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Clientes | Avileo" },
    { name: "description", content: "Gestión de clientes" },
  ];
}

// Optional: Loader for data prefetching
  // Preload data if needed
  return { /* initial data */ };
}

// Main component
export default function ClientesPage() {
  const { data: customers, isLoading } = useCustomers();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold">Clientes</h1>
      {/* Content */}
      <Link to="/clientes/nuevo">
        <Button>Nuevo Cliente</Button>
      </Link>
    </div>
  );
}
```

## Route Organization Patterns

### Feature-Based Grouping

```
routes/
├── _index.tsx                    # Root redirect
├── login.tsx                     # Auth (public)
├── register.tsx                  # Auth (public)
├── invitations.$token.tsx        # Invitations (public)
├── venta.$token.tsx              # Public sales
├── _protected.tsx                # Auth layout
├── _protected.dashboard.tsx      # Dashboard
├── _protected.clientes.*         # Customer feature
├── _protected.ventas.*           # Sales feature
├── _protected.productos.*        # Products feature
├── _protected.compras.*          # Purchases feature
├── _protected.proveedores.*      # Suppliers feature
├── _protected.distribuciones.*   # Distribution feature
├── _protected.cobros.*           # Payments feature
├── _protected.config.*           # Settings feature
├── _protected.reportes.*         # Reports feature
└── _protected.activos.tsx        # Assets
```

### Nested Route Pattern

```
_protected.ventas.$id.editar.tsx       # Parent layout
_protected.ventas.$id.editar._index.tsx   # Default child
_protected.ventas.$id.editar.calculadora.tsx  # Calculator child
```

## Common Route Patterns

### Online-Only Feature Pattern

For routes that require internet connection (e.g., WhatsApp configuration), use this pattern:

```typescript
// routes/_protected.config.whatsapp.tsx
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function WhatsAppConfigPage() {
  const { isOnline } = useSync();
  const connectMutation = useConnectWhatsApp();

  return (
    <div>
      {!isOnline && (
        <Alert variant="destructive">
          <AlertDescription>
            Conéctate a internet para vincular WhatsApp
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleConnect}
        disabled={connectMutation.isPending || !isOnline}
      >
        {isOnline ? "Conectar WhatsApp" : "Sin conexión"}
      </Button>
    </div>
  );
}
```

**Key points:**
- Use `useSync()` to get `isOnline` state
- Disable buttons with `disabled={!isOnline}`
- Message format: `"Conéctate a internet para [acción]"`

### List + Detail Pattern

```
_protected.clientes._index.tsx       # /clientes (list)
_protected.clientes.nuevo.tsx        # /clientes/nuevo (create)
_protected.clientes.$id._index.tsx   # /clientes/:id (detail)
_protected.clientes.$id.edit.tsx     # /clientes/:id/edit (edit)
```

### Wizard/Multi-Step Pattern

```
_protected.ventas.nueva.tsx              # Parent layout
_protected.ventas.nueva._index.tsx       # Step 1: Customer selection
_protected.ventas.nueva.calculadora.tsx  # Step 2: Calculator
```

## Type Safety

React Router v7 generates types automatically. Import from `+types/`:

```typescript
import type { Route } from "./+types/_protected.clientes";

export function meta({}: Route.MetaArgs) { }
export default function Component({ loaderData }: Route.ComponentProps) { }
```

## Important Notes

### DO:
- Use `._index.tsx` suffix for parent routes with children
- Use `_protected.*` prefix for auth-required pages
- Handle loading states in each route
- Use `Link` from "react-router" for navigation
- Access params with `useParams()` hook

### DON'T:
- Don't manually define routes - use file naming
- Don't forget `._index.tsx` when adding child routes
- Don't use relative imports for navigation - use `Link`
- Don't skip loading states - mobile users need feedback

---

*See [App AGENTS.md](../../AGENTS.md) for frontend overview.*
