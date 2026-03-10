---
description: Analiza flujo de ventas y muestra plan de refactorización
argument-hint: <flujo>
---

Analiza el flujo de ventas de Avileo y genera un plan de refactorización con TanStack DB.

**NO ejecutes nada. Solo analiza y muestra el plan.**

## Proyecto

**Stack:** React 19 + React Router v7 + ElectricSQL + PostgreSQL + Drizzle

## Errores a Evitar

- `update(id, { ... })` → `(draft) => { draft.x = y }`
- `where(x === y)` → `eq(x, y)`
- txid fuera de transacción
- mutations grandes con todo anidado

## Patrón Atomic

```typescript
saleCollection.insert({ id, clientId, totalAmount: 0 })
saleItemCollection.insert({ id, saleId, productId, quantity: 2 })
saleCollection.update(saleId, (d) => { d.totalAmount = nuevoTotal })
```

## Referencias

- `tanstack-db/SKILL.md`
- `tanstack-db/QUICK_START.md`

## Archivos a Revisar

- `app/hooks/use-sales.ts`
- `app/stores/sale.store.ts`
- `app/components/sales/*.tsx`
- `app/routes/*ventas*`
- `app/routes/*pedidos*`
- `app/lib/db/collections.ts`
- `app/lib/db/schema.ts`
