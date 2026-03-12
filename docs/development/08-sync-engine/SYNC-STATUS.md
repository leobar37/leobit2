# Estado de Sincronización - TanStack DB

> Documento de seguimiento del estado de sincronización de colecciones
> Última actualización: 2026-03-11

## Resumen

Este documento rastrea el estado de implementación de `awaitMatch` en las colecciones de TanStack DB para prevenir condiciones de carrera.

## Patrón de Sincronización

```typescript
// ✅ CORRECTO: Siempre usar awaitMatch después de llamada API
onInsert: async ({ transaction, collection }) => {
  const newItem = transaction.mutations[0].modified;
  
  // 1. Llamar API
  const response = await api.entity.post(payload);
  
  // 2. Esperar confirmación de Electric
  try {
    await collection.utils.awaitMatch(
      matchInsert(newItem.id) as any,
      AWAIT_MATCH_TIMEOUT
    );
  } catch (error) {
    console.warn("awaitMatch timeout:", newItem.id);
  }
  
  return { txid };
}
```

## Estado de Colecciones

| Colección | onInsert | onUpdate | onDelete | Estado |
|-----------|----------|----------|----------|--------|
| `sale` | ✅ | ✅ | ✅ | ✅ Completo |
| `sale-item` | ✅ | ✅ | - | ✅ Completo |
| `customer` | ✅ | ✅ | ✅ | ✅ Completo |
| `payment` | ✅ | ✅ | ✅ | ✅ Completo |
| `distribucion` | ✅ | ✅ | ✅ | ✅ Completo |
| `purchase` | ✅ | ✅ | ✅ | ✅ Completo |
| `supplier` | ✅ | ✅ | ✅ | ✅ Completo |
| `asset` | N/A | N/A | ✅ | ✅ Completo |
| `file` | N/A | N/A | ✅ | ✅ Completo |
| `product` | N/A | N/A | N/A | ✅ Solo lectura |

## Problemas Conocidos

### Pendientes de Alta Prioridad

- Ninguno - ¡Todas las colecciones están completas!

### Resueltos

- ✅ 2026-03-11: Corregido error silenciado en distribucion.collection.ts (líneas 81-84)

## Cambios Realizados

### 2026-03-11

- ✅ Corregido bug de ventas: onInsert ahora sincroniza inmediatamente
- ✅ Corregido bug de ventas: onUpdate usa PATCH en vez de POST
- ✅ Corregido error LIMIT sin ORDER BY en use-distribuciones.ts
- ✅ Corregido error LIMIT sin ORDER BY en use-accounts-receivable.ts
- ✅ Agregado awaitMatch a sale.collection.ts (todos los casos)
- ✅ Agregado awaitMatch a customer.collection.ts
- ✅ Agregado awaitMatch a payment.collection.ts
- ✅ Agregado awaitMatch a sale-item.collection.ts
- ✅ Agregado awaitMatch a distribucion.collection.ts
- ✅ Agregado awaitMatch a purchase.collection.ts
- ✅ Agregado awaitMatch a supplier.collection.ts
- ✅ Agregado awaitMatch a asset.collection.ts
- ✅ Agregado awaitMatch a file.collection.ts
- ✅ Corregido error silenciado en distribucion.collection.ts
- ✅ Creado match-utils.ts para helpers de awaitMatch
- ✅ Actualizada skill tanstack-db con patrones aprendidos
- ✅ Creado documento SYNC-STATUS.md

## Referencias

- [Sync Patterns](./references/SYNC_PATTERNS.md) - Patrones de sincronización
- [TanStack DB Docs](https://tanstack.com/db/latest/docs/collections/electric-collection)
