# T-001: Migrar `useDeleteSale` a Sync Engine

## Objetivo
Eliminar la llamada directa a API en `useDeleteSale` y usar `SaleService.delete()` vía sync engine para todas las ventas, independientemente de su status.

## Requisitos Relacionados
- FR-001

## Archivos Involucrados
- `packages/app/app/hooks/use-sales.ts` (líneas 416-448)
- `packages/app/app/lib/services/sale-service.ts` (verificar método `delete`)

## Análisis Actual

```typescript
// use-sales.ts:425-448
export function useDeleteSale() {
  const engine = useSyncEngine();
  const saleService = engine.use("sales", () => new SaleService(engine));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }): Promise<void> => {
      if (status === "draft") {
        return saleService.delete(id);  // ✅ Ya usa engine
      } else {
        // ❌ API directa
        const { error } = await api.sales({ id }).delete();
        if (error) throw new Error(String(error.value));
      }
    },
    // ...
  });
}
```

## Pasos de Implementación

### 1. Verificar `SaleService.delete()`
- [ ] Confirmar que `SaleService.delete()` implementa soft-delete (update status a "cancelled")
- [ ] Si no, agregar soft-delete en el servicio
- [ ] Verificar que `queueSync` se llama para la operación

### 2. Simplificar `useDeleteSale`
- [ ] Eliminar el parámetro `status` del input (ya no es necesario)
- [ ] Usar `saleService.delete(id)` para TODOS los casos
- [ ] Eliminar import de `api-client` si ya no se usa en el archivo

### 3. Actualizar Consumidores
- [ ] Buscar todos los usos de `useDeleteSale` y actualizar llamadas (quitar `status`)
- [ ] Verificar `_protected.ventas.$id._index.tsx`
- [ ] Verificar componentes que usan `useDeleteSale`

### 4. Validar Backend
- [ ] Confirmar que el backend maneja correctamente operaciones `delete` de sales vía sync
- [ ] Verificar que el soft-delete se aplica correctamente en el servidor

## Código Esperado

```typescript
export function useDeleteSale() {
  const engine = useSyncEngine();
  const saleService = engine.use("sales", () => new SaleService(engine));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return saleService.delete(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sale(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sales });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.byStatus("draft") });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.byStatus("cancelled") });
    },
  });
}
```

## Validación
- [ ] Ventas draft se eliminan localmente y se sincronizan
- [ ] Ventas procesadas se marcan como canceladas localmente y se sincronizan
- [ ] Funciona offline (la operación se encola)
- [ ] No hay imports de `api-client` en `use-sales.ts`
