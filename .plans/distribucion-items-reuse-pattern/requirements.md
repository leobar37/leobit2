# Requisitos: Items en Distribuciones (Reutilizando Patrón Ventas/Compras)

## Objetivo
Implementar la gestión de items en distribuciones reutilizando el patrón arquitectónico ya establecido en ventas (SaleService) y compras (PurchaseService).

## Requisitos Funcionales

### FR-001: Tabla de Items
Como desarrollador, quiero una tabla `distribucion_items` que almacene los productos asignados a una distribución.

**Criterios:**
- Debe seguir el mismo esquema que `sale_items` y `purchase_items`
- Campos: id, business_id, distribucion_id, variant_id, cantidadAsignada, cantidadVendida, unidad
- Soporte para sync_status y sync_attempts
- Relación con distribuciones (onDelete: cascade)

### FR-002: Crear Distribución con Items
Como admin, quiero poder crear una distribución opcionalmente con productos asignados.

**Criterios:**
- El campo `items` es opcional en la creación
- Si se proporcionan items, se crean junto con la distribución (transacción atómica)
- Mismo patrón que `createWithItems` en SaleService

### FR-003: Agregar Items a Distribución Activa
Como admin o vendedor, quiero poder agregar productos a una distribución ya creada.

**Criterios:**
- Solo distribuciones en estado "activo" o "en_ruta" pueden modificarse
- No se permite agregar items a distribuciones cerradas
- Validar que el variant_id exista

### FR-004: Actualizar Items
Como vendedor, quiero poder actualizar las cantidades asignadas de los productos.

**Criterios:**
- Permitir modificar cantidadAsignada
- Actualizar cantidadVendida automáticamente basado en ventas reales
- Mantener historial de cambios a través de sync operations

### FR-005: Eliminar Items
Como admin, quiero poder eliminar productos de una distribución antes de que cierre.

**Criterios:**
- Solo permitido en distribuciones activas
- Validar que no haya ventas asociadas a ese item (o manejar apropiadamente)

### FR-006: Consultar Distribución con Items
Como usuario, quiero ver los productos asignados cuando consulto una distribución.

**Criterios:**
- Endpoint que retorne distribución + items con joins a productos/variantes
- Enriquecer con nombres de producto/variante para mostrar en UI

## Requisitos No Funcionales

### NFR-001: Reutilización de Patrones
El código debe seguir exactamente el mismo patrón que SaleService y PurchaseService:
- Extender BaseService
- Usar transacciones PGlite
- Sync operations agrupados por syncGroupId
- Mismo estilo de hooks con TanStack Query

### NFR-002: Atomicidad
Todas las operaciones que modifiquen items deben ser atómicas (transacciones).

### NFR-003: Offline-First
Las operaciones deben funcionar offline y sincronizar cuando haya conexión.

### NFR-004: Consistencia de Tipos
Usar los mismos tipos y convenciones que sales y purchases:
- Cantidades como string (decimal)
- Mapeo camelCase con funciones existentes
- Tipos exportados para uso en hooks
