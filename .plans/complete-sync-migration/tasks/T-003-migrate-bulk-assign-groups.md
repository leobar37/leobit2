# T-003: Migrar `useBulkAssignGroups` a Sync Engine

## Objetivo
Eliminar la llamada directa a API en `useBulkAssignGroups` y usar `CustomerGroupService.addMembers()` vía sync engine.

## Requisitos Relacionados
- FR-003

## Archivos Involucrados
- `packages/app/app/hooks/use-bulk-assign-groups.ts`
- `packages/app/app/lib/services/customer-group-service.ts` (verificar `addMembers`)

## Análisis Actual

```typescript
// use-bulk-assign-groups.ts
import { api, extractData } from "~/lib/api-client";  // ❌

export function useBulkAssignGroups() {
  return useOfflineAwareMutation({
    mutationFn: async ({ customerIds, groupIds }) => {
      await Promise.all(
        groupIds.map(async (groupId) => {
          await api.groups({ id: groupId }).members.post({ customerIds });  // ❌ API directa
        })
      );
    },
    // ...
  });
}
```

## Pasos de Implementación

### 1. Verificar `CustomerGroupService.addMembers()`
- [ ] Confirmar que `addMembers(groupId, customerIds)` existe y funciona
- [ ] Verificar que encola sync para `customer_group_members`
- [ ] Confirmar que maneja múltiples customerIds

### 2. Reescribir `useBulkAssignGroups`
- [ ] Usar `useSyncEngine` + `CustomerGroupService`
- [ ] Iterar sobre `groupIds` y llamar `customerGroupService.addMembers()`
- [ ] Eliminar import de `api-client`

### 3. Actualizar Invalidación de Queries
- [ ] Mantener invalidación de queries existente
- [ ] Asegurar que los query keys coinciden con los de `use-grupos.ts`

## Código Esperado

```typescript
import { useQueryClient } from "@tanstack/react-query";
import { useSyncEngine } from "@avileo/drizzle-sync/react";
import { CustomerGroupService } from "~/lib/services/customer-group-service";

export interface BulkAssignGroupsInput {
  customerIds: string[];
  groupIds: string[];
}

export function useBulkAssignGroups() {
  const queryClient = useQueryClient();
  const engine = useSyncEngine();
  const customerGroupService = engine.use(
    "customerGroups",
    () => new CustomerGroupService(engine)
  );

  return useMutation({
    mutationFn: async ({ customerIds, groupIds }: BulkAssignGroupsInput) => {
      for (const groupId of groupIds) {
        await customerGroupService.addMembers(groupId, customerIds);
      }
    },
    onSuccess: (_, { groupIds }) => {
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      queryClient.invalidateQueries({ queryKey: ["customer-groups-with-details"] });
      groupIds.forEach((groupId) => {
        queryClient.invalidateQueries({ queryKey: ["customer-groups", groupId] });
      });
    },
  });
}
```

## Validación
- [ ] Asignación de grupos funciona offline y se sincroniza
- [ ] Múltiples grupos se asignan correctamente
- [ ] No hay imports de `api-client` en `use-bulk-assign-groups.ts`
- [ ] Las queries se invalidan correctamente después de la asignación
