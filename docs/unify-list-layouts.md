# Unificar Layouts de Listas en Avileo

## Objective

Estandarizar todas las pantallas de listado (clientes, ventas, productos, compras, cobros, distribuciones) para que usen un layout visual consistente siguiendo el patrón documentado en `mobile-list-pattern.md`. Eliminar inconsistencias entre cards (`MinimalCard` vs `shell-card-flat`), tablas HTML vs listas de cards, y estilos de búsqueda/FAB.

## Current State

- **Done:** Análisis completo de inconsistencias entre todas las rutas de listado. Documentado el patrón correcto en `mobile-list-pattern.md`.
- **Remaining:** 
  - Crear componentes base reutilizables para listas
  - Migrar 6 rutas inconsistentes al patrón estándar
  - Reemplazar `MinimalCard` con `shell-card-flat` en CustomerCard
  - Convertir tabla HTML de distribuciones a cards
- **In progress / partial:** Ninguno
- **Blockers or constraints:**
  - Preservar funcionalidad existente (checkboxes en clientes, acciones en distribuciones)
  - Mantener accesibilidad y estados de carga/vacío
  - No romper comportamiento offline-first

## Decisions Already Made

- **Usar `shell-card-flat`** como base para todas las cards operativas - rechazado `MinimalCard` para listas principales porque tiene estilos diferentes (bordes grises más finos, sin sombra)
- **Radio estándar: `rounded-[24px]`** para cards de lista - rechazados `rounded-[20px]` y `rounded-md`
- **Estructura patrón:** Búsqueda (h-12, rounded-[20px], pl-11) → Lista (space-y-3) → FAB fijo (bottom-28) - simplificará distribuciones que ahora tiene filtros complejos arriba
- **Cards individuales por entidad** en lugar de tablas HTML para mobile - distribuciones migrará de tabla a cards
- **Preservar `MinimalCard`** solo para casos especiales donde se necesite variantes como `selectable` - pero no para listas principales

## Affected Files / Artifacts

- `packages/app/app/routes/_protected.clientes._index.tsx` - review next - Referencia del patrón correcto (no cambiar, solo usar como guía)
- `packages/app/app/routes/_protected.ventas._index.tsx` - review next - Referencia del patrón correcto (no cambiar)
- `packages/app/app/routes/_protected.productos._index.tsx` - review next - Referencia del patrón correcto (no cambiar)
- `packages/app/app/components/list/entity-list.tsx` - create - Layout base reutilizable: search + list + empty/loading + FAB
- `packages/app/app/components/list/list-card.tsx` - create - Card estandarizada con icono, título, metadata, acciones
- `packages/app/app/components/list/index.ts` - create - Barrel exports
- `packages/app/app/routes/_protected.compras._index.tsx` - probable impact - Mover PurchaseCard inline a componente separado y usar ListCard
- `packages/app/app/components/compras/purchase-card.tsx` - create - Extraer PurchaseCard de la ruta
- `packages/app/app/routes/_protected.cobros._index.tsx` - probable impact - Reemplazar MinimalCard con ListCard estándar
- `packages/app/app/components/distribucion/distribucion-card.tsx` - create - Nueva card para distribuciones
- `packages/app/app/routes/_protected.distribuciones.tsx` - probable impact - Reemplazar tabla HTML con lista de cards, simplificar layout
- `packages/app/app/components/customers/customer-card.tsx` - probable impact - Migrar de MinimalCard a Card con shell-card-flat

## Execution Plan

1. **Crear componentes base en `components/list/`**
   - `entity-list.tsx`: Componente que reciba `items`, `renderItem`, `onSearch`, `searchFields`, `emptyState`, `fabAction`, `title`
   - `list-card.tsx`: Card estandarizada con props para icono, título, metadata, badges, acciones secundarias
   - `index.ts`: Exports limpios

2. **Migrar Compras**
   - Crear `components/compras/purchase-card.tsx` extrayendo el componente inline
   - Actualizar `_protected.compras._index.tsx` para usar EntityList + ListCard
   - Preservar badges de estado (Pendiente/Recibido/Cancelado) y formato de moneda

3. **Migrar Cobros**
   - Actualizar `_protected.cobros._index.tsx`
   - Reemplazar MinimalCard por ListCard en DebtorCard
   - Mantener resumen superior con borde rojo y estadísticas
   - Preservar botón "Cobrar" en cada card

4. **Migrar Distribuciones**
   - Crear `components/distribucion/distribucion-card.tsx` con: vendedor, punto de venta, kg asignados/vendidos, estado, acciones (editar/cerrar/eliminar)
   - Actualizar `_protected.distribuciones.tsx`: reemplazar DistribucionTable por lista de DistribucionCard
   - Mantener selector de fecha y resumen del día, pero simplificar layout

5. **Actualizar CustomerCard**
   - Migrar `components/customers/customer-card.tsx` de MinimalCard a Card con `shell-card-flat`
   - Preservar funcionalidad de selección (checkboxes) y tags
   - Mantener colores de selección (fondo naranja cuando está seleccionado)

## Validation

- **Automated:** 
  - `bun run typecheck` en packages/app - debe pasar sin errores
  - `bun run build` en packages/app - build debe completarse exitosamente
- **Manual (por ruta):**
  - `/clientes` - verificar que sigue funcionando (checkboxes, búsqueda, FAB)
  - `/ventas` - verificar cards de ventas, estadísticas superiores, FAB
  - `/productos` - verificar cards de productos, búsqueda, FAB
  - `/compras` - verificar que PurchaseCard usa mismo estilo que SaleCard, búsqueda funciona
  - `/cobros` - verificar cards de deudores con mismo estilo, resumen superior preservado
  - `/distribuciones` - verificar que ahora muestra cards en lugar de tabla, acciones funcionan
- **Acceptance:**
  - Todas las listas usan cards con `shell-card-flat` y `rounded-[24px]`
  - Búsqueda consistente: h-12, rounded-[20px], icono Search a la izquierda
  - FAB consistente: bottom-28, h-14 w-14, rounded-full, bg-orange-500
  - No quedan tablas HTML en rutas mobile principales
  - No quedan MinimalCard en listas operativas principales

## Open Questions / Assumptions

- **Asumido:** Las acciones en distribuciones (editar/cerrar/eliminar) pueden mostrarse como botones inline en la card sin menú desplegable - hay espacio suficiente en mobile
- **Asumido:** El resumen superior en distribuciones se mantendrá como cards separadas simplificadas, no integrado en un bloque único
- **Asumido:** No se requiere paginación en ninguna de estas listas (actualmente no la tienen)

## Immediate Next Action

Crear los componentes base en `packages/app/app/components/list/`: `entity-list.tsx` y `list-card.tsx` con la estructura estándar del patrón mobile-list-pattern.md.

---

Resume by continuing from the execution plan above. Do not re-analyze already settled decisions unless new evidence appears.
