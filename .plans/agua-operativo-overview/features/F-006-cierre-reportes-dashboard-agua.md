# F-006 Cierre Reportes Dashboard Agua

## Objective

Hacer que el cierre, dashboard y reportes de agua muestren métricas operativas reales: bidones vendidos/entregados, paradas pendientes/completadas, recaudación total y desglose efectivo/Yape/Plin/transferencia por repartidor/ruta.

## Scope Boundaries

- In scope: dashboard agua, cierre de distribución/ruta, reportes básicos de ventas/recaudación, labels Perú.
- Out of scope: crear ventas, sync/offline, reportes contables avanzados, facturación.

## Verified Context

- `packages/app/app/routes/_protected.dashboard.tsx` reconoce `isWaterMode` pero reutiliza métricas generales como `salesStats.current.kilos`.
- `packages/backend/src/services/business/report.service.ts` actualmente calcula métricas desde ventas generales y `netWeight`.
- `packages/app/app/routes/_protected.mi-distribucion.tsx` muestra breakdown contado/crédito general, no específico de agua full-payment.
- Distribuciones ya tienen estado de cierre y monto recaudado en servicios existentes.

## Assumptions

- Después de `F-005`, las entregas de agua generan ventas reales y pueden agregarse por ruta/repartidor.
- Agua debe mostrar deuda/cobranza pendiente solo si existe deuda histórica, no como flujo normal.
- Completed dependency output from `F-005`: delivered water stops now create active contado/pago_total sales, sale items for selected variant, payment method, visit saleId, and inventory deduction; no_atendido/reprogramado do not create sales.

## Unknowns

- Resuelto durante ejecución: primera versión agrega desglose por método de pago desde ventas reales; no se implementó conciliación manual adicional.

## Likely Files or Areas Involved

- `packages/app/app/routes/_protected.dashboard.tsx` - Modify - Cards/métricas agua.
- `packages/app/app/routes/_protected.mi-distribucion.tsx` - Modify - Cierre/recaudación por ruta.
- `packages/app/app/routes/_protected.reportes._index.tsx` - Review | Modify - Reporte agua.
- `packages/backend/src/services/business/report.service.ts` - Modify | Create adjacent service - Agregados agua.
- `packages/backend/src/api/reports.ts` - Review | Modify - Endpoint si aplica.
- `packages/backend/src/services/business/distribucion.service.ts` - Review | Modify - Cierre y montos.

## Feature Dependencies

- Depends on: `F-005`
- Blocks: `F-008`

## Human-Owned Tracking Fields

- Status: done
- Owner: unassigned
- Decision Notes: F-006 agregó `/reports/water-operational` con agregados reales desde water stops, visitas, sale items, sales, rutas, repartidores y `paymentMethod`. Dashboard, mi distribución y reportes ahora muestran recaudación, bidones, paradas completadas/pendientes y breakdown por método para agua, preservando métricas existentes de pollería/cochera. Builds app/backend y test focalizado de report service pasaron.
- Manual Overrides: none

## Parallelization Notes

- Parallelizable: yes
- Reason: Puede avanzar junto con `F-007` después de estabilizar la entrega transaccional.

## Worktree Recommendation

- Recommended: yes
- Suggested branch: `feature/agua-operativo-reportes`
- Suggested worktree path: `../wt-agua-operativo-reportes`

## Suggested `/plan` Mode

- Mode: `structured`
- Rationale: Abarca backend aggregates y varias pantallas frontend.

## Suggested Next Command

- `/plan .plans/agua-operativo-overview/features/F-006-cierre-reportes-dashboard-agua.md`
