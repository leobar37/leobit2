# AGENTS.md - Routes Directory

> **React Router v7 file-based routing conventions for Avileo**

## Overview

This directory contains all route files for the React Router v7 application. Routes are auto-generated from filenames using `flatRoutes()` convention.

## Route Naming Conventions

| URL Pattern | File Naming | Example |
|-------------|-------------|---------|
| Public root | `_index.tsx` | `/` → `_index.tsx` |
| Public pages | `{name}.tsx` | `/login` → `login.tsx` |
| Protected layout | `_protected.tsx` | Wraps all protected routes |
| Protected pages | `_protected.{name}.tsx` | `/dashboard` → `_protected.dashboard.tsx` |
| Index with children | `.{name}._index.tsx` | `/clientes` → `_protected.clientes._index.tsx` |
| Dynamic segments | `${param}.tsx` | `/clientes/:id` → `_protected.clientes.$id.tsx` |
| Nested paths | `.{name}.{action}.tsx` | `/clientes/nuevo` → `_protected.clientes.nuevo.tsx` |

## Route Categories

### Public Routes (No auth required)
- `_index.tsx` - Root redirect
- `login.tsx` - Login page
- `register.tsx` - Registration page
- `invitations.$token.tsx` - Team invitation acceptance

### Protected Routes (`_protected.*`)
All protected routes are wrapped by `_protected.tsx` which provides:
- Auth guard (redirects to login if not authenticated)
- `ElectricProvider` - Sync state management
- `AppLayout` - Main layout with bottom navigation

### Main Feature Routes
| Route | File | Purpose |
|-------|------|---------|
| `/dashboard` | `_protected.dashboard.tsx` | Main dashboard |
| `/clientes` | `_protected.clientes._index.tsx` | Customer list |
| `/clientes/nuevo` | `_protected.clientes.nuevo.tsx` | New customer form |
| `/clientes/:id` | `_protected.clientes.$id.tsx` | Customer detail |
| `/ventas` | `_protected.ventas._index.tsx` | Sales list |
| `/ventas/nueva` | `_protected.ventas.nueva.tsx` | New sale (POS) |
| `/ventas/:id` | `_protected.ventas.$id._index.tsx` | Sale detail |
| `/productos` | `_protected.productos._index.tsx` | Products list |
| `/pedidos` | `_protected.pedidos._index.tsx` | Orders list |
| `/compras` | `_protected.compras._index.tsx` | Purchases |
| `/cobros` | `_protected.cobros._index.tsx` | Payments/Collections |
| `/config` | `_protected.config._index.tsx` | Settings |

### Route Parameters Pattern
Dynamic segments use `$` prefix in filename:
- `$id` - Entity ID (e.g., `/clientes/123`)
- `$token` - Invitation token

## Route Component Pattern

```typescript
import { Link } from "react-router";
import { useCustomers } from "~/hooks/use-customers";
import type { Route } from "./+types/_protected.clientes";

// Meta function (optional)
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Clientes | Avileo" },
    { name: "description", content: "Gestión de clientes" },
  ];
}

// Main component - default export
export default function ClientesPage() {
  const { data: customers, isLoading } = useCustomers();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Clientes</h1>
      {/* Content */}
    </div>
  );
}
```

## Critical Rules

### 1. Use `._index.tsx` suffix for parent routes
When a route has children, use the `._index.tsx` suffix:
```
✅ _protected.clientes._index.tsx  (for /clientes)
   _protected.clientes.$id.tsx      (child: /clientes/:id)
   _protected.clientes.nuevo.tsx    (child: /clientes/nuevo)
```

### 2. Protected routes MUST use `_protected` prefix
```
✅ _protected.dashboard.tsx
❌ dashboard.tsx  (won't have auth guard or layout)
```

### 3. Import types from `+types/` path
```typescript
import type { Route } from "./+types/_protected.clientes";
```

## Key Files

| File | Purpose |
|------|---------|
| `routes.ts` | Route configuration using `flatRoutes()` |
| `_protected.tsx` | Auth layout with providers |
| `_index.tsx` | Root redirect (to dashboard or login) |

## Related Documentation

- [App AGENTS.md](../../AGENTS.md) - Frontend overview
- [Root AGENTS.md](../../../../AGENTS.md) - Project conventions
