# AGENTS.md - Routes Directory

> **Context file for AI agents working on React Router v7 routes in Avileo**

## Overview

This directory contains **React Router v7 file-based routes** for the Avileo (PollosPro) application. Routes are automatically generated from files using the `flatRoutes()` convention from `@react-router/fs-routes`.

**CRITICAL**: This project uses **React Router v7** with file-based routing conventions, NOT React Router v6 or Next.js. Understanding the file naming conventions is essential for working with routes correctly.

## Project Type & Stack

| Aspect | Technology |
|--------|------------|
| **Routing Framework** | React Router v7 (Framework Mode) |
| **Routing Convention** | flatRoutes (Remix-style file-based routing) |
| **Language** | TypeScript |
| **UI Components** | React with Tailwind CSS + shadcn/ui |
| **State Management** | TanStack Query (server state), Jotai (UI state) |
| **Auth** | Better Auth (JWT-based) |

## Architecture

### Routing Hierarchy

```
app/routes/
├── _index.tsx                    # Root route - redirects to dashboard or login
├── login.tsx                     # Public: Login page
├── register.tsx                  # Public: Registration page
├── invitations.$token.tsx        # Public: Accept invitation by token
├── _protected.tsx                # Layout: Auth guard + AppLayout wrapper
└── _protected.*                  # All protected routes (require auth)
```

### Protected Routes Pattern

All routes prefixed with `_protected.` are wrapped by `_protected.tsx` which provides:
- **Authentication check**: Redirects to `/login` if not authenticated
- **ElectricProvider**: Sync state management
- **SyncProvider**: Network status indicator
- **AppLayout**: Header, bottom navigation, layout config

```tsx
// _protected.tsx provides these to all child routes via <Outlet />
<ElectricProvider>
  <SyncProvider>
    <AppLayout>
      <Outlet />  {/* Child routes render here */}
    </AppLayout>
  </SyncProvider>
</ElectricProvider>
```

## File Naming Conventions

React Router v7 uses **dot-delimited** file names to create URL paths and nesting:

| Filename Pattern | URL Path | Parent Layout |
|------------------|----------|---------------|
| `_index.tsx` | `/` | `root.tsx` |
| `login.tsx` | `/login` | `root.tsx` |
| `_protected.tsx` | (layout only) | - |
| `_protected.dashboard.tsx` | `/dashboard` | `_protected.tsx` |
| `_protected.clientes._index.tsx` | `/clientes` | `_protected.tsx` |
| `_protected.clientes.nuevo.tsx` | `/clientes/nuevo` | `_protected.tsx` |
| `_protected.clientes.$id._index.tsx` | `/clientes/:id` | `_protected.tsx` |
| `_protected.clientes.$id.edit.tsx` | `/clientes/:id/edit` | `_protected.tsx` |

### ⚠️ CRITICAL: Index Routes vs Nested Routes

**Index routes** (`._index.tsx`) and **nested routes** with dynamic params (`.$id`) are INDEPENDENT routes - NOT parent-child relationships.

```
# CORRECT structure (both render in _protected.tsx Outlet):
_protected.clientes._index.tsx       → /clientes
_protected.clientes.$id._index.tsx   → /clientes/:id
_protected.clientes.$id.edit.tsx     → /clientes/:id/edit

# WRONG structure (would expect Outlet in clientes.tsx):
_protected.clientes.tsx              → would be parent layout
_protected.clientes.$id.tsx          → expects Outlet in clientes.tsx
```

**Rule**: If a route has child routes (like `$id` having `.edit`), the parent MUST be named `._index.tsx` to avoid routing conflicts.

## Coding Patterns & Conventions

### Route Component Structure

```tsx
// imports at top
import { useParams, useNavigate, Link } from "react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCustomer } from "~/hooks/use-customer";
import { useSetLayout } from "~/components/layout/app-layout";

// Optional: Meta function for SEO
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Page Title | Avileo" },
    { name: "description", content: "Page description" },
  ];
}

// Main component - MUST be default export
export default function PageName() {
  // Layout configuration (protected routes only)
  useSetLayout({ 
    title: "Page Title", 
    actions: <SomeComponent /> 
  });

  // Hooks
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useSomeHook(id);

  // Loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Empty/error state
  if (!data) {
    return <NotFoundState />;
  }

  // Main render
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      {/* Page content */}
    </div>
  );
}
```

### Layout Configuration Pattern

Protected routes use `useSetLayout()` to configure the AppLayout:

```tsx
// Simple layout
useSetLayout({ title: "Clientes" });

// With actions (sync status)
useSetLayout({ 
  title: "Clientes", 
  actions: <SyncStatus /> 
});

// With back button
useSetLayout({
  title: "Calculadora",
  showBackButton: true,
  backHref: "/dashboard",
  showBottomNav: false,
});
```

### Navigation Patterns

```tsx
// Using Link component (preferred for internal navigation)
<Link to="/clientes/nuevo">Nuevo Cliente</Link>
<Link to={`/clientes/${customer.id}`}>Ver Cliente</Link>

// Using navigate hook (for programmatic navigation)
const navigate = useNavigate();
navigate("/dashboard");
navigate(-1); // Go back

// Navigation with state
<Link to="/login" state={{ from: location }} />
```

### Data Loading Pattern

```tsx
const { id } = useParams();
const { data, isLoading, error } = useSomeHook(id!);

// Always handle loading
if (isLoading) return <LoadingState />;

// Handle errors
if (error) return <ErrorState message={error.message} />;

// Handle not found
if (!data) return <NotFoundState />;
```

## Route File Inventory

| File | URL | Purpose | Layout |
|------|-----|---------|--------|
| `_index.tsx` | `/` | Root redirect (dashboard or login) | root |
| `login.tsx` | `/login` | Login form | root |
| `register.tsx` | `/register` | Registration form | root |
| `invitations.$token.tsx` | `/invitations/:token` | Accept invitation | root |
| `_protected.tsx` | (layout) | Auth guard + providers | - |
| `_protected.dashboard.tsx` | `/dashboard` | Main dashboard | protected |
| `_protected.clientes._index.tsx` | `/clientes` | Customer list | protected |
| `_protected.clientes.nuevo.tsx` | `/clientes/nuevo` | New customer form | protected |
| `_protected.clientes.$id._index.tsx` | `/clientes/:id` | Customer detail | protected |
| `_protected.clientes.$id.edit.tsx` | `/clientes/:id/edit` | Edit customer | protected |
| `_protected.productos.tsx` | `/productos` | Product list | protected |
| `_protected.productos.$id.tsx` | `/productos/:id` | Product detail | protected |
| `_protected.ventas.tsx` | `/ventas` | Sales list | protected |
| `_protected.ventas.nueva.tsx` | `/ventas/nueva` | New sale (POS) | protected |
| `_protected.ventas.$id.tsx` | `/ventas/:id` | Sale detail | protected |
| `_protected.distribuciones.tsx` | `/distribuciones` | Distributions | protected |
| `_protected.mi-distribucion.tsx` | `/mi-distribucion` | My distribution | protected |
| `_protected.calculadora.tsx` | `/calculadora` | Calculator | protected |
| `_protected.cierre.tsx` | `/cierre` | Daily close | protected |
| `_protected.invitations.tsx` | `/invitations` | Manage invitations | protected |
| `_protected.profile.tsx` | `/profile` | User profile | protected |
| `_protected.business.create.tsx` | `/business/create` | Create business | protected |
| `_protected.business.edit.tsx` | `/business/edit` | Edit business | protected |

## Critical Rules for Agents

### 1. Route Naming Convention

**ALWAYS** use `._index.tsx` suffix for parent routes that have children:

```bash
# ✅ CORRECT
_protected.clientes._index.tsx
_protected.clientes.$id._index.tsx
_protected.clientes.$id.edit.tsx

# ❌ WRONG - causes routing issues
_protected.clientes.tsx  # Don't use if you have clientes.$id.tsx
_protected.clientes.$id.tsx  # Don't use if you have clientes.$id.edit.tsx
```

### 2. Never Create Parent Without Outlet

If you create `_protected.something.tsx`, it becomes a layout route expecting `<Outlet />`. If you don't need nested layouts, use `._index.tsx` suffix instead.

### 3. Protected vs Public Routes

- **Public routes** (no underscore prefix): `login.tsx`, `register.tsx`, `invitations.$token.tsx`
- **Protected routes** (start with `_protected.`): All business logic pages

### 4. Import Conventions

```tsx
// UI components use @/ alias
import { Button } from "@/components/ui/button";

// Hooks and lib use ~/ alias  
import { useCustomer } from "~/hooks/use-customer";
import { api } from "~/lib/api-client";

// Components use @/ or ~/ depending on location
import { CustomerCard } from "~/components/customers/customer-card";
```

### 5. Error Handling

```tsx
// Add ErrorBoundary export for route-level error handling
export function ErrorBoundary({ error }: { error: unknown }) {
  console.error('Route error:', error);
  return <ErrorPage error={error} />;
}
```

## Common Patterns

### List Page Pattern

```tsx
export default function ListPage() {
  useSetLayout({ title: "Items", actions: <SyncStatus /> });
  const { data, isLoading } = useItems();
  const navigate = useNavigate();

  if (isLoading) return <LoadingState />;

  return (
    <>
      <div className="space-y-3">
        {data?.map((item) => (
          <Link key={item.id} to={`/items/${item.id}`}>
            <ItemCard item={item} />
          </Link>
        ))}
      </div>
      <Link to="/items/nuevo">
        <Button>Nuevo</Button>
      </Link>
    </>
  );
}
```

### Detail Page Pattern

```tsx
export default function DetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useItem(id!);
  const navigate = useNavigate();

  if (isLoading) return <LoadingState />;
  if (!data) return <NotFoundState />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 ...">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft />
        </button>
        <h1>{data.name}</h1>
        <Link to={`/items/${id}/edit`}>
          <Pencil />
        </Link>
      </header>
      <main>{/* content */}</main>
    </div>
  );
}
```

## Dependencies

### Internal

| Module | Path | Purpose |
|--------|------|---------|
| `useSetLayout` | `~/components/layout/app-layout` | Configure AppLayout |
| `useAuth` | `@/hooks/use-auth` | Authentication state |
| `SyncStatus` | `~/components/sync/sync-status` | Sync indicator |
| Various hooks | `~/hooks/use-*` | Data fetching hooks |

### External

| Library | Usage |
|---------|-------|
| `react-router` | `useParams`, `useNavigate`, `Link`, `Outlet`, `Navigate` |
| `@tanstack/react-query` | Data fetching (via custom hooks) |
| `lucide-react` | Icons |

## Debugging Routes

If a route isn't rendering:

1. **Check file naming**: Must use `._index.tsx` if there are child routes
2. **Check imports**: Ensure no broken imports in the route file
3. **Check console**: Look for React errors or 404s
4. **Restart dev server**: File-based routing sometimes needs restart

### Console Logs for Debugging

```tsx
console.log('[RouteName] Module loaded');
console.log('[RouteName] Params:', useParams());
console.log('[RouteName] Rendering with data:', data);
```

## Build & Development

```bash
# Routes are auto-generated from files
# No manual route configuration needed (uses flatRoutes())

# Start dev server
bun run dev

# Type checking (includes route types)
bun run typecheck
```

## Related Documentation

- [React Router v7 File Route Conventions](https://reactrouter.com/how-to/file-route-conventions)
- [Parent AGENTS.md](../../AGENTS.md) - Project-wide context
- [App AGENTS.md](../AGENTS.md) - Frontend package overview

---

*This file documents the routing system for Avileo. When adding new routes, always verify the file naming follows flatRoutes conventions.*
