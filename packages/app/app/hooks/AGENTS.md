# AGENTS.md - Hooks Directory

> **Custom React hooks for Avileo frontend**

## Overview

This directory contains custom React hooks that encapsulate data fetching, state management, and business logic. Hooks follow consistent patterns using TanStack Query for server state and Jotai for UI state.

## Hook Categories

### Data Fetching Hooks (TanStack Query)

These hooks wrap API calls with caching, loading states, and error handling.

```
hooks/
├── use-auth.ts              # Authentication state
├── use-customers.ts         # Customer CRUD operations
├── use-customers-live.ts    # Real-time customer updates
├── use-sales.ts             # Sales data and mutations
├── use-products.ts          # Products catalog
├── use-distribuciones.ts    # Distribution data
├── use-payments.ts          # Payments/abonos
├── use-inventory.ts         # Inventory status
├── use-orders.ts            # Orders/pedidos
├── use-suppliers.ts         # Suppliers/proveedores
├── use-business.ts          # Business settings
├── use-team.ts              # Team members
└── use-reports.ts           # Reporting data
```

### UI State Hooks (Jotai)

```
hooks/
├── use-modal.ts             # Modal state factory
└── use-calculator.ts        # Chicken calculator state
```

## Data Fetching Pattern

### Query Hook

```typescript
// hooks/use-customers.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { loadCustomers, createCustomer } from "~/lib/db/collections";
import type { Customer, CreateCustomerInput } from "~/lib/db/schema";

const QUERY_KEYS = {
  customers: ["customers"],
  customer: (id: string) => ["customers", id],
} as const;

// List query with offline support
export function useCustomers() {
  return useQuery({
    queryKey: QUERY_KEYS.customers,
    queryFn: loadCustomers, // Handles offline/online
    staleTime: 1000 * 60 * 5, // 5 minutes
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
```

### Mutation Hook

```typescript
// hooks/use-customers.ts (continued)
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateCustomerInput) => {
      // collections.ts handles offline/online logic
      return createCustomer(input);
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.customers 
      });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Customer> }) => {
      const { data: result, error } = await api.customers({ id }).put(data);
      if (error) throw new Error(String(error.value));
      return result as unknown as Customer;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.customer(variables.id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.customers 
      });
    },
  });
}
```

## Auth Hook Pattern

```typescript
// hooks/use-auth.ts
import { useSession, useLogout } from "better-auth/react";

export function useAuth() {
  const { data: session, isLoading } = useSession();
  const logout = useLogout();

  return {
    user: session?.user,
    isLoading,
    isAuthenticated: !!session?.user,
    logout: logout.mutateAsync,
  };
}
```

## Modal Hook Pattern (Jotai)

```typescript
// hooks/use-modal.ts
import { atom, useAtom } from "jotai";

interface ModalState<T = unknown> {
  isOpen: boolean;
  data: T | null;
}

export function createModal<T = unknown>() {
  const modalAtom = atom<ModalState<T>>({ isOpen: false, data: null });

  return function useModal() {
    const [state, setState] = useAtom(modalAtom);

    return {
      isOpen: state.isOpen,
      data: state.data,
      open: (data: T) => setState({ isOpen: true, data }),
      close: () => setState({ isOpen: false, data: null }),
      toggle: () => setState((s) => ({ ...s, isOpen: !s.isOpen })),
    };
  };
}

// Usage:
// const useCustomerModal = createModal<Customer>();
```

## Offline-First Hook Pattern

```typescript
// hooks/use-customers.ts
export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: loadCustomers,
    // Offline support: data cached, stale-while-revalidate
    staleTime: 1000 * 60 * 5,
    // Retry offline requests when coming back online
    retry: (failureCount, error) => {
      if (!navigator.onLine) return false;
      return failureCount < 3;
    },
  });
}
```

## Hook Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Data fetching | `use{Entity}s` | `useCustomers`, `useSales` |
| Single item | `use{Entity}` | `useCustomer(id)` |
| Mutations | `use{Action}{Entity}` | `useCreateCustomer` |
| Real-time | `use{Entity}sLive` | `useCustomersLive` |
| UI state | `use{Feature}` | `useModal`, `useCalculator` |

## Key Files

| File | Purpose |
|------|---------|
| `use-auth.ts` | Better Auth session management |
| `use-customers.ts` | Customer data with offline support |
| `use-sales.ts` | Sales data and POS operations |
| `use-modal.ts` | Jotai modal state factory |

## Testing Hooks

```typescript
// hooks/use-chicken-calculator.test.ts
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChickenCalculator } from "./use-chicken-calculator";

describe("useChickenCalculator", () => {
  it("calculates total correctly", () => {
    const { result } = renderHook(() => useChickenCalculator());
    
    act(() => {
      result.current.addItem({ weight: 2.5, pricePerKg: 12 });
    });
    
    expect(result.current.total).toBe(30);
  });
});
```

---

*See [App AGENTS.md](../AGENTS.md) for frontend architecture overview.*
