# Implementar Sistema de Cancelación Configurable para Ventas

## Objective

Implementar un sistema de cancelación de ventas con tres modos: Simple (solo motivo), Completa (reversa todo automáticamente), y Personalizada (usuario elige qué reversar). El sistema debe reversar abonos automáticamente, restaurar inventario, y permitir reembolso manual.

## Current State

- **Done**: Análisis completo del flujo actual de cancelación, identificación de brechas
- **Remaining**:
  - Frontend: Actualizar dialog, provider, hook y service para soportar modos
  - Backend: Actualizar sale.service.ts para lógica completa
- **In progress**: Ninguno - plan aprobado esperando implementación
- **Blockers**: Ninguno

## Decisions Already Made

- **Modo Simple**: Solo ingresa motivo, no reviersa nada - para ventas draft o sin pagos
- **Modo Completa**: Reversa todos los abonos automáticamente, restaura inventario, resetea amountPaid = 0
- **Modo Personalizada**: Usuario elige qué reversar mediante checkboxes
- **No hay reactivación**: Una venta cancelada no se puede volver a activar
- **Reversar solo abonos**: Solo se reversan pagos con `relatedSaleId`, no pagos iniciales

## Affected Files / Artifacts

- `packages/app/app/components/sales/cancel-sale-dialog.tsx` - changed - Agregar radio buttons para modo de cancelación
- `packages/app/app/components/sales/cancel-sale-provider.tsx` - changed - Agregar lógica de construcción de payload según modo
- `packages/app/app/hooks/use-sales.ts` - changed - Agregar campos al hook useCancelSale
- `packages/app/app/lib/services/sale-service.ts` - changed - Actualizar método cancel() para enviar nuevos campos
- `packages/backend/src/services/business/sale.service.ts` - changed - Actualizar cancelSale() con lógica de reversión automática
- `packages/backend/src/services/repository/payment.repository.ts` - review next - Necesario para findBySaleId() en reversión

## Execution Plan

1. **Frontend - Modificar cancel-sale-provider.tsx**:
   - Agregar `cancelMode` al schema: "simple" | "complete" | "custom"
   - Agregar `reverseAbones` y `restoreInventory` al schema
   - Actualizar `submit()` para construir payload según modo

2. **Frontend - Modificar cancel-sale-dialog.tsx**:
   - Agregar RadioGroup para seleccionar modo
   - Si modo "complete": mostrar resumen de acciones
   - Si modo "custom": mostrar checkboxes para reverseAbones y restoreInventory

3. **Frontend - Modificar use-sales.ts**:
   - Agregar campos al tipo CancelSaleInput
   - Actualizar useCancelSale para enviar todos los campos

4. **Frontend - Modificar sale-service.ts**:
   - Actualizar método cancel() para aceptar refundAmount, refundMethod, refundReference, cancelMode, reverseAbones, restoreInventory

5. **Backend - Modificar sale.service.ts cancelSale()**:
   - Agregar parámetros: cancelMode, reverseAbones, restoreInventory
   - Si cancelMode === "complete" o (custom && reverseAbones):
     - Llamar paymentRepository.findBySaleId() para obtener abonos
     - Para cada abono, crear reversión automática
     - Resetear amountPaid = "0"
   - Si cancelMode === "complete" o (custom && restoreInventory):
     - Ejecutar lógica de restauración de inventario (ya existe)

## Validation

- **Automated**: Verificar que build pase (`bun run build` en packages/app y packages/backend)
- **Manual**:
  - Crear venta, agregar abonos, abrir dialog de cancelación
  - Probar modo "simple": verificar que no se reversen abonos
  - Probar modo "completa": verificar que se reversen todos los abonos y se restaure inventario
  - Probar modo "personalizada": verificar que solo se revierse lo seleccionado

## Open Questions / Assumptions

- Ninguna - todas las decisiones de negocio fueron aprobadas por el usuario

## Immediate Next Action

Iniciar con **Paso 1**: Modificar `cancel-sale-provider.tsx` para agregar el campo `cancelMode` al schema y actualizar la lógica del payload según el modo seleccionado.
