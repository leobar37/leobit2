# Tarea 4: Hooks para UI

> **Dependencias:** Tarea 3  
> **Duración:** 3-4 días  
> **Archivos:** `app/hooks/*.ts`

---

## Objetivo

Crear hooks de React que consuman los servicios, exponiendo datos y operaciones a los componentes UI.

---

## Principio: Hooks Delgados

Los hooks solo son **adaptadores** entre servicios y UI. La lógica compleja está en los servicios.

```typescript
// Hook: Solo conecta servicio con React
export function useCustomers(businessId: string) {
  const service = useCustomerService();
  return useLiveQuery(() => service.findByBusiness(businessId));
}
```

---

## 4.1 Provider de Servicios

```typescript
// app/providers/service-provider.tsx

import { createContext, useContext, ReactNode } from "react";
import { useEngine } from "~/engine/provider";
import { SyncService } from "~/services/sync.service";
import { CustomerService } from "~/services/customer.service";
import { SaleService } from "~/services/sale.service";
import { ProductService } from "~/services/product.service";

interface ServicesContextValue {
  sync: SyncService;
  customers: CustomerService;
  sales: SaleService;
  products: ProductService;
  // ... otros servicios
}

const ServicesContext = createContext<ServicesContextValue | null>(null);

export function ServiceProvider({ children }: { children: ReactNode }) {
  const { db } = useEngine();
  
  // Crear instancias de servicios (singleton por sesión)
  const services = useMemo(() => {
    const sync = new SyncService(db);
    return {
      sync,
      customers: new CustomerService(db, sync),
      sales: new SaleService(db, sync),
      products: new ProductService(db, sync),
      // ...
    };
  }, [db]);

  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices() {
  const context = useContext(ServicesContext);
  if (!context) throw new Error("useServices must be used within ServiceProvider");
  return context;
}

// Helpers específicos
export function useCustomerService() {
  return useServices().customers;
}

export function useSaleService() {
  return useServices().sales;
}

export function useSyncService() {
  return useServices().sync;
}
```

---

## 4.2 Hooks de Customers

```typescript
// app/hooks/use-customers.ts

import { useLiveQuery } from "@electric-sql/react";
import { useCustomerService } from "~/providers/service-provider";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Hook: Listar clientes
export function useCustomers(businessId: string) {
  const service = useCustomerService();
  
  return useLiveQuery(
    () => service.findByBusiness(businessId),
    [businessId]
  );
}

// Hook: Un cliente específico
export function useCustomer(id: string) {
  const service = useCustomerService();
  
  return useLiveQuery(
    () => service.findById(id),
    [id]
  );
}

// Hook: Crear cliente
export function useCreateCustomer() {
  const service = useCustomerService();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: service.create.bind(service),
    onSuccess: () => {
      // Invalidar cache de customers
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

// Hook: Actualizar cliente
export function useUpdateCustomer() {
  const service = useCustomerService();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerInput }) =>
      service.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customers", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

// Hook: Eliminar cliente
export function useDeleteCustomer() {
  const service = useCustomerService();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: service.delete.bind(service),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
```

---

## 4.3 Hooks de Sales

```typescript
// app/hooks/use-sales.ts

import { useLiveQuery } from "@electric-sql/react";
import { useSaleService } from "~/providers/service-provider";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Hook: Listar ventas
export function useSales(businessId: string) {
  const service = useSaleService();
  
  return useLiveQuery(
    () => service.findByBusiness(businessId),
    [businessId]
  );
}

// Hook: Una venta específica (con items)
export function useSale(id: string) {
  const service = useSaleService();
  
  return useLiveQuery(
    () => service.findById(id),
    [id]
  );
}

// Hook: Crear venta con items
export function useCreateSale() {
  const service = useSaleService();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      sale,
      items,
    }: {
      sale: CreateSaleInput;
      items: CreateSaleItemInput[];
    }) => service.createWithItems(sale, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}

// Hook: Actualizar venta (con items opcionales)
export function useUpdateSale() {
  const service = useSaleService();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      id,
      sale,
      items,
    }: {
      id: string;
      sale: Partial<CreateSaleInput>;
      items?: CreateSaleItemInput[];
    }) => service.updateWithItems(id, sale, items),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sales", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}

// Hook: Eliminar venta
export function useDeleteSale() {
  const service = useSaleService();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: service.delete.bind(service),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}
```

---

## 4.4 Hook de Estado de Sync

```typescript
// app/hooks/use-sync-status.ts

import { useSyncService } from "~/providers/service-provider";
import { useEffect, useState } from "react";

export function useSyncStatus() {
  const syncService = useSyncService();
  const [status, setStatus] = useState(() => syncService.getStatus());

  useEffect(() => {
    // Actualizar cada 5 segundos
    const interval = setInterval(() => {
      setStatus(syncService.getStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, [syncService]);

  return {
    ...status,
    isOnline: navigator.onLine,
    forceSync: () => syncService.processPending(),
  };
}

// Hook: Operaciones con error (dead letter)
export function useFailedOperations() {
  const syncService = useSyncService();
  
  return useMutation({
    mutationFn: () => syncService.getFailedOperations(),
  });
}

// Hook: Resolver conflicto
export function useResolveConflict() {
  const syncService = useSyncService();
  
  return useMutation({
    mutationFn: ({
      operationId,
      resolution,
      mergedData,
    }: {
      operationId: string;
      resolution: 'server' | 'client' | 'merged';
      mergedData?: Record<string, unknown>;
    }) => syncService.resolveConflict(operationId, resolution, mergedData),
  });
}
```

---

## 4.5 Hooks de Otros Servicios

### Products
```typescript
// app/hooks/use-products.ts
export function useProducts(businessId: string) { ... }
export function useProduct(id: string) { ... }
export function useCreateProduct() { ... }
export function useUpdateProduct() { ... }
export function useDeleteProduct() { ... }
```

### Purchases
```typescript
// app/hooks/use-purchases.ts
export function usePurchases(businessId: string) { ... }
export function usePurchase(id: string) { ... }
export function useCreatePurchase() { ... }
export function useUpdatePurchase() { ... }
export function useDeletePurchase() { ... }
```

### Distribuciones
```typescript
// app/hooks/use-distribuciones.ts
export function useDistribuciones(businessId: string) { ... }
export function useDistribucion(id: string) { ... }
export function useCreateDistribucion() { ... }
export function useUpdateDistribucion() { ... }
export function useDeleteDistribucion() { ... }
```

---

## Lista Completa de Hooks

| Entidad | Hooks |
|---------|-------|
| **Customers** | useCustomers, useCustomer, useCreateCustomer, useUpdateCustomer, useDeleteCustomer |
| **Sales** | useSales, useSale, useCreateSale, useUpdateSale, useDeleteSale |
| **Products** | useProducts, useProduct, useCreateProduct, useUpdateProduct, useDeleteProduct |
| **Purchases** | usePurchases, usePurchase, useCreatePurchase, useUpdatePurchase, useDeletePurchase |
| **Distribuciones** | useDistribuciones, useDistribucion, useCreateDistribucion, useUpdateDistribucion, useDeleteDistribucion |
| **Sync** | useSyncStatus, useFailedOperations, useResolveConflict |

---

## Checklist

- [ ] ServiceProvider con todos los servicios
- [ ] Hooks de customers (5 hooks)
- [ ] Hooks de sales (5 hooks)
- [ ] Hooks de products (5 hooks)
- [ ] Hooks de purchases (5 hooks)
- [ ] Hooks de distribuciones (5 hooks)
- [ ] Hooks de sync (3 hooks)
- [ ] Invalidación de cache de React Query
- [ ] Tests de hooks

---

## Dependencias

- Tarea 3 (servicios implementados)

## Bloquea

- Tarea 5 (rutas usan estos hooks)

---

*Patrón: Hooks delgados, lógica en servicios*
