# TODO: Implementar Patrón Offline-First con Items Independientes

## Contexto
Se crearon las collections `order.collection.ts` y `order-item.collection.ts` con soporte offline-first usando TanStack DB + ElectricSQL. Ahora hay que integrarlas en la aplicación.

## Próximos Pasos

### 1. Crear Hooks con useLiveQuery
**Archivos a modificar:**
- `app/hooks/use-orders.ts` - Reemplazar useQuery por useLiveQuery
- Crear `app/hooks/use-order-items.ts` - Nuevo hook para items

**Patrón:**
```typescript
// use-orders.ts
import { useLiveQuery, eq } from '@tanstack/react-db'
import { orderCollection } from '~/lib/db/collections'

export function useOrders(businessId: string) {
  return useLiveQuery(
    (q) => q.from({ o: orderCollection }).where(({ o }) => eq(o.businessId, businessId)),
    [businessId]
  )
}

// use-order-items.ts
import { useLiveQuery, eq } from '@tanstack/react-db'
import { orderItemCollection } from '~/lib/db/collections'

export function useOrderItems(orderId: string) {
  return useLiveQuery(
    (q) => q.from({ i: orderItemCollection }).where(({ i }) => eq(i.orderId, orderId)),
    [orderId]
  )
}
```

### 2. Actualizar Componentes de Pedidos
**Archivos a revisar:**
- `app/components/orders/calculator-modal.tsx`
- `app/components/orders/draft-selector.tsx`
- `app/routes/_protected.pedidos.*.tsx`

**Cambios necesarios:**
- Reemplazar llamadas a `useOrders()` (TanStack Query) por `useOrders()` (TanStack DB)
- Reemplazar `useAddOrderItem()` mutation por `orderItemCollection.insert()`
- Reemplazar `useRemoveOrderItem()` mutation por `orderItemCollection.delete()`

### 3. Eliminar Código Legacy
**Archivos a eliminar:**
- `app/hooks/use-draft-order-form.ts` - Ya no se necesita con TanStack DB
- `app/stores/draft-order.store.ts` - Reemplazado por collections

### 4. Actualizar Imports Rotos
**Archivos con imports rotos:**
- `app/hooks/use-draft-order-form.ts` - Importa `~/lib/db/collections/orders` (eliminado)
- `app/stores/draft-order.store.ts` - Importa `~/lib/db/collections/orders` (eliminado)
- `app/routes/_protected.pedidos.nuevo.$draftId._index.tsx` - Importa collections/orders
- `app/routes/_protected.pedidos.nuevo.$draftId.tsx` - Importa collections/orders
- `app/routes/_protected.pedidos.nuevo.tsx` - Importa collections/orders

### 5. Probar Flujo Offline/Online
**Escenarios a probar:**
1. Crear orden en modo offline
2. Agregar items estando offline
3. Volver online y verificar sync automático
4. Verificar que UI se actualiza con live queries
5. Probar rollback en errores

## Checklist de Completitud

- [ ] Hooks useOrders y useOrderItems creados con useLiveQuery
- [ ] Componentes actualizados para usar collections directamente
- [ ] Código legacy eliminado
- [ ] Imports rotos arreglados
- [ ] Flujo offline/online probado
- [ ] Type checking pasa sin errores
- [ ] Ventas (sales) siguen funcionando (no se rompieron)

## Notas Importantes

- **Sales** se mantienen con items anidados (approach atómico) - NO cambiar
- **Orders** ahora usan items independientes (approach granular) - Nuevo patrón
- Las collections manejan offline automáticamente con ElectricSQL
- No necesitas `isOnline()` checks manuales
- No necesitas `pendingOperations` - ElectricSQL lo maneja

## Referencias

- `app/lib/db/collections/order.collection.ts`
- `app/lib/db/collections/order-item.collection.ts`
- `app/lib/db/collections/sale.collection.ts` (ejemplo de cómo NO hacer items)
