# Estado actual de Pedidos (pre-refactor)

> Fecha: 2026-03-09
> Alcance: flujo `Nuevo pedido` (`/pedidos/nuevo`) y borradores de pedidos
> Estado: inestable, requiere refactor de consolidacion

## Resumen ejecutivo

El flujo de creacion de pedidos esta en una migracion incompleta entre dos modelos de estado:

1. modelo anterior tipo store/selectores (`useDraftOrderStore((state) => ...)`)
2. modelo nuevo con hooks/colecciones locales (`useOrder`, `useOrderItems`, `createLocalOrder`)

Aunque se corrigieron errores criticos (UUID invalid en backend y API incorrecta `useInsert`), el sistema sigue con comportamiento inconsistente. El caso reportado sigue ocurriendo: al hacer click en "Nuevo" solo queda en `/pedidos/nuevo`.

## Lo confirmado en codigo

### 1) Entrada a nuevo pedido

- El FAB de pedidos apunta a `/pedidos/nuevo`: `packages/app/app/routes/_protected.pedidos._index.tsx:114`
- La ruta de entrada crea un borrador local y luego navega a `/pedidos/nuevo/:draftId`: `packages/app/app/routes/_protected.pedidos.nuevo.tsx:29`, `packages/app/app/routes/_protected.pedidos.nuevo.tsx:47`
- La jerarquia de rutas existe y esta generada en React Router types:
  - `packages/app/.react-router/types/app/routes/+types/_protected.pedidos.nuevo.ts:19`
  - `packages/app/.react-router/types/app/routes/+types/_protected.pedidos.nuevo.$draftId.ts:22`

### 2) Error original de TanStack DB hook API (ya identificado)

Se confirmo con referencias externas que `createCollection` usa metodos directos (`insert/update/delete`) y no hooks tipo `useInsert/useUpdate/useDelete`.

Impacto historico: el crash `ordersCollection.useInsert is not a function` fue una causa real.

### 3) Endurecimiento backend (ya aplicado)

- Se agrego validacion UUID en params `:id` en orders API: `packages/backend/src/api/orders.ts:6`, `packages/backend/src/api/orders.ts:53`
- Esto evita que "nuevo" llegue como UUID a query de orders.

### 4) Drift arquitectonico vigente (bloqueante)

- El "compat layer" actual exporta `useDraftOrderStore(draftId: string)`: `packages/app/app/stores/draft-order.store.ts:9`
- Pero varios componentes siguen usandolo como Zustand selector hook:
  - `packages/app/app/routes/_protected.pedidos.nuevo.$draftId.calculadora.tsx:33`
  - `packages/app/app/components/orders/calculator-modal.tsx:35`
- Esto es una incompatibilidad de API (firma de funcion vs patron selector), no un bug aislado.

### 5) Hook de formulario de borrador esta en modo stub

- `use-draft-order-form` devuelve handlers no-op y defaults inertes: `packages/app/app/hooks/use-draft-order-form.ts:36`
- El formulario `DraftOrderForm` depende de ese hook: `packages/app/app/components/orders/draft-order-form.tsx:59`

Consecuencia: el flujo puede verse "montado", pero no representa una implementacion funcional completa.

### 6) Persistencia local temporal (riesgo funcional)

- `orders` y `order-items` usan `Map` en memoria del modulo:
  - `packages/app/app/lib/db/collections/orders.ts:7`
  - `packages/app/app/lib/db/collections/order-items.ts:6`

Esto no es persistencia offline real; reinicio/refresh puede invalidar borradores segun ciclo de vida/carga.

## Por que siguen apareciendo bugs

No hay una sola causa; hay una combinacion:

1. migracion incompleta (store legacy + hooks nuevos mezclados)
2. componentes criticos aun acoplados al patron selector legacy
3. hook de formulario en estado temporal (stub)
4. almacenamiento transitorio en memoria para un caso que deberia ser offline-first

## Evidencia de desalineacion con documentacion y pruebas

- La especificacion de implementacion de pedidos asume un flujo estable de creacion: `docs/implement-orders-system-pedidos.md:442`
- Los tutoriales de usuario asumen que "Nuevo pedido" funciona de manera directa: `packages/app/public/tutorials/05-pedidos/01-crear-pedido.md:25`
- E2E navega por `/pedidos/nuevo` (`packages/app/e2e/page-objects/NewOrderPage.ts:19`), pero el flujo actual depende de redireccion inmediata a `/:draftId` con estado interno inconsistente.

## Recomendacion: refactor, no mas parches puntuales

### Objetivo

Consolidar el flujo de borrador en una sola arquitectura coherente y verificable.

### Fronteras minimas del refactor

1. **Fuente unica de verdad para borradores**
   - Eliminar el compat layer ambiguo (`draft-order.store.ts`) o convertirlo en wrapper 100% compatible (una sola forma de uso).

2. **Hook de formulario real (sin stubs)**
   - Reescribir `use-draft-order-form.ts` para operar sobre una fuente real de datos.

3. **Persistencia offline real**
   - Reemplazar `Map` en memoria por persistencia local acorde al stack del proyecto (IndexedDB/sync layer existente).

4. **Rutas y calculadora consistentes con `draftId`**
   - Eliminar rutas/handlers legacy que usan `/pedidos/nuevo/calculadora` sin `draftId`.

5. **Alinear E2E y docs al flujo final**
   - Ajustar page objects y casos para el flujo definitivo.

## Plan sugerido de ejecucion (secuencial)

1. Congelar API publica de draft state (decidir firma unica de hooks/store)
2. Migrar calculadora + draft form a esa API
3. Implementar persistencia local real
4. Revalidar rutas `nuevo -> nuevo/:draftId -> calculadora`
5. Actualizar E2E y tutoriales

## Criterios de salida del refactor

- Click en "Nuevo pedido" siempre termina en `/pedidos/nuevo/:draftId`
- No hay componentes usando `useDraftOrderStore((state) => ...)` si la firma final no es selector
- `use-draft-order-form` sin handlers no-op
- Borrador sobrevive refresh (persistencia local)
- E2E de pedidos estable para create/edit/add-item/save

## Nota de estado actual

Este documento resume por que, aun despues de fixes puntuales, el modulo sigue con bugs: la causa principal es estructural (drift de arquitectura durante migracion), no solo errores de linea.
