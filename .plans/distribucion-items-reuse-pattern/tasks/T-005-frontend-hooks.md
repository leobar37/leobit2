# T-005: Frontend - Hooks for Distribucion Items

**Status:** pending  
**Priority:** P0  
**Est. Time:** 2 hours  
**Requirements:** FR-002, FR-003, FR-004, FR-005  
**Depends on:** T-004  
**Blocks:** T-006

## Description
Create TanStack Query hooks for distribucion items following use-sales.ts pattern.

## File to Create
**packages/app/app/hooks/use-distribucion-items.ts** (new file)

OR extend existing:
**packages/app/app/hooks/use-distribuciones.ts**

## Hooks to Implement

### Query Hooks

```typescript
// Get distribucion with items (enriched query)
export function useDistribucionWithItems(id: string | null) {
  const distribucionService = useDistribucionService();
  
  return useQuery({
    queryKey: ["distribucion", id, "with-items"],
    queryFn: async () => {
      if (!id) return null;
      return distribucionService.findById(id);
    },
    enabled: !!id,
  });
}

// Get items for a distribucion
export function useDistribucionItems(distribucionId: string | null) {
  const distribucionService = useDistribucionService();
  
  return useQuery({
    queryKey: ["distribucion-items", distribucionId],
    queryFn: async () => {
      if (!distribucionId) return [];
      const distribucion = await distribucionService.findById(distribucionId);
      return distribucion?.items ?? [];
    },
    enabled: !!distribucionId,
  });
}
```

### Mutation Hooks

```typescript
// Create distribucion with items
export function useCreateDistribucionWithItems() {
  const distribucionService = useDistribucionService();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      distribucion,
      items,
    }: {
      distribucion: CreateDistribucionInput;
      items?: CreateDistribucionItemInput[];
    }) => {
      return distribucionService.create({ ...distribucion, items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribuciones"] });
    },
  });
}

// Add item to distribucion
export function useAddDistribucionItem() {
  const distribucionService = useDistribucionService();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      distribucionId,
      item,
    }: {
      distribucionId: string;
      item: CreateDistribucionItemInput;
    }) => {
      return distribucionService.addItem(distribucionId, item);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["distribucion", variables.distribucionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["distribucion-items", variables.distribucionId],
      });
    },
  });
}

// Update item
export function useUpdateDistribucionItem() {
  const distribucionService = useDistribucionService();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      distribucionId,
      itemId,
      data,
    }: {
      distribucionId: string;
      itemId: string;
      data: {
        cantidadAsignada?: number;
        cantidadVendida?: number;
      };
    }) => {
      return distribucionService.updateItem(distribucionId, itemId, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["distribucion", variables.distribucionId],
      });
    },
  });
}

// Remove item
export function useRemoveDistribucionItem() {
  const distribucionService = useDistribucionService();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      distribucionId,
      itemId,
    }: {
      distribucionId: string;
      itemId: string;
    }) => {
      return distribucionService.removeItem(distribucionId, itemId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["distribucion", variables.distribucionId],
      });
    },
  });
}
```

## Query Keys Pattern

Follow the same pattern as use-sales.ts:

```typescript
const QUERY_KEYS = {
  distribuciones: ["distribuciones"],
  distribucion: (id: string) => ["distribucion", id],
  items: (distribucionId: string) => ["distribucion-items", distribucionId],
} as const;
```

## Usage Example

```typescript
// In component
const { data: distribucion } = useDistribucionWithItems(distribucionId);
const addItem = useAddDistribucionItem();
const updateItem = useUpdateDistribucionItem();
const removeItem = useRemoveDistribucionItem();

// Add item
await addItem.mutateAsync({
  distribucionId,
  item: {
    variantId: "var-123",
    cantidadAsignada: 20,
    unidad: "kg",
  },
});
```

## Verification Checklist

- [ ] useDistribucionWithItems returns distribucion + items
- [ ] useAddDistribucionItem adds item and invalidates cache
- [ ] useUpdateDistribucionItem updates quantities
- [ ] useRemoveDistribucionItem removes item
- [ ] Query keys follow consistent pattern
- [ ] All hooks handle loading/error states
